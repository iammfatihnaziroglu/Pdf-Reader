interface PDFViewerProps {
  currentText: string;
  currentPage: number;
  totalPages: number;
  currentSentence: string;
}

export function PDFViewer({ currentText, currentPage, totalPages, currentSentence }: PDFViewerProps) {
  const sentences = currentText.match(/[^.!?]+[.!?]+/g) || [currentText];

  return (
    <div className="book-card">
      <div className="page-info">
        Sayfa {currentPage} / {totalPages}
      </div>
      <div className="text-content">
        {sentences.map((sentence, index) => {
          const trimmedSentence = sentence.trim();
          const isCurrentSentence = trimmedSentence === currentSentence;
          return (
            <span
              key={index}
              className={`sentence ${isCurrentSentence ? 'current' : ''}`}
              style={{
                backgroundColor: isCurrentSentence ? 'rgba(74, 85, 104, 0.8)' : 'transparent',
                color: isCurrentSentence ? '#fff' : '#e2e8f0',
                fontWeight: isCurrentSentence ? '500' : 'normal',
                padding: '4px 8px',
                margin: '2px 0',
                borderRadius: '4px',
                display: 'inline-block',
                transition: 'all 0.3s ease',
                cursor: 'default',
                userSelect: 'none'
              }}
            >
              {trimmedSentence}
              {index < sentences.length - 1 ? '. ' : ''}
            </span>
          );
        })}
      </div>
    </div>
  );
} 