"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard, Coins, ArrowLeftRight, Undo2, Banknote, FileBarChart, Settings, HelpCircle, ShieldCheck,
} from "lucide-react";
import { IconRail, type RailItem } from "@/components/layout/IconRail";
import { getStaffUser } from "@/lib/staff-auth";

export const NAV: RailItem[] = [
  { label: "Tableau de bord", icon: LayoutDashboard, href: "/etablissement" },
  { label: "Frais & barèmes", icon: Coins, href: "/etablissement/frais" },
  { label: "Paiements", icon: ArrowLeftRight, href: "/etablissement/paiements" },
  { label: "Remboursements", icon: Undo2, href: "/etablissement/remboursements" },
  { label: "Reversements", icon: Banknote, href: "/etablissement/reversements" },
  { label: "Rapports", icon: FileBarChart, href: "/etablissement/rapports" },
  { label: "Documents", icon: ShieldCheck, href: "/etablissement/documents" },
  { label: "Paramètres", icon: Settings, href: "/etablissement/parametres" },
];

/** Initiales d'un établissement : privilégie l'acronyme entre parenthèses (UNIKIN → UN),
 * sinon les premières lettres des deux premiers mots significatifs. */
function establishmentInitials(name: string): string {
  const acronym = name.match(/\(([A-Za-zÀ-ÿ]{2,})\)/);
  if (acronym) return acronym[1].slice(0, 2).toUpperCase();
  const words = name.replace(/\(.*?\)/g, "").trim().split(/\s+/).filter((w) => w.length > 2);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? words[0]?.[1] ?? "")).toUpperCase() || "ÉT";
}

export function BackofficeSidebar({ className }: { className?: string }) {
  const [estName, setEstName] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- init depuis localStorage (client)
  useEffect(() => setEstName(getStaffUser()?.establishment_name ?? null), []);

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
            aria-label={estName ?? "Établissement"}
            title={estName ?? undefined}
            className="bg-grad-navy flex size-10 items-center justify-center rounded-xl font-display text-[12px] font-bold text-white"
          >
            {estName ? establishmentInitials(estName) : "ÉT"}
          </div>
        </>
      }
    />
  );
}
