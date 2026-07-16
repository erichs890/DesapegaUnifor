import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { animate } from 'animejs';
import { prefersReducedMotion } from '../hooks/useReducedMotion';
import './Modal.css';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/**
 * Modal acessível: foco preso, Esc fecha, clique no scrim fecha,
 * entrada com escala+fade (anime.js) a partir do centro.
 */
export function Modal({ open, onClose, title, children }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement;
    const panel = panelRef.current;

    if (panel && !prefersReducedMotion()) {
      animate(panel, { opacity: [0, 1], scale: [0.92, 1], translateY: [12, 0], duration: 240, ease: 'outCubic' });
    }
    panel?.querySelector<HTMLElement>('button, a, input, [tabindex]')?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && panel) {
        // foco preso: cicla dentro do modal
        const focusables = panel.querySelectorAll<HTMLElement>(
          'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden'; // trava o scroll de fundo

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previousFocus.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel" ref={panelRef} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Fechar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body
  );
}
