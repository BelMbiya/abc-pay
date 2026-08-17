"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui";
import { fetchPaymentStatus } from "@/lib/tuition-api";

type View = "checking" | "success" | "failed";

/**
 * Page de RETOUR après paiement CinetPay. Lit ?tx=<id> et interroge le statut
 * (le statut réel est posé par le webhook) jusqu'à confirmation/échec, puis affiche
 * le résultat. Aucun secret n'est manipulé ici (le reçu complet reste dans l'activité).
 */
export default function PaiementStatutPage() {
  const router = useRouter();
  const [view, setView] = useState<View>("checking");
  const [receipt, setReceipt] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    let tries = 0;
    const poll = async () => {
      if (!active) return;
      const tx = new URLSearchParams(window.location.search).get("tx");
      if (!tx) {
        setView("failed");
        return;
      }
      try {
        const s = await fetchPaymentStatus(tx);
        if (!active) return;
        if (s.status === "confirmee") {
          setReceipt(s.receiptNumber);
          setView("success");
          return;
        }
        if (s.status === "failed") {
          setView("failed");
          return;
        }
      } catch {
        /* on retente : le webhook peut ne pas être encore arrivé */
      }
      tries += 1;
      if (tries >= 40) {
        // ~2 min sans confirmation : on laisse l'utilisateur consulter son activité.
        if (active) setView("failed");
        return;
      }
      timer = setTimeout(poll, 3000);
    };
    poll();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col items-center justify-center px-6 py-10 text-center">
      {view === "checking" ? (
        <>
          <Loader2 className="size-12 animate-spin text-blue-600" strokeWidth={2} />
          <h1 className="mt-5 font-display text-[20px] font-extrabold text-ink">Vérification du paiement…</h1>
          <p className="mt-1.5 max-w-[34ch] text-[13px] leading-relaxed text-gray-500">On confirme la transaction auprès de l&apos;opérateur. Ne ferme pas cette page.</p>
        </>
      ) : view === "success" ? (
        <>
          <span className="flex size-16 items-center justify-center rounded-full bg-success-bg text-green"><CheckCircle2 className="size-9" strokeWidth={2.2} /></span>
          <h1 className="mt-5 font-display text-[20px] font-extrabold text-ink">Paiement confirmé</h1>
          <p className="mt-1.5 text-[13px] text-gray-500">{receipt ? <>Reçu <b className="text-ink">{receipt}</b> disponible dans ton activité.</> : "Ton reçu est disponible dans ton activité."}</p>
          <Button className="mt-6 max-w-[260px]" onClick={() => router.replace("/activite")}>Voir mon activité</Button>
        </>
      ) : (
        <>
          <span className="flex size-16 items-center justify-center rounded-full bg-gray-100 text-red"><XCircle className="size-9" strokeWidth={2.2} /></span>
          <h1 className="mt-5 font-display text-[20px] font-extrabold text-ink">Paiement non confirmé</h1>
          <p className="mt-1.5 max-w-[34ch] text-[13px] leading-relaxed text-gray-500">Le paiement n&apos;a pas été confirmé, ou la confirmation prend plus de temps que prévu. Vérifie ton activité — si le montant a été débité, il y apparaîtra.</p>
          <div className="mt-6 flex flex-col gap-2">
            <Button className="max-w-[260px]" onClick={() => router.replace("/activite")}>Voir mon activité</Button>
            <button type="button" onClick={() => router.replace("/tuition")} className="text-[13px] font-bold text-blue-600">Réessayer un paiement</button>
          </div>
        </>
      )}
    </main>
  );
}
