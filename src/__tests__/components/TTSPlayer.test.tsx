import { render, screen } from '@testing-library/react';
import TTSPlayer from '@/components/TTSPlayer';

describe('TTSPlayer', () => {
  it('renders placeholder message', () => {
    render(<TTSPlayer />);

    expect(screen.getByText('TTS Player placeholder')).toBeInTheDocument();
  });
});
