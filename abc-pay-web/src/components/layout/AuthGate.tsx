"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

/** Protège l'espace payeur : redirige vers /bienvenue si non authentifié. */
export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { ready, token } = useAuth();

  useEffect(() => {
    if (ready && !token) router.replace("/bienvenue");
  }, [ready, token, router]);

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
