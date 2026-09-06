'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface ConfirmOptions {
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm doit être utilisé dans <ConfirmProvider>');
  return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    setOpts(options);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = useCallback((result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setOpts(null);
  }, []);

  useEffect(() => {
    if (!opts) return;
    confirmBtnRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close(false);
      if (e.key === 'Enter') close(true);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [opts, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {opts && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={opts.title}
          className="fixed inset-0 z-[160] flex items-center justify-center bg-ink/50 p-4"
          onClick={() => close(false)}
        >
          <div
            className="w-full max-w-sm animate-slide-up rounded-lg border border-line bg-surface p-5 shadow-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-bold text-ink">{opts.title}</h2>
            {opts.body && <div className="mt-1.5 text-sm text-muted">{opts.body}</div>}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => close(false)} className="btn-ghost btn-sm">
                {opts.cancelLabel ?? 'Annuler'}
              </button>
              <button
                ref={confirmBtnRef}
                onClick={() => close(true)}
                className={`btn-sm ${opts.danger ? 'btn-danger' : 'btn-primary'}`}
              >
                {opts.confirmLabel ?? 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
