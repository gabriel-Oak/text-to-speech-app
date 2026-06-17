import { render, screen, fireEvent } from '@testing-library/react';
import VoiceSelector, { VoiceSelectorProps } from '@/components/VoiceSelector';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderComponent(props: Partial<VoiceSelectorProps> = {}) {
  const onVoiceChangeMock = jest.fn();

  const { rerender } = render(
    <VoiceSelector
      selectedVoice={null}
      onVoiceChange={onVoiceChangeMock}
      disabled={false}
      {...props}
    />,
  );

  return {
    onVoiceChangeMock,
    rerender,
  };
}

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe('VoiceSelector', () => {
  describe('renderização', () => {
    it('deve renderizar o label', () => {
      renderComponent();
      expect(screen.getByText('Voz:')).toBeInTheDocument();
    });

    it('deve renderizar o select com a opção padrão', () => {
      renderComponent();
      expect(
        screen.getByRole('combobox', { name: 'Voz:' }),
      ).toBeInTheDocument();
    });

    it('deve desabilitar o select quando disabled=true', () => {
      renderComponent({ disabled: true });
      expect(screen.getByRole('combobox', { name: 'Voz:' })).toBeDisabled();
    });
  });

  describe('grupos de vozes por idioma', () => {
    it('deve incluir o grupo English com 21 vozes', () => {
      renderComponent();
      const select = screen.getByRole('combobox', { name: 'Voz:' });
      const options = select.querySelectorAll('option');
      const englishGroup = Array.from(options).find((o) =>
        o.parentElement?.getAttribute('label')?.includes('English'),
      );
      expect(englishGroup).toBeTruthy();
    });

    it('deve incluir o grupo Português com 1 voz', () => {
      renderComponent();
      const select = screen.getByRole('combobox', { name: 'Voz:' });
      const ptGroup = Array.from(select.querySelectorAll('optgroup')).find(
        (g) => g.getAttribute('label')?.includes('Português'),
      );
      expect(ptGroup).toBeTruthy();
    });

    it('deve incluir o grupo Italiano com 1 voz', () => {
      renderComponent();
      const select = screen.getByRole('combobox', { name: 'Voz:' });
      const itGroup = Array.from(select.querySelectorAll('optgroup')).find(
        (g) => g.getAttribute('label')?.includes('Italiano'),
      );
      expect(itGroup).toBeTruthy();
    });

    it('deve incluir o grupo Español com 1 voz', () => {
      renderComponent();
      const select = screen.getByRole('combobox', { name: 'Voz:' });
      const esGroup = Array.from(select.querySelectorAll('optgroup')).find(
        (g) => g.getAttribute('label')?.includes('Español'),
      );
      expect(esGroup).toBeTruthy();
    });

    it('deve incluir o grupo Deutsch com 1 voz', () => {
      renderComponent();
      const select = screen.getByRole('combobox', { name: 'Voz:' });
      const deGroup = Array.from(select.querySelectorAll('optgroup')).find(
        (g) => g.getAttribute('label')?.includes('Deutsch'),
      );
      expect(deGroup).toBeTruthy();
    });

    it('deve incluir o grupo Français com 1 voz', () => {
      renderComponent();
      const select = screen.getByRole('combobox', { name: 'Voz:' });
      const frGroup = Array.from(select.querySelectorAll('optgroup')).find(
        (g) => g.getAttribute('label')?.includes('Français'),
      );
      expect(frGroup).toBeTruthy();
    });

    it('deve incluir a opção "Custom URL..." no final', () => {
      renderComponent();
      const select = screen.getByRole('combobox', { name: 'Voz:' });
      const options = Array.from(select.querySelectorAll('option'));
      const customOption = options.find((o) => o.value === '__custom__');
      expect(customOption).toBeTruthy();
      expect(customOption?.textContent).toBe('Custom URL...');
    });
  });

  describe('seleção de voz builtin', () => {
    it('deve chamar onVoiceChange com o nome da voz ao selecionar', () => {
      const { onVoiceChangeMock } = renderComponent();

      const select = screen.getByRole('combobox', { name: 'Voz:' });
      fireEvent.change(select, { target: { value: 'rafael' } });

      expect(onVoiceChangeMock).toHaveBeenCalledWith('rafael');
    });

    it('deve chamar onVoiceChange com a voz selecionada (inglês)', () => {
      const { onVoiceChangeMock } = renderComponent();

      const select = screen.getByRole('combobox', { name: 'Voz:' });
      fireEvent.change(select, { target: { value: 'alba' } });

      expect(onVoiceChangeMock).toHaveBeenCalledWith('alba');
    });

    it('deve chamar onVoiceChange com null ao selecionar a opção padrão', () => {
      const { onVoiceChangeMock } = renderComponent();

      const select = screen.getByRole('combobox', { name: 'Voz:' });
      fireEvent.change(select, { target: { value: '' } });

      expect(onVoiceChangeMock).toHaveBeenCalledWith(null);
    });
  });

  describe('modo custom URL', () => {
    it('deve mostrar o input de texto ao selecionar "Custom URL..."', () => {
      renderComponent();

      const select = screen.getByRole('combobox', { name: 'Voz:' });
      fireEvent.change(select, { target: { value: '__custom__' } });

      expect(
        screen.getByPlaceholderText('https://... ou hf://...'),
      ).toBeInTheDocument();
    });

    it('deve chamar onVoiceChange com a URL ao digitar no input custom', () => {
      const { onVoiceChangeMock } = renderComponent();

      const select = screen.getByRole('combobox', { name: 'Voz:' });
      fireEvent.change(select, { target: { value: '__custom__' } });

      const input = screen.getByPlaceholderText('https://... ou hf://...');
      fireEvent.change(input, {
        target: { value: 'https://example.com/voice' },
      });

      expect(onVoiceChangeMock).toHaveBeenCalledWith(
        'https://example.com/voice',
      );
    });

    it('deve marcar URL válida (https) com borda verde', () => {
      renderComponent();

      const select = screen.getByRole('combobox', { name: 'Voz:' });
      fireEvent.change(select, { target: { value: '__custom__' } });

      const input = screen.getByPlaceholderText('https://... ou hf://...');
      fireEvent.change(input, {
        target: { value: 'https://example.com/voice' },
      });

      expect(input).toHaveStyle('border-color: #22c55e');
    });

    it('deve marcar URL válida (http) com borda verde', () => {
      renderComponent();

      const select = screen.getByRole('combobox', { name: 'Voz:' });
      fireEvent.change(select, { target: { value: '__custom__' } });

      const input = screen.getByPlaceholderText('https://... ou hf://...');
      fireEvent.change(input, {
        target: { value: 'http://example.com/voice' },
      });

      expect(input).toHaveStyle('border-color: #22c55e');
    });

    it('deve marcar URL válida (hf) com borda verde', () => {
      renderComponent();

      const select = screen.getByRole('combobox', { name: 'Voz:' });
      fireEvent.change(select, { target: { value: '__custom__' } });

      const input = screen.getByPlaceholderText('https://... ou hf://...');
      fireEvent.change(input, { target: { value: 'hf://user/model' } });

      expect(input).toHaveStyle('border-color: #22c55e');
    });

    it('deve marcar URL inválida com borda vermelha', () => {
      renderComponent();

      const select = screen.getByRole('combobox', { name: 'Voz:' });
      fireEvent.change(select, { target: { value: '__custom__' } });

      const input = screen.getByPlaceholderText('https://... ou hf://...');
      fireEvent.change(input, { target: { value: 'invalid-url' } });

      expect(input).toHaveStyle('border-color: #ef4444');
    });

    it('deve mostrar mensagem de erro para URL inválida', () => {
      renderComponent();

      const select = screen.getByRole('combobox', { name: 'Voz:' });
      fireEvent.change(select, { target: { value: '__custom__' } });

      const input = screen.getByPlaceholderText('https://... ou hf://...');
      fireEvent.change(input, { target: { value: 'invalid-url' } });

      expect(
        screen.getByText('URL deve começar com http://, https:// ou hf://'),
      ).toBeInTheDocument();
    });

    it('deve esconder mensagem de erro para URL válida', () => {
      renderComponent();

      const select = screen.getByRole('combobox', { name: 'Voz:' });
      fireEvent.change(select, { target: { value: '__custom__' } });

      const input = screen.getByPlaceholderText('https://... ou hf://...');
      fireEvent.change(input, { target: { value: 'https://example.com' } });

      expect(
        screen.queryByText('URL deve começar com http://, https:// ou hf://'),
      ).not.toBeInTheDocument();
    });
  });

  describe('botão de limpar', () => {
    it('deve mostrar o botão de limpar quando uma voz builtin está selecionada', () => {
      renderComponent({ selectedVoice: 'rafael' });

      expect(
        screen.getByLabelText('Limpar seleção de voz'),
      ).toBeInTheDocument();
    });

    it('deve não mostrar o botão de limpar quando não há seleção', () => {
      renderComponent();

      expect(
        screen.queryByLabelText('Limpar seleção de voz'),
      ).not.toBeInTheDocument();
    });

    it('deve chamar onVoiceChange com null ao clicar no botão de limpar', () => {
      const { onVoiceChangeMock } = renderComponent({
        selectedVoice: 'rafael',
      });

      const clearButton = screen.getByLabelText('Limpar seleção de voz');
      fireEvent.click(clearButton);

      expect(onVoiceChangeMock).toHaveBeenCalledWith(null);
    });

    it('deve esconder o botão de limpar após limpar a seleção', () => {
      const { onVoiceChangeMock, rerender } = renderComponent({
        selectedVoice: 'rafael',
      });

      const clearButton = screen.getByLabelText('Limpar seleção de voz');
      fireEvent.click(clearButton);

      expect(onVoiceChangeMock).toHaveBeenCalledWith(null);

      rerender(
        <VoiceSelector
          selectedVoice={null}
          onVoiceChange={onVoiceChangeMock}
          disabled={false}
        />,
      );

      expect(
        screen.queryByLabelText('Limpar seleção de voz'),
      ).not.toBeInTheDocument();
    });
  });

  describe('comportamento disabled', () => {
    it('deve desabilitar o select quando disabled=true', () => {
      renderComponent({ disabled: true });
      const select = screen.getByRole('combobox', { name: 'Voz:' });
      expect(select).toBeDisabled();
    });

    it('deve desabilitar o input custom quando disabled=true', () => {
      const { onVoiceChangeMock: _om } = renderComponent({ disabled: true });
      void _om;

      const select = screen.getByRole('combobox', { name: 'Voz:' });
      fireEvent.change(select, { target: { value: '__custom__' } });

      const input = screen.getByPlaceholderText('https://... ou hf://...');
      expect(input).toBeDisabled();
    });

    it('deve desabilitar o botão de limpar no input custom quando disabled=true', () => {
      const { onVoiceChangeMock: _om } = renderComponent({
        disabled: true,
      });
      void _om;

      const select = screen.getByRole('combobox', { name: 'Voz:' });
      fireEvent.change(select, { target: { value: '__custom__' } });

      const input = screen.getByPlaceholderText('https://... ou hf://...');
      fireEvent.change(input, { target: { value: 'https://example.com' } });

      const clearButton = screen.getByLabelText('Limpar URL personalizada');
      expect(clearButton).toHaveAttribute('tabIndex', '-1');
      expect(clearButton).toHaveStyle('cursor: not-allowed');
    });
  });

  describe('componente controlado', () => {
    it('deve refletir a voz selecionada via props', () => {
      const { onVoiceChangeMock, rerender } = renderComponent({
        selectedVoice: 'giovanni',
      });

      const select = screen.getByRole('combobox', {
        name: 'Voz:',
      }) as HTMLSelectElement;
      expect(select.value).toBe('giovanni');

      rerender(
        <VoiceSelector
          selectedVoice="rafael"
          onVoiceChange={onVoiceChangeMock}
          disabled={false}
        />,
      );

      expect(select.value).toBe('rafael');
    });
  });
});
