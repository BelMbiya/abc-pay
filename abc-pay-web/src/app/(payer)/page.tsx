"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Smartphone, CreditCard, ShieldCheck, ArrowUpRight, ArrowDownLeft, Receipt, GraduationCap } from "lucide-react";
import { ActionTile, TrustChip } from "@/components/ui";
import { SendSheet } from "@/components/payer/SendSheet";
import { ReceiveSheet } from "@/components/payer/ReceiveSheet";

/**
 * Accueil de l'espace payeur.
 *  - Mobile : bloc de bienvenue + grille 2×2 (comme le MVP).
 *  - Desktop : contenu centré (vertical + horizontal), les 4 actions au centre
 *    — la disposition « composer » de Claude, adaptée à abc pay.
 */
export default function HomePage() {
  const router = useRouter();
  const [sheet, setSheet] = useState<"send" | "receive" | null>(null);

  return (
    <div className="flex flex-1 flex-col md:items-center md:justify-center">
      <div className="mx-auto w-full max-w-app px-5 py-6 md:py-12 md:text-center">
        {/* Bienvenue */}
        <span className="text-[11px] font-extrabold uppercase tracking-[0.09em] text-blue-600">
          The Connected Money
        </span>
        <h1 className="mt-2.5 font-display text-[21px] font-extrabold tracking-tight text-ink md:text-[28px]">
          Bonjour et bienvenue sur abc pay
        </h1>
        <p className="mt-1.5 max-w-[360px] text-[13.5px] leading-relaxed text-gray-500 md:mx-auto">
          Plus qu&apos;une passerelle : abc pay facilite tes paiements du quotidien. Choisis une
          action ci-dessous et passe à l&apos;action en quelques secondes.
        </p>

        <div className="mt-4 flex flex-wrap gap-2 md:justify-center">
          <TrustChip icon={Smartphone}>M-Pesa, Orange, Airtel &amp; Afrimoney</TrustChip>
          <TrustChip icon={CreditCard}>Visa &amp; Mastercard</TrustChip>
          <TrustChip icon={ShieldCheck}>100% Sécurisé &amp; Instantané</TrustChip>
        </div>

        {/* Grille des 4 actions (au centre sur desktop) */}
        <div className="mx-auto mt-6 grid grid-cols-2 gap-3.5 md:mt-8 md:max-w-[460px]">
          <ActionTile label="Envoyer" icon={ArrowUpRight} tone="send" onClick={() => setSheet("send")} />
          <ActionTile label="Recevoir" icon={ArrowDownLeft} tone="receive" onClick={() => setSheet("receive")} />
          <ActionTile label="Payer" icon={Receipt} tone="pay" onClick={() => router.push("/paiements")} />
          <ActionTile label="Tuitionner" icon={GraduationCap} tone="tuition" badge="Nouveau" onClick={() => router.push("/tuition")} />
        </div>

        <footer className="pb-1.5 pt-6 text-center">
          <p className="text-[10.5px] text-gray-300">abc pay © 2026 — Tous droits réservés.</p>
        </footer>
      </div>

      <SendSheet open={sheet === "send"} onClose={() => setSheet(null)} />
      <ReceiveSheet open={sheet === "receive"} onClose={() => setSheet(null)} />
    </div>
  );
}
