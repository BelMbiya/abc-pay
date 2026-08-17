"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

/**
 * Pages de l'espace payeur accessibles SANS compte : le scan d'un QR (une
 * affiche/QR doit s'ouvrir sans être connecté ; le paiement lui-même, sur
 * /tuition, exige désormais un compte).
 */
const PUBLIC_PREFIXES = ["/scan"];

/** Protège l'espace payeur : redirige vers /bienvenue si non authentifié
 *  (sauf sur les pages publiques ci-dessus). */
export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { ready, token } = useAuth();
  const pathname = usePathname();
  const isPublic = PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => {
    if (!isPublic && ready && !token) router.replace("/bienvenue");
  }, [isPublic, ready, token, router]);

  // Paiement public : on rend directement, connecté ou non.
  if (isPublic) {
    return <>{children}</>;
  }

  if (!ready || !token) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element -- logo statique */}
        <img src="/logo.png" alt="abc pay" width={44} height={44} className="size-11 animate-pulse rounded-xl" />
      </div>
    );
  }

  return <>{children}</>;
}
