"use client";

import Link from "next/link";
import { Home, LayoutGrid, ScanLine, Clock, User, HelpCircle } from "lucide-react";
import { IconRail, type RailItem } from "./IconRail";

const NAV: RailItem[] = [
  { label: "Accueil", icon: Home, href: "/" },
  { label: "Paiements", icon: LayoutGrid, href: "/paiements" },
  { label: "Scanner QR", icon: ScanLine, href: "/scan" },
  { label: "Activité", icon: Clock, href: "/activite" },
  { label: "Profil", icon: User, href: "/profil" },
];

/** Rail de navigation de l'espace payeur (desktop). */
export function Sidebar({ className }: { className?: string }) {
  return (
    <IconRail
      items={NAV}
      rootHref="/"
      brandHref="/"
      className={className}
      footer={
        <>
          <Link
            href="/faq"
            aria-label="Aide"
            className="flex size-11 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <HelpCircle className="size-5" strokeWidth={2.1} />
          </Link>
          <Link
            href="/profil"
            aria-label="Profil"
            className="flex size-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--color-blue-500),var(--color-navy))] font-display text-[13px] font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            GM
          </Link>
        </>
      }
    />
  );
}
