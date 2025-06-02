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
  const [tableOfContents, setTableOfContents] = useState<Array<{title: string, page: number}>>([]);
  const [showTOC, setShowTOC] = useState(false);
  
  // PDF yüklenmiş mi kontrolü
  const isPDFLoaded = state.pagesText && state.pagesText.length > 0 && totalPages > 0;
  
  // Sol sayfa için metin (mevcut sayfa)
  const leftPageText = isPDFLoaded ? (state.pagesText[currentPage - 1] || '') : '';
  const leftPageSentences = leftPageText ? (leftPageText.match(/[^.!?]+[.!?]+/g) || [leftPageText]) : [];
  
  // Sağ sayfa için metin (bir sonraki sayfa)
  const rightPageText = isPDFLoaded ? (state.pagesText[currentPage] || '') : '';
  const rightPageSentences = rightPageText ? (rightPageText.match(/[^.!?]+[.!?]+/g) || [rightPageText]) : [];

  // Türkçe karakter normalizasyonu
  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Gelişmiş kelime arama fonksiyonu
  const performSearch = (term: string) => {
    if (!term.trim() || !isPDFLoaded) {
      setSearchResults([]);
      setCurrentSearchIndex(-1);
      return;
    }

    const results: Array<{page: number, sentence: string, index: number}> = [];
    const normalizedSearchTerm = normalizeText(term.trim());

    state.pagesText.forEach((pageText, pageIndex) => {
      const sentences = pageText.match(/[^.!?]+[.!?]+/g) || [pageText];
      sentences.forEach((sentence, sentenceIndex) => {
        const normalizedSentence = normalizeText(sentence);
        
        // Hem normalize edilmiş hem de orijinal metinde ara
        if (normalizedSentence.includes(normalizedSearchTerm) || 
            sentence.toLowerCase().includes(term.toLowerCase())) {
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

  // İçindekiler tespiti
  const detectTableOfContents = () => {
    if (!isPDFLoaded) return;

    const toc: Array<{title: string, page: number}> = [];
    const tocPatterns = [
      // Türkçe başlık kalıpları
      /^(BÖLÜM|CHAPTER|BAB|KONU|DERS|UNIT)\s*\d+[:.-\s]*(.*)/i,
      /^(\d+[.)]\s*)(.*)/,
      /^([A-ZÜĞŞÇÖI]{2,}.*)/,
      // Numaralı başlıklar
      /^(\d+\.\d+[.\s]*)(.*)/,
      /^(\d+\.\s*)(.*)/,
      // İçindekiler sayfası tespiti
      /^(.*?)\s*\.{3,}\s*(\d+)$/,
      /^(.*?)\s*-{2,}\s*(\d+)$/,
      // Büyük harfli başlıklar
      /^([A-ZÜĞŞÇÖI\s]{5,})$/
    ];

    state.pagesText.forEach((pageText, pageIndex) => {
      const lines = pageText.split('\n').filter(line => line.trim().length > 0);
      
      lines.forEach(line => {
        const trimmedLine = line.trim();
        
        // İçindekiler sayfası kontrolü
        if (trimmedLine.toLowerCase().includes('içindekiler') || 
            trimmedLine.toLowerCase().includes('contents') ||
            trimmedLine.toLowerCase().includes('index')) {
          return;
        }

        tocPatterns.forEach(pattern => {
          const match = trimmedLine.match(pattern);
          if (match && trimmedLine.length < 100) {
            let title = '';
            let pageNum = pageIndex + 1;

            if (pattern.source.includes('\\d+)$')) {
              // Sayfa numarası olan kalıp
              title = match[1];
              pageNum = parseInt(match[2]) || pageIndex + 1;
            } else {
              // Diğer kalıplar
              title = match[2] || match[1] || trimmedLine;
            }

            if (title && title.length > 2 && title.length < 80) {
              toc.push({
                title: title.trim(),
                page: pageNum
              });
            }
          }
        });
      });
    });

    // Tekrarları temizle ve sırala
    const uniqueTOC = toc.filter((item, index, self) => 
      index === self.findIndex(t => t.title === item.title)
    ).sort((a, b) => a.page - b.page);

    setTableOfContents(uniqueTOC);
  };

  // PDF yüklendiğinde içindekiler tespiti yap
  useEffect(() => {
    if (isPDFLoaded) {
      detectTableOfContents();
    }
  }, [isPDFLoaded, state.pagesText]);

  // Metin formatlaması - Kitap formatında
  const formatPageText = (text: string) => {
    if (!text) return [];

    // Satırları ayır ve temizle
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const formattedContent: Array<{text: string, type: string, level?: number, pageNum?: string, title?: string}> = [];
    
    let currentParagraph = '';
    let isInTableOfContents = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // İçindekiler başlığı tespiti
      if (line.toLowerCase().includes('içindekiler') || 
          line.toLowerCase().includes('contents') ||
          line.toLowerCase().includes('table of contents') ||
          line.toLowerCase().includes('index')) {
        if (currentParagraph) {
          formattedContent.push({text: currentParagraph.trim(), type: 'paragraph'});
          currentParagraph = '';
        }
        formattedContent.push({text: line, type: 'toc-title'});
        isInTableOfContents = true;
        continue;
      }
      
      // İçindekiler bölümündeyken özel işlem
      if (isInTableOfContents) {
        // İçindekiler satırı tespiti - çeşitli formatlar
        const tocPatterns = [
          // Noktalı çizgili format: "Başlık ........ 123"
          /^(.+?)\s*[.·-]{3,}\s*(\d+)\s*$/,
          // Ok işaretli format: "Başlık ---> 123" veya "Başlık → 123"
          /^(.+?)\s*[-=]{2,}>\s*(\d+)\s*$/,
          /^(.+?)\s*[→➜➤]\s*(\d+)\s*$/,
          // Tab veya boşluklu format: "Başlık        123"
          /^(.+?)\s{5,}(\d+)\s*$/,
          // Numaralı başlık format: "1. Başlık .... 123" veya "1.1 Başlık .... 123"
          /^(\d+(?:\.\d+)*\.?\s+.+?)\s*[.·-]{2,}\s*(\d+)\s*$/,
          // Basit format: "Başlık 123"
          /^(.+?)\s+(\d{1,3})\s*$/
        ];

        let tocMatch = false;
        for (const pattern of tocPatterns) {
          const match = line.match(pattern);
          if (match && match[1].trim().length > 2 && match[1].trim().length < 100) {
            if (currentParagraph) {
              formattedContent.push({text: currentParagraph.trim(), type: 'paragraph'});
              currentParagraph = '';
            }
            
            const title = match[1].trim();
            const pageNum = match[2];
            
            // Seviye tespiti
            let level = 0;
            if (title.match(/^\d+\.\d+\.\d+/)) level = 3;
            else if (title.match(/^\d+\.\d+/)) level = 2;
            else if (title.match(/^\d+\./)) level = 1;
            
            formattedContent.push({
              text: line,
              type: 'toc-item',
              level: level,
              title: title,
              pageNum: pageNum
            });
            tocMatch = true;
            break;
          }
        }
        
        if (tocMatch) continue;
        
        // İçindekiler bölümü sonu tespiti
        if (line.match(/^(BÖLÜM|CHAPTER|BAB|\d+\.)/i) || 
            line.length > 100 ||
            (i > 0 && lines[i-1].trim() === '' && line.match(/^[A-ZÜĞŞÇÖI]/))) {
          isInTableOfContents = false;
        }
      }
      
      // Normal içerik işleme
      if (!isInTableOfContents) {
        // Numaralı başlık tespiti (1., 1.1, 1.1.1 gibi)
        if (/^\d+(\.\d+)*\.?\s+/.test(line)) {
          if (currentParagraph) {
            formattedContent.push({text: currentParagraph.trim(), type: 'paragraph'});
            currentParagraph = '';
          }
          const level = (line.match(/\./g) || []).length;
          formattedContent.push({text: line, type: 'numbered-heading', level});
          continue;
        }
        
        // Büyük harfli başlık tespiti
        if (/^[A-ZÜĞŞÇÖI\s]{5,}$/.test(line) && line.length < 50) {
          if (currentParagraph) {
            formattedContent.push({text: currentParagraph.trim(), type: 'paragraph'});
            currentParagraph = '';
          }
          formattedContent.push({text: line, type: 'main-heading'});
          continue;
        }
        
        // Bölüm başlığı tespiti
        if (/^(BÖLÜM|CHAPTER|BAB|KONU|DERS|UNIT)\s*\d+/i.test(line)) {
          if (currentParagraph) {
            formattedContent.push({text: currentParagraph.trim(), type: 'paragraph'});
            currentParagraph = '';
          }
          formattedContent.push({text: line, type: 'chapter-heading'});
          continue;
        }
        
        // Liste öğesi tespiti
        if (/^[-*•]\s+/.test(line) || /^\d+[.)]\s+/.test(line)) {
          if (currentParagraph) {
            formattedContent.push({text: currentParagraph.trim(), type: 'paragraph'});
            currentParagraph = '';
          }
          formattedContent.push({text: line, type: 'list-item'});
          continue;
        }
      }
      
      // Normal paragraf biriktirme
      if (currentParagraph) {
        currentParagraph += ' ' + line;
      } else {
        currentParagraph = line;
      }
      
      // Paragraf sonu kontrolü
      if (i === lines.length - 1 || 
          (i < lines.length - 1 && lines[i + 1].trim() === '')) {
        if (currentParagraph.trim()) {
          formattedContent.push({text: currentParagraph.trim(), type: 'paragraph'});
          currentParagraph = '';
        }
      }
    }
    
    return formattedContent;
  };

  // İçindekiler'e git
  const goToTOCItem = (pageNumber: number) => {
    goToPage(pageNumber);
    setShowTOC(false);
  };

  const renderFormattedContent = (text: string, pageIndex: number) => {
    const formattedContent = formatPageText(text);
    
    return formattedContent.map((content, cIndex) => {
      // İçindekiler başlığı
      if (content.type === 'toc-title') {
        return (
          <div key={cIndex} className="toc-title-container">
            <h2 className="toc-main-title">📚 {content.text}</h2>
          </div>
        );
      }
      
      // İçindekiler öğesi
      if (content.type === 'toc-item') {
        const title = content.title || '';
        const pageNum = content.pageNum || '';
        const level = content.level || 0;
        
        return (
          <div 
            key={cIndex} 
            className={`toc-item-book level-${level}`}
            onClick={() => goToPage(parseInt(pageNum))}
            title={`Sayfa ${pageNum}'ye git`}
          >
            <span className="toc-title-book">{title}</span>
            <span className="toc-arrow">→</span>
            <span className="toc-page-book">{pageNum}</span>
          </div>
        );
      }
      
      // Bölüm başlığı
      if (content.type === 'chapter-heading') {
        return (
          <div key={cIndex} className="chapter-heading-container">
            <h1 className="chapter-title">📖 {content.text}</h1>
          </div>
        );
      }
      
      // Ana başlık
      if (content.type === 'main-heading') {
        return (
          <div key={cIndex} className="main-heading-container">
            <h2 className="main-title">{content.text}</h2>
          </div>
        );
      }
      
      // Numaralı başlık
      if (content.type === 'numbered-heading') {
        const level = content.level || 1;
        const HeadingTag = level === 1 ? 'h3' : level === 2 ? 'h4' : 'h5';
        
        return (
          <div key={cIndex} className={`numbered-heading-container level-${level}`}>
            <HeadingTag className="numbered-title">{content.text}</HeadingTag>
          </div>
        );
      }
      
      // Liste öğesi
      if (content.type === 'list-item') {
        return (
          <div key={cIndex} className="list-item-container">
            <div className="list-marker">•</div>
            <div className="list-content">
              {renderTextWithSentences(content.text, pageIndex)}
            </div>
          </div>
        );
      }
      
      // Normal paragraf
      if (content.type === 'paragraph') {
        return (
          <div key={cIndex} className="paragraph-container">
            <p className="paragraph-text">
              {renderTextWithSentences(content.text, pageIndex)}
            </p>
          </div>
        );
      }
      
      return null;
    });
  };

  // Metin içindeki cümleleri render etme
  const renderTextWithSentences = (text: string, pageIndex: number) => {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    return sentences.map((sentence, sIndex) => {
      const trimmedSentence = sentence.trim();
      const isCurrentSentence = trimmedSentence === currentSentence;
      const isHovered = trimmedSentence === hoveredSentence;
      
      // Gelişmiş arama vurgulaması - Türkçe karakter desteği
      const isSearchHighlight = searchTerm && (
        normalizeText(trimmedSentence).includes(normalizeText(searchTerm)) ||
        trimmedSentence.toLowerCase().includes(searchTerm.toLowerCase())
      );

      return (
        <span
          key={sIndex}
          className={`sentence ${isCurrentSentence ? 'current' : ''} ${isHovered ? 'hovered' : ''} ${isSearchHighlight ? 'search-highlight' : ''}`}
          onMouseEnter={() => setHoveredSentence(trimmedSentence)}
          onMouseLeave={() => setHoveredSentence('')}
          onClick={() => handleSentenceClick(trimmedSentence, pageIndex)}
          title="Okumaya başlamak için tıklayın"
        >
          {trimmedSentence}
          {sIndex < sentences.length - 1 ? ' ' : ''}
        </span>
      );
    });
  };

  // İçindekiler render etme
  const renderTableOfContents = () => {
    if (tableOfContents.length === 0) return null;

    return (
      <div className="table-of-contents">
        <div className="toc-header">
          <h3>📚 İçindekiler</h3>
          <button 
            className="toc-close-btn"
            onClick={() => setShowTOC(false)}
            title="Kapat"
          >
            ✕
          </button>
        </div>
        <div className="toc-content">
          {tableOfContents.map((item, index) => (
            <div 
              key={index}
              className="toc-item"
              onClick={() => goToTOCItem(item.page)}
              title={`Sayfa ${item.page}'ye git`}
            >
              <span className="toc-title">{item.title}</span>
              <span className="toc-dots">{'·'.repeat(3)}</span>
              <span className="toc-page">{item.page}</span>
            </div>
          ))}
        </div>
      </div>
    );
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
      
      {/* Akıllı Navigasyon Paneli */}
      {isPDFLoaded && (
        <div className="smart-navigation-panel">
          {/* Üst Kısım - Arama ve Sayfa Bilgisi */}
          <div className="nav-top-section">
            <div className="search-container-smart">
              <div className="search-input-wrapper">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Ara..."
                  className="search-input-smart"
                />
                {isSearching && <div className="search-loading">⏳</div>}
              </div>
              
              {searchResults.length > 0 && (
                <div className="search-results-compact">
                  <span className="results-info">
                    {searchResults.length} sonuç
                  </span>
                  <div className="search-nav-compact">
                    <button 
                      className="search-nav-btn-compact"
                      onClick={goToPrevSearchResult}
                      title="Önceki"
                    >
                      ↑
                    </button>
                    <span className="search-pos">{currentSearchIndex + 1}/{searchResults.length}</span>
                    <button 
                      className="search-nav-btn-compact"
                      onClick={goToNextSearchResult}
                      title="Sonraki"
                    >
                      ↓
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="page-info-smart">
              <span className="page-current">{currentPage}</span>
              <span className="page-separator">/</span>
              <span className="page-total">{totalPages}</span>
            </div>
          </div>

          {/* Alt Kısım - Sayfa Navigasyonu */}
          <div className="nav-bottom-section">
            <div className="page-controls-smart">
              <button 
                className="nav-btn-smart" 
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
                title="İlk sayfa"
              >
                ⏮️
              </button>
              
              <button 
                className="nav-btn-smart" 
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                title="Önceki sayfa"
              >
                ◀️
              </button>

              <form onSubmit={handlePageInputSubmit} className="page-input-smart">
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={pageInput}
                  onChange={handlePageInputChange}
                  placeholder={currentPage.toString()}
                  className="page-number-input"
                />
              </form>

              <button 
                className="nav-btn-smart" 
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
                title="Sonraki sayfa"
              >
                ▶️
              </button>
              
              <button 
                className="nav-btn-smart" 
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
                title="Son sayfa"
              >
                ⏭️
              </button>
            </div>

            {tableOfContents.length > 0 && (
              <button 
                className="toc-btn-smart"
                onClick={() => setShowTOC(!showTOC)}
                title="İçindekiler"
              >
                📚 İçindekiler
              </button>
            )}
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
                    ? renderFormattedContent(leftPageText, 0) 
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
                    ? renderFormattedContent(rightPageText, 1) 
                    : (!isPDFLoaded ? renderPlaceholder(false) : null)
                  }
                </div>
              </div>
            </div>
          </div>
        </div>

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

      {/* İçindekiler Paneli */}
      {showTOC && renderTableOfContents()}
    </div>
  );
} 