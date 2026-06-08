import { render, screen } from '@testing-library/react';
import TTSPlayer from '@/components/TTSPlayer';

// Mock URL.createObjectURL to return a stable URL for testing
beforeAll(() => {
  (global as any).URL.createObjectURL = jest.fn(
    () => 'http://mocked.audio/url',
  );
  (global as any).URL.revokeObjectURL = jest.fn();
});

describe('TTSPlayer', () => {
  it('renders player when audioUrl is provided', () => {
    const { container } = render(
      <TTSPlayer
        audioUrl="http://example.com/audio.mp3"
        isGenerating={false}
        error={null}
      />,
    );

    const audio = container.querySelector('audio');
    expect(audio).toBeInTheDocument();
    expect(audio?.getAttribute('src')).toBe('http://example.com/audio.mp3');
  });

  it('shows loading indicator when generating', () => {
    render(<TTSPlayer audioUrl={null} isGenerating={true} error={null} />);

    expect(screen.getByText('Gerando áudio...')).toBeInTheDocument();
  });

  it('shows error message when error is present', () => {
    render(
      <TTSPlayer audioUrl={null} isGenerating={false} error="Test error" />,
    );

    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('does not render audio when no audioUrl', () => {
    const { container } = render(
      <TTSPlayer audioUrl={null} isGenerating={false} error={null} />,
    );

    const audio = container.querySelector('audio');
    expect(audio).not.toBeInTheDocument();
  });

  it('shows "Nenhum áudio gerado" when no audio and not generating', () => {
    render(<TTSPlayer audioUrl={null} isGenerating={false} error={null} />);

    expect(screen.getByText('Nenhum áudio gerado')).toBeInTheDocument();
  });

  it('prefers loading state over no-audio state when both true', () => {
    render(<TTSPlayer audioUrl={null} isGenerating={true} error={null} />);

    expect(screen.getByText('Gerando áudio...')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum áudio gerado')).not.toBeInTheDocument();
  });

  it('prefers loading state over error state when both true', () => {
    render(
      <TTSPlayer audioUrl={null} isGenerating={true} error="Some error" />,
    );

    expect(screen.getByText('Gerando áudio...')).toBeInTheDocument();
    expect(screen.queryByText('Some error')).not.toBeInTheDocument();
  });

  it('prefers error state over no-audio state', () => {
    render(
      <TTSPlayer audioUrl={null} isGenerating={false} error="Error shown" />,
    );

    expect(screen.getByText('Error shown')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum áudio gerado')).not.toBeInTheDocument();
  });

  it('renders play button when audio is available', () => {
    render(
      <TTSPlayer
        audioUrl="http://example.com/audio.wav"
        isGenerating={false}
        error={null}
      />,
    );

    const playButton = screen.getByLabelText('Reproduzir');
    expect(playButton).toBeInTheDocument();
  });

  it('renders download button when audio is available', () => {
    render(
      <TTSPlayer
        audioUrl="http://example.com/audio.wav"
        isGenerating={false}
        error={null}
      />,
    );

    const downloadButton = screen.getByText('Baixar WAV');
    expect(downloadButton).toBeInTheDocument();
  });

  it('renders progress bar when audio is available', () => {
    const { container } = render(
      <TTSPlayer
        audioUrl="http://example.com/audio.wav"
        isGenerating={false}
        error={null}
      />,
    );

    const progressBars = container.querySelectorAll('input[type="range"]');
    expect(progressBars.length).toBeGreaterThan(0);
  });

  it('renders play/pause button when playing', () => {
    render(
      <TTSPlayer
        audioUrl="http://example.com/audio.wav"
        isGenerating={false}
        error={null}
      />,
    );

    // Initially shows play button
    const playButton = screen.getByLabelText('Reproduzir');
    expect(playButton).toBeInTheDocument();
  });

  it('renders time display when audio is available', () => {
    const { container } = render(
      <TTSPlayer
        audioUrl="http://example.com/audio.wav"
        isGenerating={false}
        error={null}
      />,
    );

    // Time display shows as "0:00 / 0:00"
    const spans = container.querySelectorAll('span');
    expect(spans.length).toBeGreaterThan(0);
  });

  it('applies error container styles', () => {
    const { container } = render(
      <TTSPlayer audioUrl={null} isGenerating={false} error="Error message" />,
    );

    const errorContainer = container.querySelector('.border-red-200');
    expect(errorContainer).toBeInTheDocument();
  });

  it('applies no-audio container styles', () => {
    const { container } = render(
      <TTSPlayer audioUrl={null} isGenerating={false} error={null} />,
    );

    const noAudioContainer = container.querySelector('.border-dashed');
    expect(noAudioContainer).toBeInTheDocument();
  });

  it('applies loading spinner styles', () => {
    const { container } = render(
      <TTSPlayer audioUrl={null} isGenerating={true} error={null} />,
    );

    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });
});
