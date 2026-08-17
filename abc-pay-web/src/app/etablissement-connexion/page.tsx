"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * La connexion établissement est désormais unifiée avec la connexion particulier
 * (un seul écran + toggle). On redirige vers /connexion avec l'onglet Établissement
 * pré-sélectionné, pour préserver les liens entrants existants.
 */
export default function StaffLoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/connexion?espace=etablissement");
  }, [router]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element -- logo statique */}
      <img src="/logo.png" alt="abc pay" width={40} height={40} className="size-10 animate-pulse rounded-xl" />
    </main>
  );
}
