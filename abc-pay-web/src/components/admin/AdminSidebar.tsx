"use client";

import Link from "next/link";
import {
  LayoutDashboard, Building2, Users, Percent, Plug, LifeBuoy, ShieldAlert, Settings, HelpCircle,
} from "lucide-react";
import { IconRail, type RailItem } from "@/components/layout/IconRail";

export const NAV: RailItem[] = [
  { label: "Vue d'ensemble", icon: LayoutDashboard, href: "/admin" },
  { label: "Établissements", icon: Building2, href: "/admin/etablissements" },
  { label: "Utilisateurs", icon: Users, href: "/admin/utilisateurs" },
  { label: "Commissions", icon: Percent, href: "/admin/commissions" },
  { label: "Intégrations opérateurs", icon: Plug, href: "/admin/integrations" },
  { label: "Support & litiges", icon: LifeBuoy, href: "/admin/litiges" },
  { label: "Fraude", icon: ShieldAlert, href: "/admin/fraude" },
  { label: "Paramètres", icon: Settings, href: "/admin/parametres" },
];

export function AdminSidebar({ className }: { className?: string }) {
  return (
    <IconRail
      items={NAV}
      rootHref="/admin"
      brandHref="/admin"
      className={className}
      footer={
        <>
          <Link
            href="/admin"
            aria-label="Aide"
            className="flex size-11 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <HelpCircle className="size-5" strokeWidth={2.1} />
          </Link>
          <div
            aria-label="Équipe abc pay"
            className="bg-grad-gold flex size-10 items-center justify-center rounded-xl font-display text-[11px] font-extrabold text-gold-ink"
          >
            HQ
          </div>
        </>
      }
    />
  );
}
