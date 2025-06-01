import { useRef } from 'react';

interface PDFUploaderProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

export function PDFUploader({ onFileSelect, isLoading }: PDFUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  };

  return (
    <>
      <div 
        className="upload-area"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <p>PDF dosyasını buraya sürükleyin veya seçin</p>
        <input 
          type="file" 
          ref={fileInputRef}
          accept="application/pdf" 
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />
      </div>

      {isLoading && (
        <div className="loading active">
          <div className="spinner"></div>
          <p>PDF okunuyor...</p>
        </div>
      )}
    </>
  );
} 