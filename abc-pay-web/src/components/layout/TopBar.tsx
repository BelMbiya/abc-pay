"use client";

import { Menu, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/cn";
import { NotificationBell } from "@/components/payer/NotificationBell";

/** Barre supérieure : logo abc pay + (retour) + hamburger — cf. .topbar du MVP. */
export function TopBar({ onMenu, onBack, className }: { onMenu: () => void; onBack?: () => void; className?: string }) {
  return (
    <header className={cn("flex flex-shrink-0 items-center gap-3 border-b border-gray-100 px-5 py-4", className)}>
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Retour"
          className="flex size-9 items-center justify-center rounded-lg bg-gray-100 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <ArrowLeft className="size-[18px]" strokeWidth={2.2} />
        </button>
      ) : null}

      <div className="flex items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element -- petit logo statique fiable, taille fixe */}
        <img
          src="/logo.png"
          alt="abc pay"
          width={30}
          height={30}
          className="size-[30px] shrink-0 rounded-[9px] object-contain"
        />
        <span className="font-display text-[15.5px] font-bold text-ink">abc pay</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <NotificationBell />
        <button
          type="button"
          onClick={onMenu}
          aria-label="Ouvrir le menu"
          className="flex size-[38px] items-center justify-center rounded-xl bg-gray-100 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Menu className="size-5" strokeWidth={2.2} />
        </button>
      </div>
    </header>
  );
}
