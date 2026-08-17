"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard, ArrowLeftRight, Building2, Users, Percent, Plug, LifeBuoy, ShieldAlert, Star, HelpCircle, Settings, Inbox, Undo2, ShieldCheck, UserCog,
} from "lucide-react";
import { IconRail, type RailItem } from "@/components/layout/IconRail";
import { adminCan } from "@/lib/admin-auth";

/** Navigation admin avec la PERMISSION requise pour chaque entrée (RBAC). */
export const NAV: (RailItem & { perm: string })[] = [
  { label: "Vue d'ensemble", icon: LayoutDashboard, href: "/admin", perm: "dashboard.view" },
  { label: "Transactions", icon: ArrowLeftRight, href: "/admin/transactions", perm: "transactions.view" },
  { label: "Remboursements", icon: Undo2, href: "/admin/remboursements", perm: "refunds.manage" },
  { label: "Établissements", icon: Building2, href: "/admin/etablissements", perm: "establishments.manage" },
  { label: "Utilisateurs", icon: Users, href: "/admin/utilisateurs", perm: "users.manage" },
  { label: "Vérification KYC", icon: ShieldCheck, href: "/admin/kyc", perm: "kyc.review" },
  { label: "Commissions", icon: Percent, href: "/admin/commissions", perm: "commissions.manage" },
  { label: "Intégrations opérateurs", icon: Plug, href: "/admin/integrations", perm: "settings.manage" },
  { label: "Support & litiges", icon: LifeBuoy, href: "/admin/litiges", perm: "support.manage" },
  { label: "Demandes de démo", icon: Inbox, href: "/admin/demandes", perm: "leads.manage" },
  { label: "Avis", icon: Star, href: "/admin/avis", perm: "reviews.moderate" },
  { label: "FAQ", icon: HelpCircle, href: "/admin/faq", perm: "faq.manage" },
  { label: "Fraude", icon: ShieldAlert, href: "/admin/fraude", perm: "fraud.manage" },
  { label: "Administrateurs", icon: UserCog, href: "/admin/administrateurs", perm: "admins.manage" },
  { label: "Paramètres", icon: Settings, href: "/admin/parametres", perm: "settings.manage" },
];

export function AdminSidebar({ className }: { className?: string }) {
  // Filtre côté client (localStorage) après montage → évite tout mismatch SSR.
  const [items, setItems] = useState<RailItem[]>(NAV);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture localStorage (client only)
  useEffect(() => setItems(NAV.filter((i) => adminCan(i.perm))), []);

  return (
    <IconRail
      items={items}
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
