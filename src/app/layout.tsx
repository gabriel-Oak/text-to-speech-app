import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Pocket TTS — Texto para Fala com IA',
  description:
    'Conversão de texto em fala natural com clonagem de voz. Powered by Pocket TTS.',
  keywords: [
    'text-to-speech',
    'tts',
    'voice cloning',
    'pocket tts',
    'texto para fala',
  ],
  authors: [{ name: 'Pocket TTS' }],
  openGraph: {
    title: 'Pocket TTS — Texto para Fala com IA',
    description: 'Conversão de texto em fala natural com clonagem de voz.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pocket TTS — Texto para Fala com IA',
    description: 'Conversão de texto em fala natural com clonagem de voz.',
  },
};

export const viewport: Viewport = {
  width: 'default',
  height: 'default',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
