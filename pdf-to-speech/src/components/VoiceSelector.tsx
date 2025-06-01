interface VoiceSelectorProps {
  voices: SpeechSynthesisVoice[];
  selectedVoice: string;
  onVoiceChange: (voice: string) => void;
}

export function VoiceSelector({ voices, selectedVoice, onVoiceChange }: VoiceSelectorProps) {
  return (
    <select 
      value={selectedVoice} 
      onChange={(e) => onVoiceChange(e.target.value)}
    >
      <option value="">Ses seçin...</option>
      {voices.map(voice => (
        <option key={voice.name} value={voice.name}>
          {voice.name} ({voice.lang})
        </option>
      ))}
    </select>
  );
} 