"use client";

import Link from "next/link";
import {
  LayoutDashboard, Users, Coins, ArrowLeftRight, BellRing, Banknote, FileBarChart, Settings, HelpCircle,
} from "lucide-react";
import { IconRail, type RailItem } from "@/components/layout/IconRail";
import { establishment } from "@/lib/backoffice-data";

export const NAV: RailItem[] = [
  { label: "Tableau de bord", icon: LayoutDashboard, href: "/etablissement" },
  { label: "Apprenants", icon: Users, href: "/etablissement/apprenants" },
  { label: "Frais & barèmes", icon: Coins, href: "/etablissement/frais" },
  { label: "Paiements", icon: ArrowLeftRight, href: "/etablissement/paiements" },
  { label: "Impayés & relances", icon: BellRing, href: "/etablissement/impayes" },
  { label: "Reversements", icon: Banknote, href: "/etablissement/reversements" },
  { label: "Rapports", icon: FileBarChart, href: "/etablissement/rapports" },
  { label: "Paramètres", icon: Settings, href: "/etablissement/parametres" },
];

export function BackofficeSidebar({ className }: { className?: string }) {
  return (
    <IconRail
      items={NAV}
      rootHref="/etablissement"
      brandHref="/etablissement"
      className={className}
      footer={
        <>
          <Link
            href="/etablissement/aide"
            aria-label="Aide"
            className="flex size-11 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <HelpCircle className="size-5" strokeWidth={2.1} />
          </Link>
          <div
            aria-label={establishment.name}
            className="bg-grad-navy flex size-10 items-center justify-center rounded-xl font-display text-[12px] font-bold text-white"
          >
            {establishment.short.slice(0, 2)}
          </div>
        </>
      }
    />
  );
}
