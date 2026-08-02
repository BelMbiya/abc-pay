"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  X, Home, LayoutGrid, ScanLine, Clock, User,
  ShieldCheck, Workflow, Percent, HelpCircle, FileText, Lock, LogOut,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

interface Item {
  label: string;
  icon: LucideIcon;
  href: string;
  primary?: boolean;
  highlight?: boolean;
}

// Structure du menu reprise à l'identique du MVP.
const GROUPS: { label?: string; items: Item[] }[] = [
  {
    items: [
      { label: "Accueil", icon: Home, href: "/", primary: true },
      { label: "Paiements", icon: LayoutGrid, href: "/paiements", primary: true },
      { label: "Scanner QR", icon: ScanLine, href: "/scan", primary: true, highlight: true },
      { label: "Activité / Historique", icon: Clock, href: "/activite", primary: true },
      { label: "Profil", icon: User, href: "/profil", primary: true },
    ],
  },
  {
    label: "Découvrir abc pay",
    items: [
      { label: "Pourquoi abc pay", icon: ShieldCheck, href: "/pourquoi" },
      { label: "Comment ça marche", icon: Workflow, href: "/comment-ca-marche" },
      { label: "Tarification", icon: Percent, href: "/tarification" },
    ],
  },
  {
    label: "Aide & légal",
    items: [
      { label: "FAQ · Aide", icon: HelpCircle, href: "/faq" },
      { label: "Conditions d'utilisation", icon: FileText, href: "/conditions" },
      { label: "Confidentialité", icon: Lock, href: "/confidentialite" },
    ],
  },
];

/** Menu latéral coulissant + backdrop — cf. .menu-panel/.menu-backdrop du MVP. */
export function SideMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden={!open}
        className={cn(
          "fixed inset-0 z-[70] bg-navy/50 transition-opacity duration-250",
          open ? "visible opacity-100" : "invisible opacity-0",
        )}
      />
      {/* Panneau */}
      <nav
        aria-label="Menu principal"
        className={cn(
          "fixed inset-y-0 right-0 z-[80] w-[78vw] max-w-[300px] overflow-y-auto bg-white p-[18px] shadow-panel transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="mb-2.5 flex items-center justify-between">
          <span className="font-display text-[14.5px] font-bold">Menu</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le menu"
            className="flex size-[34px] items-center justify-center rounded-[10px] bg-gray-100 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <X className="size-[18px]" strokeWidth={2.2} />
          </button>
        </div>

        {GROUPS.map((group, gi) => (
          <div key={gi}>
            {group.label ? (
              <div className="px-3 pb-1 pt-3 text-[9.5px] font-extrabold uppercase tracking-[0.07em] text-gray-300">
                {group.label}
              </div>
            ) : null}
            {group.items.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold text-ink transition-colors hover:bg-gray-100",
                    item.primary && "font-bold",
                    item.highlight && "bg-grad-gold my-1 text-gold-ink hover:opacity-95",
                    active && !item.highlight && "bg-gray-100",
                  )}
                >
                  <Icon className={cn("size-4", item.highlight ? "text-gold-ink" : "text-gray-500")} strokeWidth={2} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}

        <div className="my-2 h-px bg-gray-100" />
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold text-red transition-colors hover:bg-gray-100"
        >
          <LogOut className="size-4 text-red" strokeWidth={2} />
          Déconnexion
        </button>
      </nav>
    </>
  );
}
