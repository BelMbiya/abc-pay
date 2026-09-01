"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastContextValue {
  /** Affiche un toast. `type` optionnel — inféré du message si absent (repli succès). */
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Apparence par type : icône + couleur d'accent distinctes (le fond sombre reste le même). */
const META: Record<ToastType, { Icon: LucideIcon; color: string; ring: string }> = {
  success: { Icon: CheckCircle, color: "text-green", ring: "ring-green/50" },
  error: { Icon: XCircle, color: "text-red", ring: "ring-red/60" },
  warning: { Icon: AlertTriangle, color: "text-gold-400", ring: "ring-gold-400/60" },
  info: { Icon: Info, color: "text-blue-500", ring: "ring-blue-500/60" },
};

/**
 * Inférence du type à partir du message (français) quand l'appelant n'en fournit pas —
 * évite de reprendre les ~100 appels existants tout en différenciant succès/erreur/info.
 * Un `type` passé explicitement a toujours la priorité.
 */
function inferType(msg: string): ToastType {
  const m = msg.toLowerCase();
  if (/impossible|échec|echec|échou|echou|refus|invalide|erreur|manquant|introuvable|indisponible|dépass|depass|bloqu|obligatoire|minimum|aucun|interdit|expiré|expire/.test(m)) {
    return "error";
  }
  if (/bientôt|bientot|à venir|a venir|en attente|patiente/.test(m)) {
    return "info";
  }
  return "success";
}

/** Fournit showToast() à toute l'app — pill sombre, icône + accent selon le type. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [type, setType] = useState<ToastType>("success");
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, t?: ToastType) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(msg);
    setType(t ?? inferType(msg));
    setVisible(true);
    timer.current = setTimeout(() => setVisible(false), 2600);
  }, []);

  const { Icon, color, ring } = META[type];

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        role="status"
        aria-live={type === "error" ? "assertive" : "polite"}
        className={cn(
          "pointer-events-none fixed bottom-6 left-1/2 z-[999] flex -translate-x-1/2 items-center gap-2 rounded-pill bg-ink px-5 py-3 text-[13px] font-semibold text-white shadow-lg ring-1 ring-inset transition-transform duration-300",
          ring,
          visible ? "translate-y-0" : "translate-y-[160%]",
        )}
      >
        <Icon className={cn("size-[15px] shrink-0", color)} strokeWidth={2.4} />
        <span>{message}</span>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast doit être utilisé dans <ToastProvider>.");
  return ctx;
}
