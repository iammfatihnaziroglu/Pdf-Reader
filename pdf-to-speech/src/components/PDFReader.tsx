import { useEffect, useRef } from 'react';
import { usePDF } from '../context/PDFContext';
import { PDFUploader } from './PDFUploader';
import { VoiceSelector } from './VoiceSelector';
import { Controls } from './Controls';
import { PDFViewer } from './PDFViewer';

interface PDFDocument {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PDFPage>;
  getMetadata?: () => Promise<{
    info?: {
      Title?: string;
      Author?: string;
      Subject?: string;
    };
  }>;
}

interface PDFPage {
  getTextContent: () => Promise<{
    items: Array<{ str: string }>;
  }>;
}

interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontName: string;
}

interface DocumentStructure {
  title: string;
  author: string;
  subject: string;
  chapters: Array<{
    title: string;
    page: number;
    level: number;
    content: string;
  }>;
  tableOfContents: Array<{
    title: string;
    page: number;
    level: number;
  }>;
  metadata: {
    totalPages: number;
    hasTableOfContents: boolean;
    language: string;
    documentType: string;
  };
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
  const currentReadingPageRef = useRef(1);

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

      // Gelişmiş PDF analizi ve metin çıkarma
      const pagesText: string[] = [];
      const documentStructure = {
        title: '',
        author: '',
        subject: '',
        chapters: [] as Array<{
          title: string;
          page: number;
          level: number;
          content: string;
        }>,
        tableOfContents: [] as Array<{
          title: string;
          page: number;
          level: number;
        }>,
        metadata: {
          totalPages: pdf.numPages,
          hasTableOfContents: false,
          language: 'tr',
          documentType: 'unknown'
        }
      };

      // PDF metadata'sını al
      try {
        if (pdf.getMetadata) {
          const metadata = await pdf.getMetadata();
          if (metadata.info) {
            documentStructure.title = metadata.info.Title || '';
            documentStructure.author = metadata.info.Author || '';
            documentStructure.subject = metadata.info.Subject || '';
          }
        }
      } catch (error) {
        console.log('Metadata alınamadı:', error);
      }

      // Tüm sayfa metinlerini analiz et
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Metin öğelerini pozisyon ve boyut bilgileriyle birlikte al
        const textItems = textContent.items.map((item: unknown) => {
          const pdfItem = item as {
            str: string;
            transform: number[];
            width: number;
            height: number;
            fontName?: string;
          };
          return {
            str: pdfItem.str,
            x: pdfItem.transform[4],
            y: pdfItem.transform[5],
            width: pdfItem.width,
            height: pdfItem.height,
            fontSize: pdfItem.transform[0],
            fontName: pdfItem.fontName || ''
          };
        });

        // Sayfa metnini oluştur
        const pageText = textItems.map(item => item.str).join(' ').replace(/\s+/g, ' ').trim();
        pagesText.push(pageText);

