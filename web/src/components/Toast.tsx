import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { animate } from 'animejs';
import { prefersReducedMotion } from '../hooks/useReducedMotion';
import './Toast.css';

type ToastKind = 'success' | 'error';

interface ToastData {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  toast: (kind: ToastKind, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast deve ser usado dentro de <ToastProvider>');
  return ctx;
}

let nextId = 1;

function ToastItem({ data, onDone }: { data: ToastData; onDone: (id: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el && !prefersReducedMotion()) {
      // anime.js: entrada com leve overshoot — feedback perceptível sem roubar foco
      animate(el, {
        translateY: [24, 0],
        opacity: [0, 1],
        scale: [0.96, 1],
        duration: 380,
        ease: 'outBack(1.4)',
      });
    }
    const timer = setTimeout(() => {
      if (el && !prefersReducedMotion()) {
        // saída mais rápida que a entrada (60-70% da duração)
        animate(el, {
          translateY: [0, 12],
          opacity: [1, 0],
          duration: 240,
          ease: 'inQuad',
          onComplete: () => onDone(data.id),
        });
      } else {
        onDone(data.id);
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, [data.id, onDone]);

  return (
    <div ref={ref} className={`toast toast-${data.kind}`}>
      {data.kind === 'success' ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.18" />
          <path d="M8 12.5l2.5 2.5L16 9.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.18" />
          <path d="M12 7.5v5.5M12 16.5h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      )}
      <span>{data.message}</span>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const toast = useCallback((kind: ToastKind, message: string) => {
    setToasts((prev) => [...prev.slice(-2), { id: nextId++, kind, message }]);
  }, []);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* aria-live polite: leitores de tela anunciam sem roubar o foco */}
      <div className="toast-region" role="status" aria-live="polite">
        {toasts.map((t) => (
          <ToastItem key={t.id} data={t} onDone={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
