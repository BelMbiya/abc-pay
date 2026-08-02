"use client";

import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Feuille coulissante (bottom sheet) façon Shopify : glisse du bas vers le haut,
 * centrée, sur un arrière-plan flouté. Utilisée pour tout formulaire ou aperçu
 * de détails. Ferme au clic sur le fond, au bouton ✕ ou avec Échap.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);

  // Monte puis anime (entrée) ; anime puis démonte (sortie).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- pilotage montage/animation */
    if (open) {
      setMounted(true);
      const t = setTimeout(() => setShown(true), 10);
      return () => clearTimeout(t);
    }
    setShown(false);
    const t = setTimeout(() => setMounted(false), 300);
    return () => clearTimeout(t);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open]);

  // Échap + blocage du scroll de fond.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      {/* Arrière-plan flouté */}
      <div
        onClick={onClose}
        aria-hidden
        className={cn(
          "absolute inset-0 bg-navy/40 backdrop-blur-sm transition-opacity duration-300",
          shown ? "opacity-100" : "opacity-0",
        )}
      />
      {/* Feuille */}
      <div
        className={cn(
          "relative w-full max-w-[560px] rounded-t-[24px] bg-white p-5 pb-8 shadow-[0_-12px_40px_rgba(15,27,48,0.22)]",
          "max-h-[92vh] overflow-y-auto transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)]",
          "sm:rounded-[24px] sm:pb-6",
          shown ? "translate-y-0" : "translate-y-full sm:translate-y-4 sm:opacity-0",
        )}
      >
        {/* Poignée */}
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-gray-300 sm:hidden" />
        <div className="mb-3 flex items-center justify-between">
          {title ? <h2 className="font-display text-[16px] font-bold text-ink">{title}</h2> : <span />}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex size-8 items-center justify-center rounded-lg bg-gray-100 text-ink hover:bg-gray-300/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <X className="size-[18px]" strokeWidth={2.2} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
