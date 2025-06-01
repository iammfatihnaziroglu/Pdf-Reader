interface PDFViewerProps {
  currentText: string;
  currentPage: number;
  totalPages: number;
  currentSentence: string;
}

export function PDFViewer({ currentText, currentPage, totalPages, currentSentence }: PDFViewerProps) {
  const sentences = currentText.match(/[^.!?]+[.!?]+/g) || [currentText];
  const isEvenPage = currentPage % 2 === 0;

  return (
    <div className="book-container">
      <div className="book">
        <div className="book-cover">
          <div className="book-spine"></div>
          <div className="book-pages">
            {/* Sol Sayfa */}
            <div className={`book-page left-page ${isEvenPage ? 'even' : 'odd'}`}>
              <div className="page-header">
                <div className="page-number">
                  <span className="current-page">{isEvenPage ? currentPage - 1 : currentPage}</span>
                </div>
              </div>
              <div className="text-content">
                {isEvenPage ? (
                  <div className="page-placeholder">Önceki sayfa</div>
                ) : (
                  sentences.map((sentence, index) => {
                    const trimmedSentence = sentence.trim();
                    const isCurrentSentence = trimmedSentence === currentSentence;
                    return (
                      <span
                        key={index}
                        className={`sentence ${isCurrentSentence ? 'current' : ''}`}
                      >
                        {trimmedSentence}
                        {index < sentences.length - 1 ? '. ' : ''}
                      </span>
                    );
                  })
                )}
              </div>
            </div>

            {/* Sağ Sayfa */}
            <div className={`book-page right-page ${isEvenPage ? 'odd' : 'even'}`}>
              <div className="page-header">
                <div className="page-number">
                  <span className="current-page">{isEvenPage ? currentPage : currentPage + 1}</span>
                </div>
              </div>
              <div className="text-content">
                {isEvenPage ? (
                  sentences.map((sentence, index) => {
                    const trimmedSentence = sentence.trim();
                    const isCurrentSentence = trimmedSentence === currentSentence;
                    return (
                      <span
                        key={index}
                        className={`sentence ${isCurrentSentence ? 'current' : ''}`}
                      >
                        {trimmedSentence}
                        {index < sentences.length - 1 ? '. ' : ''}
                      </span>
                    );
                  })
                ) : (
                  <div className="page-placeholder">Sonraki sayfa</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
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
    </div>
  );
} 