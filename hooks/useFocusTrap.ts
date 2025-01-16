import { useRef, useEffect } from 'react';

interface UseFocusTrapProps {
  active: boolean;
}

export function useFocusTrap({ active }: UseFocusTrapProps) {
  const focusTrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || !focusTrapRef.current) return;

    const focusableElements = focusTrapRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    }

    focusTrapRef.current.addEventListener('keydown', handleKeyDown);
    return () => {
      focusTrapRef.current?.removeEventListener('keydown', handleKeyDown);
    };
  }, [active]);

  return { focusTrapRef };
} 