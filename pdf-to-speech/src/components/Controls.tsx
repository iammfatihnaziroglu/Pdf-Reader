interface ControlsProps {
  isPlaying: boolean;
  isPaused: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  disabled: boolean;
}

export function Controls({ isPlaying, isPaused, onPlay, onPause, onStop, disabled }: ControlsProps) {
  return (
    <div className="controls">
      <button 
        className="play" 
        onClick={onPlay}
        disabled={disabled}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        {isPaused ? 'Devam Et' : 'Başlat'}
      </button>
      <button 
        className="pause" 
        onClick={onPause}
        disabled={!isPlaying || isPaused}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="6" y="4" width="4" height="16"/>
          <rect x="14" y="4" width="4" height="16"/>
        </svg>
        Duraklat
      </button>
      <button 
        className="stop" 
        onClick={onStop}
        disabled={!isPlaying}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="6" y="6" width="12" height="12"/>
        </svg>
        Durdur
      </button>
    </div>
  );
} 