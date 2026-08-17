import type { ReactNode } from "react";
import Link from "next/link";

/**
 * Layout des pages STATIQUES / informatives (conditions, confidentialité, FAQ,
 * tarification, remboursement, à propos…). Publiques : accessibles depuis la landing,
 * SANS espace connecté (ni AuthGate ni AppShell). Chaque page porte son propre InfoHeader.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <header className="border-b border-gray-100">
        <div className="mx-auto flex w-full max-w-[960px] items-center justify-between px-5 py-3.5">
          <Link href="/bienvenue" aria-label="ABC Pay — accueil" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo statique */}
            <img src="/logo.png" alt="abc pay" width={32} height={32} className="size-8 rounded-lg" />
            <span className="font-display text-[15px] font-extrabold tracking-tight text-ink">abc pay</span>
          </Link>
          <Link href="/bienvenue" className="text-[12.5px] font-bold text-blue-600 hover:underline">Retour au site</Link>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
