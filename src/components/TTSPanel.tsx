'use client';

import { useState, ChangeEvent, FormEvent } from 'react';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { getVoicesByLanguage } from '@/lib/ttsClient';

export default function TTSPanel() {
  const [text, setText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('english');
  const [selectedVoice, setSelectedVoice] = useState('');
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [isCloning, setIsCloning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const { generate, error } = useTextToSpeech();

  const voices = getVoicesByLanguage(selectedLanguage);

  const canGenerate =
    text.trim().length > 0 &&
    (!isCloning || selectedVoice !== '' || voiceFile !== null);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = e.target.value;
    setSelectedLanguage(newLanguage);
    setSelectedVoice('');
  };

  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedVoice(e.target.value);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setVoiceFile(file);
  };

  const handleClearFile = () => {
    setVoiceFile(null);
  };

  const handleGenerate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!canGenerate || isGenerating) return;

    setIsGenerating(true);

    try {
      await generate({
        text,
        voiceName: isCloning ? undefined : selectedVoice,
        voiceFile: isCloning ? (voiceFile ?? undefined) : undefined,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex justify-center w-full">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-6 space-y-5">
        <h2 className="text-xl font-semibold text-gray-800">Text to Speech</h2>

        <form onSubmit={handleGenerate} className="space-y-5">
          {/* Text Input */}
          <div>
            <label
              htmlFor="tts-text"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Text
            </label>
            <textarea
              id="tts-text"
              rows={6}
              value={text}
              onChange={handleTextChange}
              placeholder="Enter text to synthesize..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[120px] resize-y text-gray-800"
            />
            <p className="mt-1 text-xs text-gray-500 text-right">
              {text.length} character{text.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Language Select */}
          <div>
            <label
              htmlFor="tts-language"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Language
            </label>
            <select
              id="tts-language"
              value={selectedLanguage}
              onChange={handleLanguageChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800 bg-white"
            >
              <option value="english">English</option>
              <option value="portuguese">Português</option>
              <option value="french_24l">Français</option>
              <option value="german_24l">Deutsch</option>
              <option value="italian_24l">Italiano</option>
              <option value="spanish_24l">Español</option>
            </select>
          </div>

          {/* Voice Mode Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Voice Mode
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="voiceMode"
                  checked={!isCloning}
                  onChange={() => setIsCloning(false)}
                  className="mr-2 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Voz pré-definida</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="voiceMode"
                  checked={isCloning}
                  onChange={() => setIsCloning(true)}
                  className="mr-2 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Clonar voz</span>
              </label>
            </div>
          </div>

          {/* Voice Select (shown when not cloning) */}
          {!isCloning && (
            <div>
              <label
                htmlFor="tts-voice"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Voice
              </label>
              <select
                id="tts-voice"
                value={selectedVoice}
                onChange={handleVoiceChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800 bg-white"
              >
                <option value="">Padrão</option>
                {voices.map((voice) => (
                  <option key={voice.id} value={voice.name}>
                    {voice.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* File Upload (shown when cloning) */}
          {isCloning && (
            <div>
              <label
                htmlFor="tts-voice-file"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Voice Sample Audio
              </label>
              <div className="flex items-center space-x-3">
                <label className="flex-1 cursor-pointer">
                  <input
                    type="file"
                    id="tts-voice-file"
                    accept=".wav,.mp3,.ogg,.m4a"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="px-3 py-2 border border-gray-300 rounded-lg text-gray-500 text-sm hover:border-indigo-400 hover:text-indigo-600 transition-colors text-center">
                    {voiceFile
                      ? voiceFile.name
                      : 'Select audio file (.wav, .mp3, .ogg, .m4a)'}
                  </div>
                </label>
                {voiceFile && (
                  <button
                    type="button"
                    onClick={handleClearFile}
                    className="px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Generate Button */}
          <button
            type="submit"
            disabled={!canGenerate || isGenerating}
            className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
              canGenerate && !isGenerating
                ? 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
                : 'bg-indigo-300 cursor-not-allowed'
            }`}
          >
            {isGenerating ? (
              <span className="flex items-center justify-center space-x-2">
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Generating...</span>
              </span>
            ) : (
              'Gerar Áudio'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
