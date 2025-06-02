import { useState, useMemo } from 'react';

interface VoiceSelectorProps {
  voices: SpeechSynthesisVoice[];
  selectedVoice: string;
  onVoiceChange: (voice: string) => void;
}

interface LanguageOption {
  code: string;
  name: string;
  flag: string;
}

const LANGUAGE_MAP: Record<string, LanguageOption> = {
  'tr': { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  'en': { code: 'en', name: 'English', flag: '🇺🇸' },
  'de': { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  'fr': { code: 'fr', name: 'Français', flag: '🇫🇷' },
  'es': { code: 'es', name: 'Español', flag: '🇪🇸' },
  'it': { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  'pt': { code: 'pt', name: 'Português', flag: '🇵🇹' },
  'ru': { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  'ja': { code: 'ja', name: '日本語', flag: '🇯🇵' },
  'ko': { code: 'ko', name: '한국어', flag: '🇰🇷' },
  'zh': { code: 'zh', name: '中文', flag: '🇨🇳' },
  'ar': { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  'hi': { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  'nl': { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  'sv': { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
  'no': { code: 'no', name: 'Norsk', flag: '🇳🇴' },
  'da': { code: 'da', name: 'Dansk', flag: '🇩🇰' },
  'fi': { code: 'fi', name: 'Suomi', flag: '🇫🇮' },
  'pl': { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  'cs': { code: 'cs', name: 'Čeština', flag: '🇨🇿' },
  'hu': { code: 'hu', name: 'Magyar', flag: '🇭🇺' },
  'ro': { code: 'ro', name: 'Română', flag: '🇷🇴' },
  'bg': { code: 'bg', name: 'Български', flag: '🇧🇬' },
  'hr': { code: 'hr', name: 'Hrvatski', flag: '🇭🇷' },
  'sk': { code: 'sk', name: 'Slovenčina', flag: '🇸🇰' },
  'sl': { code: 'sl', name: 'Slovenščina', flag: '🇸🇮' },
  'et': { code: 'et', name: 'Eesti', flag: '🇪🇪' },
  'lv': { code: 'lv', name: 'Latviešu', flag: '🇱🇻' },
  'lt': { code: 'lt', name: 'Lietuvių', flag: '🇱🇹' },
  'el': { code: 'el', name: 'Ελληνικά', flag: '🇬🇷' },
  'he': { code: 'he', name: 'עברית', flag: '🇮🇱' },
  'th': { code: 'th', name: 'ไทย', flag: '🇹🇭' },
  'vi': { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  'id': { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
  'ms': { code: 'ms', name: 'Bahasa Melayu', flag: '🇲🇾' },
  'uk': { code: 'uk', name: 'Українська', flag: '🇺🇦' },
  'ca': { code: 'ca', name: 'Català', flag: '🏴󠁥󠁳󠁣󠁴󠁿' },
  'eu': { code: 'eu', name: 'Euskera', flag: '🏴󠁥󠁳󠁰󠁶󠁿' },
  'gl': { code: 'gl', name: 'Galego', flag: '🏴󠁥󠁳󠁧󠁡󠁿' }
};

export function VoiceSelector({ voices, selectedVoice, onVoiceChange }: VoiceSelectorProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [languageSearch, setLanguageSearch] = useState<string>('');
  const [voiceSearch, setVoiceSearch] = useState<string>('');

  // Popüler diller (varsayılan gösterilecek)
  const POPULAR_LANGUAGES = ['tr', 'en', 'de'];

  // Mevcut dilleri grupla
  const availableLanguages = useMemo(() => {
    const langCodes = new Set<string>();
    voices.forEach(voice => {
      const langCode = voice.lang.split('-')[0].toLowerCase();
      langCodes.add(langCode);
    });

    return Array.from(langCodes)
      .map(code => LANGUAGE_MAP[code] || { code, name: code.toUpperCase(), flag: '🌐' })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [voices]);

  // Gösterilecek diller - arama varsa tümü, yoksa sadece popüler olanlar
  const displayedLanguages = useMemo(() => {
    const filtered = languageSearch 
      ? availableLanguages.filter(lang => 
          lang.name.toLowerCase().includes(languageSearch.toLowerCase()) ||
          lang.code.toLowerCase().includes(languageSearch.toLowerCase())
        )
      : availableLanguages.filter(lang => POPULAR_LANGUAGES.includes(lang.code));
    
    return filtered;
  }, [availableLanguages, languageSearch]);

  // Seçili dildeki sesler
  const voicesForSelectedLanguage = useMemo(() => {
    if (!selectedLanguage) return [];
    return voices.filter(voice => 
      voice.lang.split('-')[0].toLowerCase() === selectedLanguage.toLowerCase()
    );
  }, [voices, selectedLanguage]);

  // Ses araması
  const filteredVoices = useMemo(() => {
    if (!voiceSearch) return voicesForSelectedLanguage;
    return voicesForSelectedLanguage.filter(voice =>
      voice.name.toLowerCase().includes(voiceSearch.toLowerCase()) ||
      voice.lang.toLowerCase().includes(voiceSearch.toLowerCase())
    );
  }, [voicesForSelectedLanguage, voiceSearch]);

  const handleLanguageChange = (langCode: string) => {
    setSelectedLanguage(langCode);
    setVoiceSearch('');
    onVoiceChange(''); // Ses seçimini sıfırla
  };

  const handleVoiceChange = (voiceName: string) => {
    onVoiceChange(voiceName);
  };

  return (
    <div className="voice-selector-container">
      {/* Dil Seçimi */}
      <div className="language-selection">
        <h3 className="selection-title">🌍 Dil Seçin</h3>
        
        {/* Dil Arama */}
        <div className="search-container">
          <input
            type="text"
            placeholder="Diğer dilleri aramak için yazın..."
            value={languageSearch}
            onChange={(e) => setLanguageSearch(e.target.value)}
            className="search-input"
          />
        </div>

        {/* Dil Listesi */}
        <div className="language-grid">
          {displayedLanguages.map(lang => (
            <button
              key={lang.code}
              className={`language-button ${selectedLanguage === lang.code ? 'selected' : ''}`}
              onClick={() => handleLanguageChange(lang.code)}
            >
              <span className="language-flag">{lang.flag}</span>
              <span className="language-name">{lang.name}</span>
              <span className="language-count">
                ({voices.filter(v => v.lang.split('-')[0].toLowerCase() === lang.code).length})
              </span>
            </button>
          ))}
        </div>

        {/* Arama ipucu */}
        {!languageSearch && displayedLanguages.length === 3 && (
          <div className="search-hint">
            💡 Diğer dilleri görmek için yukarıdaki arama kutusunu kullanın
          </div>
        )}
      </div>

      {/* Ses Seçimi */}
      {selectedLanguage && (
        <div className="voice-selection">
          <h3 className="selection-title">
            🎤 {LANGUAGE_MAP[selectedLanguage]?.name || selectedLanguage.toUpperCase()} Sesleri
          </h3>
          
          {/* Ses Arama */}
          <div className="search-container">
            <input
              type="text"
              placeholder="Ses ara..."
              value={voiceSearch}
              onChange={(e) => setVoiceSearch(e.target.value)}
              className="search-input"
            />
          </div>

          {/* Ses Listesi */}
          <div className="voice-list">
            {filteredVoices.length > 0 ? (
              filteredVoices.map(voice => (
                <button
                  key={voice.name}
                  className={`voice-button ${selectedVoice === voice.name ? 'selected' : ''}`}
                  onClick={() => handleVoiceChange(voice.name)}
                >
                  <div className="voice-info">
                    <span className="voice-name">{voice.name}</span>
                    <span className="voice-lang">({voice.lang})</span>
                  </div>
                  <div className="voice-details">
                    <span className="voice-gender">
                      {voice.name.toLowerCase().includes('female') || voice.name.toLowerCase().includes('woman') ? '👩' : 
                       voice.name.toLowerCase().includes('male') || voice.name.toLowerCase().includes('man') ? '👨' : '🎭'}
                    </span>
                    <span className="voice-quality">
                      {voice.localService ? '💻' : '☁️'}
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="no-voices">
                <p>Bu dilde ses bulunamadı.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Seçim Özeti */}
      {selectedLanguage && selectedVoice && (
        <div className="selection-summary">
          <h4>✅ Seçilen Ses</h4>
          <div className="summary-content">
            <span className="summary-flag">{LANGUAGE_MAP[selectedLanguage]?.flag || '🌐'}</span>
            <span className="summary-text">
              {LANGUAGE_MAP[selectedLanguage]?.name || selectedLanguage} - {selectedVoice}
            </span>
          </div>
        </div>
      )}
    </div>
  );
} 