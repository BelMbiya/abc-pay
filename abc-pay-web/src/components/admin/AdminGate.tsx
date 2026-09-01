"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { hasSession, ensureFreshAccess } from "@/lib/refresh";
import { getAdminUser, refreshAdminPermissions, adminCan } from "@/lib/admin-auth";
import { permForPath } from "@/components/admin/AdminSidebar";
import { AdminPasswordWall } from "@/components/admin/AdminPasswordWall";

/** Protège l'espace super-admin : redirige vers la connexion admin si non authentifié. */
export function AdminGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [mustChangePw, setMustChangePw] = useState(false);

  // Garde RBAC par ROUTE (défense en profondeur) : une fois authentifié + permissions
  // connues, si l'admin n'a pas la permission de la page atteinte (URL directe incluse),
  // on le renvoie au tableau de bord (accessible à tous les rôles). L'API reste l'autorité.
  useEffect(() => {
    if (!authed) return;
    const perm = permForPath(pathname);
    if (perm && !adminCan(perm)) router.replace("/admin");
  }, [authed, pathname, router]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!hasSession("admin")) {
        router.replace("/admin-connexion");
      } else {
        await ensureFreshAccess("admin");
        if (!active) return;
        if (getAdminUser()?.must_change_password) {
          setMustChangePw(true);
        } else {
          // Récupère les permissions à jour AVANT de rendre le shell (nav filtrée correctement,
          // y compris pour les anciennes sessions ouvertes avant le RBAC). Best-effort.
          try { await refreshAdminPermissions(); } catch { /* l'affichage reste permissif */ }
        }
        if (active) setAuthed(true);
      }
      if (active) setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [router]);

  if (ready && authed && mustChangePw) {
    return <AdminPasswordWall onDone={() => window.location.reload()} />;
  }

  if (!ready || !authed) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element -- logo statique */}
        <img src="/logo.png" alt="abc pay" width={44} height={44} className="size-11 animate-pulse rounded-xl" />
      </div>
    );
  }

  return <>{children}</>;
}
