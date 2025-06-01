import { createContext, useContext, useReducer } from 'react';
import type { ReactNode } from 'react';

interface PDFState {
  currentText: string;
  currentPage: number;
  totalPages: number;
  currentSentence: string;
  isLoading: boolean;
  voices: SpeechSynthesisVoice[];
  selectedVoice: string;
  isPlaying: boolean;
  isPaused: boolean;
  pagesText: string[];
}

type PDFAction =
  | { type: 'SET_TEXT'; payload: string }
  | { type: 'SET_PAGE'; payload: { current: number; total: number } }
  | { type: 'SET_SENTENCE'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_VOICES'; payload: SpeechSynthesisVoice[] }
  | { type: 'SET_SELECTED_VOICE'; payload: string }
  | { type: 'SET_PLAYING'; payload: boolean }
  | { type: 'SET_PAUSED'; payload: boolean }
  | { type: 'SET_PAGES_TEXT'; payload: string[] };

const initialState: PDFState = {
  currentText: '',
  currentPage: 1,
  totalPages: 1,
  currentSentence: '',
  isLoading: false,
  voices: [],
  selectedVoice: '',
  isPlaying: false,
  isPaused: false,
  pagesText: [],
};

function pdfReducer(state: PDFState, action: PDFAction): PDFState {
  switch (action.type) {
    case 'SET_TEXT':
      return { ...state, currentText: action.payload };
    case 'SET_PAGE':
      return { ...state, currentPage: action.payload.current, totalPages: action.payload.total };
    case 'SET_SENTENCE':
      return { ...state, currentSentence: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_VOICES':
      return { ...state, voices: action.payload };
    case 'SET_SELECTED_VOICE':
      return { ...state, selectedVoice: action.payload };
    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload };
    case 'SET_PAUSED':
      return { ...state, isPaused: action.payload };
    case 'SET_PAGES_TEXT':
      return { ...state, pagesText: action.payload };
    default:
      return state;
  }
}

interface PDFContextType {
  state: PDFState;
  dispatch: React.Dispatch<PDFAction>;
}

const PDFContext = createContext<PDFContextType | undefined>(undefined);

export function PDFProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(pdfReducer, initialState);

  return (
    <PDFContext.Provider value={{ state, dispatch }}>
      {children}
    </PDFContext.Provider>
  );
}

export function usePDF() {
  const context = useContext(PDFContext);
  if (context === undefined) {
    throw new Error('usePDF must be used within a PDFProvider');
  }
  return context;
} 