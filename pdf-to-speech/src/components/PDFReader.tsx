import { useEffect, useRef } from 'react';
import { usePDF } from '../context/PDFContext';
import { PDFUploader } from './PDFUploader';
import { VoiceSelector } from './VoiceSelector';
import { Controls } from './Controls';
import { PDFViewer } from './PDFViewer';

interface PDFDocument {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PDFPage>;
}

interface PDFPage {
  getTextContent: () => Promise<{
    items: Array<{ str: string }>;
  }>;
}

declare global {
  interface Window {
    pdfjsLib: {
      GlobalWorkerOptions: {
        workerSrc: string;
      };
      getDocument: (options: { data: ArrayBuffer }) => {
        promise: Promise<PDFDocument>;
      };
    };
  }
}

export function PDFReader() {
  const { state, dispatch } = usePDF();
  const pdfRef = useRef<PDFDocument | null>(null);
  const isReadingRef = useRef(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.async = true;
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    };
    document.body.appendChild(script);

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      dispatch({ type: 'SET_VOICES', payload: availableVoices });
      const turkishVoice = availableVoices.find(voice => voice.lang.startsWith('tr'));
      if (turkishVoice) {
        dispatch({ type: 'SET_SELECTED_VOICE', payload: turkishVoice.name });
      }
    };

    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    loadVoices();

    return () => {
      document.body.removeChild(script);
      stopSpeaking();
    };
  }, [dispatch]);

  const handleFile = async (file: File) => {
    if (!file || file.type !== 'application/pdf') return;

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      pdfRef.current = pdf;
      dispatch({ type: 'SET_PAGE', payload: { current: 1, total: pdf.numPages } });

      // Tüm sayfa metinlerini oku
      const pagesText: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ').replace(/\s+/g, ' ').trim();
        pagesText.push(pageText);
      }
      dispatch({ type: 'SET_PAGES_TEXT', payload: pagesText });
      // İlk sayfa metnini göster
      dispatch({ type: 'SET_TEXT', payload: pagesText[0] || '' });
      dispatch({ type: 'SET_PAGE', payload: { current: 1, total: pdf.numPages } });
      dispatch({ type: 'SET_SENTENCE', payload: '' });
    } catch (error) {
      console.error('PDF yükleme hatası:', error);
      alert('PDF yüklenirken bir hata oluştu.');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const loadPage = async (pageNumber: number) => {
    if (!pdfRef.current) return;
    const pagesText = state.pagesText;
    if (pagesText && pagesText[pageNumber - 1]) {
      dispatch({ type: 'SET_TEXT', payload: pagesText[pageNumber - 1] });
      dispatch({ type: 'SET_PAGE', payload: { current: pageNumber, total: state.totalPages } });
      dispatch({ type: 'SET_SENTENCE', payload: '' });
    } else {
      // Eski yöntemle yükle (güvenlik için)
      try {
        const page = await pdfRef.current.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ').replace(/\s+/g, ' ').trim();
        dispatch({ type: 'SET_TEXT', payload: pageText });
        dispatch({ type: 'SET_PAGE', payload: { current: pageNumber, total: state.totalPages } });
        dispatch({ type: 'SET_SENTENCE', payload: '' });
      } catch (error) {
        console.error('Sayfa yükleme hatası:', error);
      }
    }
  };

  const speakText = () => {
    console.log('speakText başladı', {
      currentText: state.currentText,
      selectedVoice: state.selectedVoice,
      isPlaying: state.isPlaying,
      isPaused: state.isPaused
    });

    if (!state.currentText) {
      console.log('speakText erken çıkış - metin yok');
      return;
    }

    // Eğer duraklatılmışsa ve mevcut bir okuma varsa, devam et
    if (state.isPaused && window.speechSynthesis.speaking) {
      console.log('Duraklatılmış okumaya devam ediliyor');
      window.speechSynthesis.resume();
      dispatch({ type: 'SET_PAUSED', payload: false });
      return;
    }

    const sentences = state.currentText.match(/[^.!?]+[.!?]+/g) || [state.currentText];
    console.log('Cümleler:', sentences);

    let currentSentenceIndex = 0;
    isReadingRef.current = true;

    const speakNextSentence = () => {
      if (!isReadingRef.current) {
        console.log('Okuma durduruldu');
        return;
      }

      if (currentSentenceIndex >= sentences.length) {
        console.log('Tüm cümleler okundu');
        if (state.currentPage < state.totalPages) {
          console.log('Sonraki sayfaya geçiliyor');
          loadPage(state.currentPage + 1);
        } else {
          console.log('Son sayfa, okuma durduruluyor');
          stopSpeaking();
        }
        return;
      }

      const sentence = sentences[currentSentenceIndex].trim();
      console.log('Okunacak cümle:', sentence);

      const utterance = new SpeechSynthesisUtterance(sentence);
      
      // Seçili sesi kullan
      const selectedVoice = state.voices.find(v => v.name === state.selectedVoice);
      console.log('Seçili ses:', selectedVoice);
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
      } else {
        // Türkçe sesi dene
        const turkishVoice = state.voices.find(v => v.lang.startsWith('tr'));
        if (turkishVoice) {
          utterance.voice = turkishVoice;
          utterance.lang = turkishVoice.lang;
        } else {
          utterance.lang = 'tr-TR';
        }
      }

      utterance.rate = 0.8;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        console.log('Cümle okuma başladı');
        dispatch({ type: 'SET_SENTENCE', payload: sentence });
      };

      utterance.onend = () => {
        console.log('Cümle okuma bitti');
        if (isReadingRef.current) {
          currentSentenceIndex++;
          setTimeout(speakNextSentence, 100);
        } else {
          dispatch({ type: 'SET_SENTENCE', payload: '' });
        }
      };

      utterance.onpause = () => {
        console.log('Cümle duraklatıldı');
      };

      utterance.onresume = () => {
        console.log('Cümle devam ediyor');
      };

      console.log('Sesli okuma başlatılıyor');
      window.speechSynthesis.speak(utterance);
    };

    dispatch({ type: 'SET_PLAYING', payload: true });
    dispatch({ type: 'SET_PAUSED', payload: false });
    speakNextSentence();
  };

  const pauseSpeaking = () => {
    console.log('Duraklatılıyor');
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      isReadingRef.current = false;
      dispatch({ type: 'SET_PAUSED', payload: true });
    }
  };

  const resumeSpeaking = () => {
    console.log('Devam ediliyor');
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      isReadingRef.current = true;
      dispatch({ type: 'SET_PAUSED', payload: false });
    } else {
      speakText();
    }
  };

  const stopSpeaking = () => {
    console.log('Durduruluyor');
    window.speechSynthesis.cancel();
    isReadingRef.current = false;
    dispatch({ type: 'SET_PLAYING', payload: false });
    dispatch({ type: 'SET_PAUSED', payload: false });
    dispatch({ type: 'SET_SENTENCE', payload: '' });
  };

  return (
    <div className="container">
      <h1>PDF Sesli Okuyucu</h1>
      
      <PDFUploader onFileSelect={handleFile} isLoading={state.isLoading} />
      
      <VoiceSelector 
        voices={state.voices}
        selectedVoice={state.selectedVoice}
        onVoiceChange={(voice) => dispatch({ type: 'SET_SELECTED_VOICE', payload: voice })}
      />

      <Controls 
        isPlaying={state.isPlaying}
        isPaused={state.isPaused}
        onPlay={state.isPaused ? resumeSpeaking : speakText}
        onPause={pauseSpeaking}
        onStop={stopSpeaking}
        disabled={!state.currentText}
      />

      <PDFViewer 
        currentText={state.currentText}
        currentPage={state.currentPage}
        totalPages={state.totalPages}
        currentSentence={state.currentSentence}
      />
    </div>
  );
} 