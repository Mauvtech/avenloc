'use client';

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type ToastType = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastApi {
  show: (message: string, type?: ToastType) => void;
  success: (m: string) => void;
  error: (m: string) => void;
  info: (m: string) => void;
}

const ToastCtx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (ctx) return ctx;
  // Fallback silencieux si le provider n'est pas monté (SSR, tests).
  const noop = () => {};
  return { show: noop, success: noop, error: noop, info: noop };
}

const STYLES: Record<ToastType, string> = {
  success: 'border-success/30 bg-success-tint text-success-fg',
  error: 'border-danger/30 bg-danger-tint text-danger-fg',
  info: 'border-line bg-surface text-ink',
};
const ICONS: Record<ToastType, string> = { success: '✓', error: '✕', info: 'ℹ' };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const show = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = ++seq.current;
      setToasts((t) => [...t, { id, message, type }]);
      setTimeout(() => remove(id), type === 'error' ? 6000 : 4000);
    },
    [remove],
  );

  const api: ToastApi = {
    show,
    success: (m) => show(m, 'success'),
    error: (m) => show(m, 'error'),
    info: (m) => show(m, 'info'),
  };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[200] flex w-[min(92vw,360px)] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => remove(t.id)}
            className={`pointer-events-auto flex animate-slide-up cursor-pointer items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm font-medium shadow-raised ${STYLES[t.type]}`}
          >
            <span className="mt-px font-bold">{ICONS[t.type]}</span>
            <span className="flex-1">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
