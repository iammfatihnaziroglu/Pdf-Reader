import { usePDF } from '../context/PDFContext';
import { useState, useEffect } from 'react';

interface PDFViewerProps {
  currentPage: number;
  totalPages: number;
  currentSentence: string;
}

export function PDFViewer({ currentPage, totalPages, currentSentence }: PDFViewerProps) {
  const { state, dispatch } = usePDF();
  const [hoveredSentence, setHoveredSentence] = useState<string>('');
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
  
  // PDF yüklenmiş mi kontrolü
  const isPDFLoaded = state.pagesText && state.pagesText.length > 0 && totalPages > 0;
  
  // Sol sayfa için metin (tek numaralı sayfalar)
  const leftPageText = isPDFLoaded ? (state.pagesText[currentPage - 1] || '') : '';
  const leftPageSentences = leftPageText ? (leftPageText.match(/[^.!?]+[.!?]+/g) || [leftPageText]) : [];
  
  // Sağ sayfa için metin (çift numaralı sayfalar)
  const rightPageText = isPDFLoaded ? (state.pagesText[currentPage] || '') : '';
  const rightPageSentences = rightPageText ? (rightPageText.match(/[^.!?]+[.!?]+/g) || [rightPageText]) : [];

  // Sayfa geçiş efekti
  useEffect(() => {
    if (isPDFLoaded) {
      setIsPageTransitioning(true);
      const timer = setTimeout(() => {
        setIsPageTransitioning(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentPage, isPDFLoaded]);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      const newPage = Math.max(1, currentPage - 2);
      setIsPageTransitioning(true);
      dispatch({ type: 'SET_PAGE', payload: { current: newPage, total: totalPages } });
      dispatch({ type: 'SET_TEXT', payload: state.pagesText[newPage - 1] || '' });
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      const newPage = Math.min(totalPages, currentPage + 2);
      setIsPageTransitioning(true);
      dispatch({ type: 'SET_PAGE', payload: { current: newPage, total: totalPages } });
      dispatch({ type: 'SET_TEXT', payload: state.pagesText[newPage - 1] || '' });
    }
  };

  const handleSentenceClick = (sentence: string, pageIndex: number) => {
    console.log('Cümle tıklandı:', sentence);
    console.log('Sayfa indeksi:', pageIndex);
    
    const currentPageText = pageIndex === 0 ? leftPageText : rightPageText;
    const sentences = currentPageText.match(/[^.!?]+[.!?]+/g) || [currentPageText];
    const clickedIndex = sentences.findIndex(s => s.trim() === sentence.trim());
    
    if (clickedIndex !== -1) {
      let remainingText = sentences.slice(clickedIndex).join(' ');
      
      // Eğer sağ sayfada tıklandıysa ve sonraki sayfalar varsa, onları da ekle
      if (pageIndex === 1 && currentPage < totalPages) {
        for (let i = currentPage + 1; i < state.pagesText.length; i++) {
          const nextPageText = state.pagesText[i] || '';
          remainingText += ' ' + nextPageText;
        }
      } else if (pageIndex === 0) {
        // Sol sayfada tıklandıysa, sağ sayfayı ve sonraki sayfaları ekle
        if (rightPageText) {
          remainingText += ' ' + rightPageText;
        }
        for (let i = currentPage + 1; i < state.pagesText.length; i++) {
          const nextPageText = state.pagesText[i] || '';
          remainingText += ' ' + nextPageText;
        }
      }

      window.speechSynthesis.cancel();
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

  const renderPlaceholder = (isLeftPage: boolean) => {
    return (
      <div className="book-placeholder">
        <div className="book-placeholder-content">
          <h2 className="book-placeholder-title">
            {isLeftPage ? 'PDF Yükleyin' : 'Sesli Okuma'}
          </h2>
          <div className="book-placeholder-text-container">
            <p className="book-placeholder-text">
              {isLeftPage 
                ? 'PDF dosyanızı yükleyerek içeriğini sesli olarak dinleyebilirsiniz.'
                : 'İstediğiniz cümleye tıklayarak okumayı başlatabilir veya baştan dinleyebilirsiniz.'}
            </p>
          </div>
        </div>
        {!isLeftPage && (
          <div className="book-placeholder-contact">
            <p className="book-placeholder-credit">M.Fatih</p>
            <div className="book-placeholder-links">
              <a href="https://linkedin.com/in/iammfatihnaziroglu" target="_blank" rel="noopener noreferrer" className="book-placeholder-link">
                LinkedIn
              </a>
              <a href="mailto:m.fatihnaziroglu@gmail.com" className="book-placeholder-link">
                İletişim
              </a>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container">
      <h1>Akıllı PDF Okuyucu</h1>
      <div className="book-container">
        <div className={`book ${isPageTransitioning ? 'page-transitioning' : ''}`}>
          <div className="book-cover">
            <div className="book-spine"></div>
            <div className="book-pages">
              {/* Sol Sayfa */}
              <div className={`book-page left-page ${isPageTransitioning ? 'transitioning' : ''}`}>
                {isPDFLoaded && (
                  <div className="page-header">
                    <div className="page-number">
                      <span className="current-page">{currentPage}</span>
                    </div>
                  </div>
                )}
                <div className="text-content">
                  {isPDFLoaded && leftPageSentences.length > 0 
                    ? renderSentences(leftPageSentences, 0) 
                    : renderPlaceholder(true)
                  }
                </div>
              </div>

              {/* Sağ Sayfa */}
              <div className={`book-page right-page ${isPageTransitioning ? 'transitioning' : ''}`}>
                {isPDFLoaded && (
                  <div className="page-header">
                    <div className="page-number">
                      <span className="current-page">{currentPage + 1}</span>
                    </div>
                  </div>
                )}
                <div className="text-content">
                  {isPDFLoaded && rightPageSentences.length > 0 
                    ? renderSentences(rightPageSentences, 1) 
                    : renderPlaceholder(false)
                  }
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sayfa Geçiş Butonları - Sadece PDF yüklendiyse göster */}
        {isPDFLoaded && (
          <div className="page-navigation">
            <button 
              className="nav-button prev" 
              onClick={handlePrevPage}
              disabled={currentPage <= 1 || isPageTransitioning}
            >
              ← Önceki
            </button>
            <div className="page-info">
              Sayfa {currentPage} / {totalPages}
            </div>
            <button 
              className="nav-button next" 
              onClick={handleNextPage}
              disabled={currentPage >= totalPages || isPageTransitioning}
            >
              Sonraki →
            </button>
          </div>
        )}

        {/* İlerleme Çubuğu - Sadece PDF yüklendiyse göster */}
        {isPDFLoaded && (
          <div className="book-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${(currentPage / totalPages) * 100}%` }}
              ></div>
            </div>
            <div className="progress-text">
              Sayfa {currentPage} / {totalPages}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 