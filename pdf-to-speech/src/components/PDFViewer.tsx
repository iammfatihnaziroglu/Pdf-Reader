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
  const [pageInput, setPageInput] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Array<{page: number, sentence: string, index: number}>>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState<number>(-1);
  const [isSearching, setIsSearching] = useState(false);
  
  // PDF yüklenmiş mi kontrolü
  const isPDFLoaded = state.pagesText && state.pagesText.length > 0 && totalPages > 0;
  
  // Sol sayfa için metin (mevcut sayfa)
  const leftPageText = isPDFLoaded ? (state.pagesText[currentPage - 1] || '') : '';
  const leftPageSentences = leftPageText ? (leftPageText.match(/[^.!?]+[.!?]+/g) || [leftPageText]) : [];
  
  // Sağ sayfa için metin (bir sonraki sayfa)
  const rightPageText = isPDFLoaded ? (state.pagesText[currentPage] || '') : '';
  const rightPageSentences = rightPageText ? (rightPageText.match(/[^.!?]+[.!?]+/g) || [rightPageText]) : [];

  // Kelime arama fonksiyonu
  const performSearch = (term: string) => {
    if (!term.trim() || !isPDFLoaded) {
      setSearchResults([]);
      setCurrentSearchIndex(-1);
      return;
    }

    const results: Array<{page: number, sentence: string, index: number}> = [];
    const searchRegex = new RegExp(term.trim(), 'gi');

    state.pagesText.forEach((pageText, pageIndex) => {
      const sentences = pageText.match(/[^.!?]+[.!?]+/g) || [pageText];
      sentences.forEach((sentence, sentenceIndex) => {
        if (searchRegex.test(sentence)) {
          results.push({
            page: pageIndex + 1,
            sentence: sentence.trim(),
            index: sentenceIndex
          });
        }
      });
    });

    setSearchResults(results);
    setCurrentSearchIndex(results.length > 0 ? 0 : -1);
    
    // İlk sonuca git
    if (results.length > 0) {
      goToSearchResult(0, results);
    }
  };

  // Arama sonucuna git
  const goToSearchResult = (index: number, results = searchResults) => {
    if (index >= 0 && index < results.length) {
      const result = results[index];
      const displayPage = result.page % 2 === 0 ? result.page - 1 : result.page;
      
      dispatch({ type: 'SET_PAGE', payload: { current: displayPage, total: totalPages } });
      dispatch({ type: 'SET_TEXT', payload: state.pagesText[result.page - 1] || '' });
      dispatch({ type: 'SET_SENTENCE', payload: result.sentence });
      setCurrentSearchIndex(index);
    }
  };

  // Önceki/sonraki arama sonucu
  const goToPrevSearchResult = () => {
    if (searchResults.length > 0) {
      const newIndex = currentSearchIndex > 0 ? currentSearchIndex - 1 : searchResults.length - 1;
      goToSearchResult(newIndex);
    }
  };

  const goToNextSearchResult = () => {
    if (searchResults.length > 0) {
      const newIndex = currentSearchIndex < searchResults.length - 1 ? currentSearchIndex + 1 : 0;
      goToSearchResult(newIndex);
    }
  };

  // Arama inputu değişikliği
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (value.trim()) {
      setIsSearching(true);
      // Debounce search
      const timeoutId = setTimeout(() => {
        performSearch(value);
        setIsSearching(false);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
      setCurrentSearchIndex(-1);
      setIsSearching(false);
    }
  };

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
      if (pageIndex === 1 && currentPage + 1 < totalPages) {
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

  const goToPage = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages && state.pagesText) {
      // Çift sayfa görünümü için sol sayfayı hesapla
      const displayPage = pageNumber % 2 === 0 ? pageNumber - 1 : pageNumber;
      dispatch({ type: 'SET_PAGE', payload: { current: displayPage, total: totalPages } });
      
      // Seçilen sayfa metnini göster
      const pageText = state.pagesText[pageNumber - 1] || '';
      dispatch({ type: 'SET_TEXT', payload: pageText });
      dispatch({ type: 'SET_SENTENCE', payload: '' });
    }
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(pageInput);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      goToPage(pageNum);
      setPageInput('');
    }
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPageInput(value);
  };

  const renderSentences = (sentences: string[], pageIndex: number) => {
    return sentences.map((sentence, index) => {
      const trimmedSentence = sentence.trim();
      const isCurrentSentence = trimmedSentence === currentSentence;
      const isHovered = trimmedSentence === hoveredSentence;
      const isSearchHighlight = searchTerm && trimmedSentence.toLowerCase().includes(searchTerm.toLowerCase());

      return (
        <span
          key={index}
          className={`sentence ${isCurrentSentence ? 'current' : ''} ${isHovered ? 'hovered' : ''} ${isSearchHighlight ? 'search-highlight' : ''}`}
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
    <div className={`container ${isPDFLoaded ? 'pdf-loaded' : ''}`}>
      <h1>Akıllı PDF Okuyucu</h1>
      
      {/* Gelişmiş Navigasyon Paneli */}
      {isPDFLoaded && (
        <div className="advanced-navigation-panel">
          <div className="navigation-header">
            <div className="nav-title">
              <span className="nav-icon">🧭</span>
              <span>Navigasyon & Arama</span>
            </div>
            <div className="page-counter">
              Sayfa {currentPage} / {totalPages}
            </div>
          </div>

          <div className="navigation-content">
            {/* Kelime Arama */}
            <div className="search-section">
              <div className="search-container-advanced">
                <div className="search-input-wrapper">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    placeholder="PDF içinde kelime ara..."
                    className="search-input-advanced"
                  />
                  {isSearching && <div className="search-loading">⏳</div>}
                </div>
                
                {searchResults.length > 0 && (
                  <div className="search-results-info">
                    <span className="results-count">
                      {searchResults.length} sonuç bulundu
                    </span>
                    <div className="search-navigation">
                      <button 
                        className="search-nav-btn"
                        onClick={goToPrevSearchResult}
                        title="Önceki sonuç"
                      >
                        ↑
                      </button>
                      <span className="search-position">
                        {currentSearchIndex + 1} / {searchResults.length}
                      </span>
                      <button 
                        className="search-nav-btn"
                        onClick={goToNextSearchResult}
                        title="Sonraki sonuç"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sayfa Navigasyonu */}
            <div className="page-navigation-section">
              <div className="page-controls">
                <form onSubmit={handlePageInputSubmit} className="page-input-container">
                  <label className="page-input-label">Sayfa:</label>
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={pageInput}
                    onChange={handlePageInputChange}
                    placeholder={currentPage.toString()}
                    className="page-input-advanced"
                  />
                </form>

                <div className="quick-navigation">
                  <button 
                    className="quick-nav-btn" 
                    onClick={() => goToPage(1)}
                    disabled={currentPage === 1}
                    title="İlk sayfa"
                  >
                    ⏮️ İlk
                  </button>
                  <button 
                    className="quick-nav-btn" 
                    onClick={() => goToPage(totalPages)}
                    disabled={currentPage === totalPages}
                    title="Son sayfa"
                  >
                    Son ⏭️
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="book-container">
        <div className={`book ${isPageTransitioning ? 'page-transitioning' : ''}`}>
          <div className="book-cover">
            <div className="book-spine"></div>
            <div className="book-pages">
              {/* Sol Sayfa - Mevcut Sayfa */}
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
                    : (!isPDFLoaded ? renderPlaceholder(true) : null)
                  }
                </div>
              </div>

              {/* Sağ Sayfa - Bir Sonraki Sayfa */}
              <div className={`book-page right-page ${isPageTransitioning ? 'transitioning' : ''}`}>
                {isPDFLoaded && currentPage < totalPages && (
                  <div className="page-header">
                    <div className="page-number">
                      <span className="page-number-text">{currentPage + 1}</span>
                    </div>
                  </div>
                )}
                <div className="text-content">
                  {isPDFLoaded && rightPageSentences.length > 0 
                    ? renderSentences(rightPageSentences, 1) 
                    : (!isPDFLoaded ? renderPlaceholder(false) : null)
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