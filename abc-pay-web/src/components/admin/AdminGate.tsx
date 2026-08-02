"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { hasSession, ensureFreshAccess } from "@/lib/refresh";

/** Protège l'espace super-admin : redirige vers la connexion admin si non authentifié. */
export function AdminGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!hasSession("admin")) {
        router.replace("/admin-connexion");
      } else {
        await ensureFreshAccess("admin");
        if (active) setAuthed(true);
      }
      if (active) setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [router]);

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
