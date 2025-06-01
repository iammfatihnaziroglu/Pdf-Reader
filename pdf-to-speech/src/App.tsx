import { PDFProvider } from './context/PDFContext';
import { PDFReader } from './components/PDFReader';
import './App.css';

function App() {
  return (
    <PDFProvider>
      <PDFReader />
    </PDFProvider>
  );
}

export default App;
