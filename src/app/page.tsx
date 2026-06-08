import TTSPanel from '@/components/TTSPanel';
import TTSPlayer from '@/components/TTSPlayer';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';

export default function Home() {
  const { isGenerating, error, audioUrl } = useTextToSpeech();

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          Conversão de Texto em Fala
        </h1>
        <TTSPanel />
        {(audioUrl || isGenerating || error) && (
          <div className="mt-6">
            <TTSPlayer
              audioUrl={audioUrl}
              isGenerating={isGenerating}
              error={error}
            />
          </div>
        )}
      </div>
    </main>
  );
}
