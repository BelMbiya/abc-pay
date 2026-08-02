"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "send" | "receive" | "pay" | "tuition";

const tones: Record<Tone, { grad: string; shadow: string }> = {
  send: { grad: "bg-grad-send", shadow: "shadow-[0_10px_24px_rgba(229,72,77,0.34)]" },
  receive: { grad: "bg-grad-receive", shadow: "shadow-[0_10px_24px_rgba(224,142,0,0.32)]" },
  pay: { grad: "bg-grad-pay", shadow: "shadow-[0_10px_24px_rgba(229,104,10,0.32)]" },
  tuition: { grad: "bg-grad-tuition", shadow: "shadow-[0_10px_24px_rgba(14,134,212,0.34)]" },
};

/** Grande tuile d'action de l'accueil (dégradé + icône + label) — cf. .action-btn. */
export function ActionTile({
  label,
  icon: Icon,
  tone,
  badge,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  tone: Tone;
  badge?: string;
  onClick?: () => void;
}) {
  const t = tones[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "relative flex aspect-[1/0.86] flex-col items-center justify-center gap-3 rounded-4xl p-4 text-white",
        "transition-transform duration-150 active:scale-[0.96]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
        t.grad,
        t.shadow,
      )}
    >
      {badge ? (
        <span className="absolute right-2.5 top-2.5 rounded-pill bg-gold-400 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide text-gold-ink shadow-[0_3px_8px_rgba(224,142,0,0.4)]">
          {badge}
        </span>
      ) : null}
      <span className="flex size-[50px] items-center justify-center rounded-[15px] bg-white/25">
        <Icon className="size-6 text-white" strokeWidth={2.2} />
      </span>
      <span className="font-display text-[15.5px] font-extrabold tracking-tight">{label}</span>
    </button>
  );
}
