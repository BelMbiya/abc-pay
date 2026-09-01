"use client";

import Link from "next/link";
import { RotateCw, Home, AlertTriangle } from "lucide-react";

/**
 * Erreur d'exécution (segment) — écran de secours dans la charte abc pay.
 * `reset()` retente le rendu ; `error.digest` sert de référence pour le support.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col items-center justify-center px-6 py-12 text-center">
      <span className="mb-6 flex size-16 items-center justify-center rounded-full bg-[#FDE7E8] text-red">
        <AlertTriangle className="size-8" strokeWidth={2.2} />
      </span>

      <h1 className="font-display text-[20px] font-extrabold text-ink">Une erreur est survenue</h1>
      <p className="mt-2 max-w-[40ch] text-[13.5px] leading-relaxed text-gray-500">
        Quelque chose s&apos;est mal passé de notre côté. Réessaie — si le problème persiste, contacte le support.
      </p>
      {error.digest ? (
        <p className="mt-3 rounded-pill bg-gray-100 px-3 py-1.5 text-[11.5px] font-semibold text-gray-500">
          Référence : <span className="font-bold text-gray-700">{error.digest}</span>
        </p>
      ) : null}

      <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 rounded-pill bg-grad-primary px-5 py-3 text-[13.5px] font-bold text-white shadow-[0_10px_24px_rgba(24,87,184,0.28)] transition-transform active:scale-[0.98]"
        >
          <RotateCw className="size-4" strokeWidth={2.2} /> Réessayer
        </button>
        <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-blue-600 hover:text-blue-700">
          <Home className="size-4" strokeWidth={2.2} /> Accueil
        </Link>
      </div>
    </main>
  );
}
