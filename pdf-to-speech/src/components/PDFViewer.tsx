import { usePDF } from '../context/PDFContext';
import { useState } from 'react';

interface PDFViewerProps {
  currentText: string;
  currentPage: number;
  totalPages: number;
  currentSentence: string;
}

export function PDFViewer({ currentPage, totalPages, currentSentence }: PDFViewerProps) {
  const { state, dispatch } = usePDF();
  const [hoveredSentence, setHoveredSentence] = useState<string>('');
  
  // Sol sayfa için metin (tek numaralı sayfalar)
  const leftPageText = state.pagesText[currentPage - 1] || '';
  const leftPageSentences = leftPageText.match(/[^.!?]+[.!?]+/g) || [leftPageText];
  
  // Sağ sayfa için metin (çift numaralı sayfalar)
  const rightPageText = state.pagesText[currentPage] || '';
  const rightPageSentences = rightPageText.match(/[^.!?]+[.!?]+/g) || [rightPageText];

  const handlePrevPage = () => {
    if (currentPage > 1) {
      dispatch({ type: 'SET_PAGE', payload: { current: currentPage - 1, total: totalPages } });
      dispatch({ type: 'SET_TEXT', payload: state.pagesText[currentPage - 2] || '' });
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      dispatch({ type: 'SET_PAGE', payload: { current: currentPage + 1, total: totalPages } });
      dispatch({ type: 'SET_TEXT', payload: state.pagesText[currentPage] || '' });
    }
  };

  const handleSentenceClick = (sentence: string, pageIndex: number) => {
    console.log('Cümle tıklandı:', sentence);
    console.log('Sayfa indeksi:', pageIndex);
    
    // Tıklanan cümleden itibaren yeni metin oluştur
    const currentPageText = pageIndex === 0 ? leftPageText : rightPageText;
    const sentences = currentPageText.match(/[^.!?]+[.!?]+/g) || [currentPageText];
    const clickedIndex = sentences.findIndex(s => s.trim() === sentence.trim());
    
    console.log('Tıklanan cümle indeksi:', clickedIndex);
    console.log('Mevcut sayfa metni:', currentPageText);
    
    if (clickedIndex !== -1) {
      // Tıklanan cümleden itibaren kalan metni birleştir
      let remainingText = sentences.slice(clickedIndex).join(' ');
      
      // Eğer sağ sayfadaysa ve sonraki sayfa varsa, o sayfanın metnini de ekle
      if (pageIndex === 1 && currentPage < totalPages) {
        const nextPageText = state.pagesText[currentPage + 1] || '';
        const nextPageSentences = nextPageText.match(/[^.!?]+[.!?]+/g) || [nextPageText];
        remainingText += ' ' + nextPageSentences.join(' ');
        console.log('Sonraki sayfa metni eklendi:', nextPageText);
      }

      console.log('Okunacak metin:', remainingText);

      // Önce mevcut okumayı durdur
      window.speechSynthesis.cancel();

      // Metni güncelle ve okumayı başlat
      dispatch({ type: 'SET_TEXT', payload: remainingText });
      dispatch({ type: 'SET_SENTENCE', payload: sentence.trim() });
      dispatch({ type: 'SET_PLAYING', payload: true });
      dispatch({ type: 'SET_PAUSED', payload: false });
    }
  };

  const renderSentences = (sentences: string[], pageIndex: number) => {
    return sentences.map((sentence, index) => {
      const trimmedSentence = sentence.trim();
      const isCurrentSentence = trimmedSentence === currentSentence;
      const isHovered = trimmedSentence === hoveredSentence;

      return (
        <span
          key={index}
          className={`sentence ${isCurrentSentence ? 'current' : ''} ${isHovered ? 'hovered' : ''}`}
          onMouseEnter={() => setHoveredSentence(trimmedSentence)}
          onMouseLeave={() => setHoveredSentence('')}
          onClick={() => handleSentenceClick(trimmedSentence, pageIndex)}
          title="Okumaya başlamak için tıklayın"
        >
          {trimmedSentence}
          {index < sentences.length - 1 ? '. ' : ''}
        </span>
      );
    });
  };

  return (
    <div className="book-container">
      <div className="book">
        <div className="book-cover">
          <div className="book-spine"></div>
          <div className="book-pages">
            {/* Sol Sayfa */}
            <div className="book-page left-page">
              <div className="page-header">
                <div className="page-number">
                  <span className="current-page">{currentPage}</span>
                </div>
              </div>
              <div className="text-content">
                {renderSentences(leftPageSentences, 0)}
              </div>
            </div>

            {/* Sağ Sayfa */}
            <div className="book-page right-page">
              <div className="page-header">
                <div className="page-number">
                  <span className="current-page">{currentPage + 1}</span>
                </div>
              </div>
              <div className="text-content">
                {renderSentences(rightPageSentences, 1)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sayfa Geçiş Butonları */}
      <div className="page-navigation">
        <button 
          className="nav-button prev" 
          onClick={handlePrevPage}
          disabled={currentPage <= 1}
        >
          ← Önceki
        </button>
        <div className="page-info">
          Sayfa {currentPage} / {totalPages}
        </div>
        <button 
          className="nav-button next" 
          onClick={handleNextPage}
          disabled={currentPage >= totalPages}
        >
          Sonraki →
        </button>
      </div>

      <div className="book-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${(currentPage / totalPages) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
} 