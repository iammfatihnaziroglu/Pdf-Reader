import { usePDF } from '../context/PDFContext';

interface PDFViewerProps {
  currentText: string;
  currentPage: number;
  totalPages: number;
  currentSentence: string;
}

export function PDFViewer({ currentText, currentPage, totalPages, currentSentence }: PDFViewerProps) {
  const { state, dispatch } = usePDF();
  const sentences = currentText.match(/[^.!?]+[.!?]+/g) || [currentText];
  
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
                {leftPageSentences.map((sentence, index) => {
                  const trimmedSentence = sentence.trim();
                  const isCurrentSentence = trimmedSentence === currentSentence;
                  return (
                    <span
                      key={index}
                      className={`sentence ${isCurrentSentence ? 'current' : ''}`}
                    >
                      {trimmedSentence}
                      {index < leftPageSentences.length - 1 ? '. ' : ''}
                    </span>
                  );
                })}
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
                {rightPageSentences.map((sentence, index) => {
                  const trimmedSentence = sentence.trim();
                  const isCurrentSentence = trimmedSentence === currentSentence;
                  return (
                    <span
                      key={index}
                      className={`sentence ${isCurrentSentence ? 'current' : ''}`}
                    >
                      {trimmedSentence}
                      {index < rightPageSentences.length - 1 ? '. ' : ''}
                    </span>
                  );
                })}
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