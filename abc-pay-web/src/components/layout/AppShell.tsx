"use client";

import { useState, type ReactNode } from "react";
import { TopBar } from "./TopBar";
import { SideMenu } from "./SideMenu";
import { Sidebar } from "./Sidebar";
import { ToastProvider } from "@/components/ui";
import { NotificationBell } from "@/components/payer/NotificationBell";

/**
 * Coquille de l'espace payeur — deux dispositions distinctes :
 *  - Mobile (< md) : barre supérieure + menu latéral coulissant (comme le MVP).
 *  - Desktop (≥ md) : rail d'icônes fixe à gauche + contenu centré (type Claude).
 * Le tout dans un ToastProvider global.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <ToastProvider>
      <div className="min-h-dvh bg-white md:flex">
        {/* Rail desktop */}
        <Sidebar className="hidden md:flex" />

        {/* Colonne principale */}
        <div className="relative flex min-h-dvh flex-1 flex-col">
          <TopBar className="md:hidden" onMenu={() => setMenuOpen(true)} />
          {/* Cloche desktop (flottante) */}
          <div className="pointer-events-none absolute right-5 top-5 z-20 hidden md:block">
            <div className="pointer-events-auto"><NotificationBell /></div>
          </div>
          <main className="flex flex-1 flex-col">{children}</main>
        </div>

        {/* Menu coulissant : mobile uniquement */}
        <div className="md:hidden">
          <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
        </div>
      </div>
    </ToastProvider>
  );
}
