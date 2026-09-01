"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, ArrowLeftRight, Building2, Users, Percent, Plug, LifeBuoy, ShieldAlert, Star, HelpCircle, Settings, Inbox, Undo2, ShieldCheck, UserCog, LogOut, KeyRound, ScrollText,
} from "lucide-react";
import { IconRail, type RailItem } from "@/components/layout/IconRail";
import { adminCan, clearAdminToken } from "@/lib/admin-auth";

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
  { label: "Journal d'audit", icon: ScrollText, href: "/admin/audit", perm: "audit.view" },
  { label: "Paramètres", icon: Settings, href: "/admin/parametres", perm: "settings.manage" },
];

/**
 * Permission requise pour une route admin (match du préfixe le plus long).
 * `null` = route non répertoriée (ex. « Mon compte ») → non gardée.
 */
export function permForPath(pathname: string): string | null {
  const hit = [...NAV]
    .sort((a, b) => b.href.length - a.href.length)
    .find((i) => (i.href === "/admin" ? pathname === "/admin" : pathname.startsWith(i.href)));
  return hit?.perm ?? null;
}

export function AdminSidebar({ className }: { className?: string }) {
  const router = useRouter();
  // Filtre côté client (localStorage) après montage → évite tout mismatch SSR.
  const [items, setItems] = useState<RailItem[]>(NAV);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture localStorage (client only)
  useEffect(() => setItems(NAV.filter((i) => adminCan(i.perm))), []);

  const logout = () => {
    clearAdminToken();
    router.replace("/admin-connexion");
  };

  return (
    <IconRail
      items={items}
      rootHref="/admin"
      brandHref="/admin"
      className={className}
      footer={
        <>
          {/* Mon compte (mot de passe) — accessible à TOUS les rôles (page non gardée). */}
          <Link
            href="/admin/compte"
            aria-label="Mon compte"
            title="Mon compte"
            className="flex size-11 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <KeyRound className="size-5" strokeWidth={2.1} />
          </Link>
          {/* Déconnexion — TOUJOURS visible, quel que soit le rôle (pas de gate). */}
          <button
            type="button"
            onClick={logout}
            aria-label="Se déconnecter"
            title="Se déconnecter"
            className="flex size-11 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-red-50 hover:text-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <LogOut className="size-5" strokeWidth={2.1} />
          </button>
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
