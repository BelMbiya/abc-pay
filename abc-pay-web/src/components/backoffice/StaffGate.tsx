"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { hasSession, ensureFreshAccess } from "@/lib/refresh";
import { getStaffUser } from "@/lib/staff-auth";
import { fetchStaffKyc } from "@/lib/kyc-api";
import { StaffKycWall } from "@/components/backoffice/StaffKycWall";
import { StaffPasswordWall } from "@/components/backoffice/StaffPasswordWall";

/** Protège le back-office : connexion requise, puis vérification KYC pour les comptes qui l'exigent. */
export function StaffGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [mustChangePw, setMustChangePw] = useState(false);
  const [gated, setGated] = useState(false);
  const [kycStatus, setKycStatus] = useState<string>("none");
  const [rejectReason, setRejectReason] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!hasSession("staff")) {
        router.replace("/etablissement-connexion");
        if (active) setReady(true);
        return;
      }
      await ensureFreshAccess("staff");
      if (!active) return;
      setAuthed(true);

      // Gate 1 — mot de passe : 1re connexion → changement obligatoire avant tout.
      if (getStaffUser()?.must_change_password) {
        setMustChangePw(true);
        setReady(true);
        return;
      }

      // Gate 2 — KYC : les comptes marqués « vérification requise » ne passent qu'une fois approuvés.
      if (getStaffUser()?.kyc_required) {
        try {
          const k = await fetchStaffKyc();
          if (active && k.kyc_status !== "approved") {
            setKycStatus(k.kyc_status);
            setRejectReason(k.reject_reason);
            setGated(true);
          }
        } catch {
          /* statut indisponible : on laisse passer plutôt que de bloquer à tort */
        }
      }
      if (active) setReady(true);
    })();
    return () => { active = false; };
  }, [router]);

  if (!ready || !authed) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element -- logo statique */}
        <img src="/logo.png" alt="abc pay" width={44} height={44} className="size-11 animate-pulse rounded-xl" />
      </div>
    );
  }

  if (mustChangePw) {
    return <StaffPasswordWall onDone={() => window.location.reload()} />;
  }

  if (gated) {
    return <StaffKycWall status={kycStatus} rejectReason={rejectReason} onSubmitted={(rec) => setKycStatus(rec.kyc_status)} />;
  }

  return <>{children}</>;
}
