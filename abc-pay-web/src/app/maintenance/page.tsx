"use client";

import { RotateCw, Wifi } from "lucide-react";

/**
 * Page HORS-LIGNE / MAINTENANCE — dans la charte abc pay. Affichée pendant une
 * indisponibilité planifiée, ou en repli quand le réseau est coupé. Autonome (aucune
 * donnée requise) pour rester joignable même API éteinte.
 */
export default function MaintenancePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col items-center justify-center px-6 py-12 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- logo statique */}
      <img src="/logo.png" alt="abc pay" width={40} height={40} className="mb-8 size-10 rounded-[11px] object-contain" />

      <span className="mb-6 flex size-16 items-center justify-center rounded-full bg-gray-100 text-navy">
        <Wifi className="size-8" strokeWidth={2} />
      </span>

      <h1 className="font-display text-[20px] font-extrabold text-ink">Un instant, on revient</h1>
      <p className="mt-2 max-w-[40ch] text-[13.5px] leading-relaxed text-gray-500">
        abc pay est momentanément indisponible — maintenance en cours ou connexion interrompue. Tes opérations et tes
        fonds sont en sécurité. Reviens dans quelques minutes.
      </p>

      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-7 inline-flex items-center justify-center gap-2 rounded-pill bg-grad-primary px-5 py-3 text-[13.5px] font-bold text-white shadow-[0_10px_24px_rgba(24,87,184,0.28)] transition-transform active:scale-[0.98]"
      >
        <RotateCw className="size-4" strokeWidth={2.2} /> Réessayer
      </button>

      <p className="mt-6 text-[11.5px] text-gray-400">Merci de ta patience — The Connected Money.</p>
    </main>
  );
}
