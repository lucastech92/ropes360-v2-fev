import { useEffect } from 'react';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  callback: () => void;
  description: string;
}

export const useKeyboardShortcuts = (shortcuts: ShortcutConfig[]) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      shortcuts.forEach(({ key, ctrl, shift, alt, callback }) => {
        const ctrlMatch = ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const shiftMatch = shift ? event.shiftKey : !event.shiftKey;
        const altMatch = alt ? event.altKey : !event.altKey;
        
        if (event.key.toLowerCase() === key.toLowerCase() && ctrlMatch && shiftMatch && altMatch) {
          event.preventDefault();
          callback();
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
};

export const globalShortcuts = [
  { key: 'k', ctrl: true, description: 'Abrir busca global' },
  { key: 'n', ctrl: true, description: 'Novo item' },
  { key: 's', ctrl: true, description: 'Salvar' },
  { key: 'e', ctrl: true, description: 'Exportar' },
  { key: '/', description: 'Focar busca' },
];
