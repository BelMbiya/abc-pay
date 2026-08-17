"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** true → bouton de confirmation rouge (action destructive). */
  danger?: boolean;
}

const ConfirmContext = createContext<(o: ConfirmOptions) => Promise<boolean>>(() => Promise.resolve(false));

/** Demande une confirmation modale. Renvoie `true` si l'utilisateur confirme. */
export function useConfirm(): (o: ConfirmOptions) => Promise<boolean> {
  return useContext(ConfirmContext);
}

/**
 * Fournit `useConfirm()` : une fenêtre de confirmation OBLIGATOIRE avant toute action
 * irréversible / dangereuse (suppression, blocage, suspension, gel de compte…).
 * À monter une fois par surface (payeur / back-office / admin), au niveau du shell.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- montage client (portal)
  useEffect(() => setMounted(true), []);

  const confirm = useCallback(
    (o: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        resolver.current = resolve;
        setOpts(o);
      }),
    [],
  );

  const settle = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOpts(null);
  }, []);

  // Échap = annuler ; verrouille le défilement du fond pendant l'affichage.
  useEffect(() => {
    if (!opts) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && settle(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [opts, settle]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {mounted && opts
        ? createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-5" role="dialog" aria-modal="true" aria-label={opts.title}>
              <div className="absolute inset-0 bg-navy/40 backdrop-blur-[1px]" onClick={() => settle(false)} aria-hidden="true" />
              <div className="relative w-full max-w-[380px] rounded-2xl bg-white p-6 shadow-hero">
                <div className="flex items-start gap-3">
                  {opts.danger ? (
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#FDE7E8] text-red">
                      <AlertTriangle className="size-5" strokeWidth={2.2} />
                    </span>
                  ) : null}
                  <div className="min-w-0">
                    <h2 className="font-display text-[16px] font-bold text-ink">{opts.title}</h2>
                    {opts.message ? <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500">{opts.message}</p> : null}
                  </div>
                </div>
                <div className="mt-6 flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => settle(false)}
                    className="flex-1 rounded-pill border-[1.5px] border-gray-300 py-3 text-[13.5px] font-bold text-ink hover:bg-gray-100"
                  >
                    {opts.cancelLabel ?? "Annuler"}
                  </button>
                  <button
                    type="button"
                    onClick={() => settle(true)}
                    autoFocus
                    className={`flex-1 rounded-pill py-3 text-[13.5px] font-bold text-white ${opts.danger ? "bg-red hover:opacity-90" : "bg-grad-primary"}`}
                  >
                    {opts.confirmLabel ?? "Confirmer"}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </ConfirmContext.Provider>
  );
}
