import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import '../../app/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Voice Clone v2 — Voice Cloning',
  description:
    'Gere áudio com vozes customizadas usando clonagem de voz via IA.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function V2Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={inter.className}>
        <div style={styles.wrapper}>{children}</div>
      </body>
    </html>
  );
}

// ---------------------------------------------------------------------------
// Estilos do layout
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: '100vh',
    background: 'var(--color-bg)',
    padding: '24px 16px',
    display: 'flex',
    justifyContent: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: 1100,
  },
};