        // Başlık ve yapı analizi
        analyzePageStructure(textItems, i, documentStructure);
      }

      // Doküman tipini tespit et
      detectDocumentType(documentStructure, pagesText);

      // İçindekiler sayfasını tespit et
      detectTableOfContents(documentStructure, pagesText);

      // Bölümleri optimize et
      optimizeChapters(documentStructure, pagesText);

      // Sonuçları dispatch et
      dispatch({ type: 'SET_PAGES_TEXT', payload: pagesText });
      dispatch({ type: 'SET_DOCUMENT_STRUCTURE', payload: documentStructure });
      
      // İlk sayfa metnini göster
      dispatch({ type: 'SET_TEXT', payload: pagesText[0] || '' });
      dispatch({ type: 'SET_PAGE', payload: { current: 1, total: pdf.numPages } });
      dispatch({ type: 'SET_SENTENCE', payload: '' });
      currentReadingPageRef.current = 1;

      // Kullanıcıya doküman hakkında bilgi ver
      showDocumentInfo(documentStructure);

    } catch (error) {
      console.error('PDF yükleme hatası:', error);
      alert('PDF yüklenirken bir hata oluştu.');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Sayfa yapısını analiz et
  const analyzePageStructure = (textItems: TextItem[], pageNumber: number, structure: DocumentStructure) => {
    const lines = groupTextIntoLines(textItems);
    
    lines.forEach((line) => {
      const text = line.map(item => item.str).join(' ').trim();
      if (text.length < 3) return;

      // Başlık tespiti - font boyutu, pozisyon ve içerik analizi
      const avgFontSize = line.reduce((sum, item) => sum + item.fontSize, 0) / line.length;
      const isLargeFont = avgFontSize > 14;
      const isCentered = isTextCentered(line);
      const isUpperCase = text === text.toUpperCase() && text.length > 3;
      const hasNumbers = /^\d+[.)]\s*/.test(text);
      
      // Başlık kalıpları
      const headingPatterns = [
        /^(BÖLÜM|CHAPTER|BAB|KONU|DERS|UNIT)\s*\d+/i,
        /^(\d+[.)]\s*)(.*)/,
        /^([A-ZÜĞŞÇÖI\s]{5,})$/,
        /^(\d+\.\d+[.\s]*)(.*)/,
        /^(GİRİŞ|INTRODUCTION|ÖZET|ABSTRACT|SONUÇ|CONCLUSION|KAYNAKLAR|REFERENCES)/i
      ];

      let headingLevel = 0;
      let isHeading = false;

      // Başlık seviyesini belirle
      if (isLargeFont && (isCentered || isUpperCase)) {
        headingLevel = 1;
        isHeading = true;
      } else if (hasNumbers && avgFontSize > 12) {
        headingLevel = 2;
        isHeading = true;
      } else if (headingPatterns.some(pattern => pattern.test(text))) {
        headingLevel = text.match(/^\d+\.\d+/) ? 3 : 2;
        isHeading = true;
      }

      if (isHeading) {
        structure.chapters.push({
          title: text,
          page: pageNumber,
          level: headingLevel,
          content: ''
        });
      }
    });
  };

  // Metni satırlara grupla
  const groupTextIntoLines = (textItems: TextItem[]) => {
    const lines: TextItem[][] = [];
    const sortedItems = textItems.sort((a, b) => b.y - a.y || a.x - b.x);
    
    let currentLine: TextItem[] = [];
    let currentY = -1;
    const yTolerance = 5;

    sortedItems.forEach(item => {
      if (currentY === -1 || Math.abs(item.y - currentY) <= yTolerance) {
        currentLine.push(item);
        currentY = item.y;
      } else {
        if (currentLine.length > 0) {
          lines.push(currentLine.sort((a, b) => a.x - b.x));
        }
        currentLine = [item];
        currentY = item.y;
      }
    });

    if (currentLine.length > 0) {
      lines.push(currentLine.sort((a, b) => a.x - b.x));
    }

    return lines;
  };

  // Metnin ortalanmış olup olmadığını kontrol et
  const isTextCentered = (line: TextItem[]) => {
    if (line.length === 0) return false;
    const leftMost = Math.min(...line.map(item => item.x));
    const rightMost = Math.max(...line.map(item => item.x + item.width));
    const center = (leftMost + rightMost) / 2;
    // Sayfa genişliğinin ortasına yakın mı?
    return Math.abs(center - 300) < 100; // Yaklaşık sayfa ortası
  };

  // Doküman tipini tespit et
  const detectDocumentType = (structure: DocumentStructure, pagesText: string[]) => {
    const fullText = pagesText.join(' ').toLowerCase();
    
    if (fullText.includes('makale') || fullText.includes('article') || fullText.includes('journal')) {
      structure.metadata.documentType = 'academic_article';
    } else if (fullText.includes('kitap') || fullText.includes('book') || structure.chapters.length > 5) {
      structure.metadata.documentType = 'book';
    } else if (fullText.includes('rapor') || fullText.includes('report')) {
      structure.metadata.documentType = 'report';
    } else if (fullText.includes('tez') || fullText.includes('thesis')) {
      structure.metadata.documentType = 'thesis';
    } else if (fullText.includes('sunum') || fullText.includes('presentation')) {
      structure.metadata.documentType = 'presentation';
    } else {
      structure.metadata.documentType = 'document';
    }

    // Dil tespiti
    const turkishWords = ['ve', 'bir', 'bu', 'için', 'ile', 'olan', 'olarak', 'da', 'de'];
    const englishWords = ['the', 'and', 'of', 'to', 'in', 'is', 'that', 'for', 'with'];
    
    const turkishCount = turkishWords.reduce((count, word) => 
      count + (fullText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
    const englishCount = englishWords.reduce((count, word) => 
      count + (fullText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
    
    structure.metadata.language = turkishCount > englishCount ? 'tr' : 'en';
  };

  // İçindekiler sayfasını tespit et
  const detectTableOfContents = (structure: DocumentStructure, pagesText: string[]) => {
    pagesText.forEach((pageText) => {
      const lowerText = pageText.toLowerCase();
      
      if (lowerText.includes('içindekiler') || lowerText.includes('contents') || 
          lowerText.includes('table of contents') || lowerText.includes('index')) {
        
        structure.metadata.hasTableOfContents = true;
        
        // İçindekiler öğelerini çıkar
        const lines = pageText.split('\n');
        const tocPatterns = [
          /^(.+?)\s*[.·-]{3,}\s*(\d+)\s*$/,
          /^(\d+(?:\.\d+)*\.?\s+.+?)\s*[.·-]{2,}\s*(\d+)\s*$/,
          /^(.+?)\s{5,}(\d+)\s*$/
        ];

        lines.forEach(line => {
          tocPatterns.forEach(pattern => {
            const match = line.trim().match(pattern);
            if (match && match[1].trim().length > 2) {
              const title = match[1].trim();
              const pageNum = parseInt(match[2]);
              
              let level = 0;
              if (title.match(/^\d+\.\d+\.\d+/)) level = 3;
              else if (title.match(/^\d+\.\d+/)) level = 2;
              else if (title.match(/^\d+\./)) level = 1;
              
              structure.tableOfContents.push({
                title,
                page: pageNum,
                level
              });
            }
          });
        });
      }
    });
  };

  // Bölümleri optimize et
  const optimizeChapters = (structure: DocumentStructure, pagesText: string[]) => {
    // Bölümleri sayfa sırasına göre sırala
    structure.chapters.sort((a, b) => a.page - b.page);
    
    // Her bölüm için içerik ekle
    structure.chapters.forEach((chapter, index) => {
      const startPage = chapter.page - 1;
      const endPage = index < structure.chapters.length - 1 ? 
        structure.chapters[index + 1].page - 2 : pagesText.length - 1;
      
      let content = '';
      for (let i = startPage; i <= endPage && i < pagesText.length; i++) {
        content += pagesText[i] + ' ';
      }
      chapter.content = content.trim();
    });

    // Çok kısa bölümleri birleştir
    structure.chapters = structure.chapters.filter((chapter) => 
      chapter.content.length > 100 || chapter.level === 1);
  };

  // Kullanıcıya doküman bilgisi göster
  const showDocumentInfo = (structure: DocumentStructure) => {
    const info = [];
    
    if (structure.title) info.push(`📖 Başlık: ${structure.title}`);
    if (structure.author) info.push(`👤 Yazar: ${structure.author}`);
    
    const typeNames: Record<string, string> = {
      'academic_article': 'Akademik Makale',
      'book': 'Kitap',
      'report': 'Rapor',
      'thesis': 'Tez',
      'presentation': 'Sunum',
      'document': 'Doküman'
    };
    
    info.push(`📄 Tip: ${typeNames[structure.metadata.documentType] || 'Doküman'}`);
    info.push(`📊 Sayfa: ${structure.metadata.totalPages}`);
    info.push(`🗂️ Bölüm: ${structure.chapters.length}`);
    
    if (structure.metadata.hasTableOfContents) {
      info.push(`📋 İçindekiler: Mevcut`);
    }

    // Bilgiyi konsola yazdır (geliştirme için)
    console.log('📚 PDF Analiz Sonucu:', {
      structure,
      info: info.join('\n')
    });

    // Kullanıcıya kısa bilgi göster
    if (structure.title || structure.chapters.length > 0) {
      const message = `PDF başarıyla analiz edildi!\n\n${info.slice(0, 3).join('\n')}`;
      // Toast notification yerine console log kullanıyoruz
      console.log(message);
    }
  };

  // Cümlenin hangi sayfada olduğunu bul
  const findSentencePage = (sentence: string): number => {
    if (!state.pagesText) return currentReadingPageRef.current;
    
    for (let i = 0; i < state.pagesText.length; i++) {
      if (state.pagesText[i].includes(sentence.trim())) {
        return i + 1; // Sayfa numarası 1'den başlar
      }
    }
    return currentReadingPageRef.current;
  };

  // Kullanıcının gördüğü sayfayı güncelle
  const updateDisplayPage = (readingPage: number) => {
    // Eğer okuma sayfası kullanıcının gördüğü sayfadan farklıysa güncelle
    if (readingPage !== state.currentPage && readingPage !== state.currentPage + 1) {
      // Çift sayfa görünümü için sol sayfayı göster
      const displayPage = readingPage % 2 === 0 ? readingPage - 1 : readingPage;
      console.log(`Sayfa güncelleniyor: ${state.currentPage} -> ${displayPage} (okuma sayfası: ${readingPage})`);
      dispatch({ type: 'SET_PAGE', payload: { current: displayPage, total: state.totalPages } });
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
        if (currentReadingPageRef.current < state.totalPages) {
          console.log('Sonraki sayfaya geçiliyor');
          
          // Sonraki sayfaya geç
          const nextPage = currentReadingPageRef.current + 1;
          currentReadingPageRef.current = nextPage;
          
          // Kullanıcının gördüğü sayfayı güncelle
          updateDisplayPage(nextPage);
          
          // Sonraki sayfa metnini yükle ve okumaya devam et
          if (state.pagesText && state.pagesText[nextPage - 1]) {
            const nextPageText = state.pagesText[nextPage - 1];
            const nextSentences = nextPageText.match(/[^.!?]+[.!?]+/g) || [nextPageText];
            
            // Yeni sayfa cümlelerini ayarla
            sentences.length = 0;
            sentences.push(...nextSentences);
            currentSentenceIndex = 0;
            
            // Okumaya devam et
            setTimeout(speakNextSentence, 200);
          } else {
            stopSpeaking();
          }
        } else {
          console.log('Son sayfa, okuma durduruluyor');
          stopSpeaking();
        }
        return;
      }

      const sentence = sentences[currentSentenceIndex].trim();
      console.log('Okunacak cümle:', sentence);

      // Cümlenin hangi sayfada olduğunu tespit et ve kullanıcının gördüğü sayfayı güncelle
      const sentencePage = findSentencePage(sentence);
      if (sentencePage !== currentReadingPageRef.current) {
        currentReadingPageRef.current = sentencePage;
        updateDisplayPage(sentencePage);
      }

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
    <div className="container" style={{marginTop: '50px'}}>
      <h1>Sesli PDF Okuyucu</h1>
      
      <PDFUploader onFileSelect={handleFile} isLoading={state.isLoading} />
      
      {/* Ses Seçici ve Kontroller - Sadece PDF yüklendiyse göster */}
      {state.pagesText && state.pagesText.length > 0 && (
        <>
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
        </>
      )}

      <PDFViewer 
        currentPage={state.currentPage}
        totalPages={state.totalPages}
        currentSentence={state.currentSentence}
      />

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-text">
            <span className="footer-main">Developed by M.Fatih</span>
          </div>
          <div className="footer-links">
            <a 
              href="https://linkedin.com/in/iammfatihnaziroglu" 
              target="_blank" 
              rel="noopener noreferrer"
              className="footer-link"
              title="LinkedIn Profile"
            >
              LinkedIn
            </a>
            <span className="footer-separator">•</span>
            <a 
              href="mailto:m.fatihnaziroglu@gmail.com" 
              className="footer-link"
              title="Send Email"
            >
              İletişim
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
} 