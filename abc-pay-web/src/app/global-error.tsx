"use client";

import "./globals.css";

/**
 * Erreur CRITIQUE au niveau racine (le layout lui-même a échoué) — remplace tout le
 * document, donc fournit ses propres <html>/<body>. Volontairement minimal et autonome
 * (les polices next/font ne sont plus injectées ici → pile système).
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
        <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col items-center justify-center px-6 py-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-navy text-white">
            <span className="text-[20px] font-extrabold">!</span>
          </div>
          <h1 className="mt-6 text-[20px] font-extrabold text-ink">Service momentanément indisponible</h1>
          <p className="mt-2 max-w-[40ch] text-[13.5px] leading-relaxed text-gray-500">
            Une erreur inattendue a interrompu l&apos;application. Recharge la page — si cela persiste, réessaie dans un instant.
          </p>
          {error.digest ? (
            <p className="mt-3 rounded-pill bg-gray-100 px-3 py-1.5 text-[11.5px] font-semibold text-gray-500">
              Référence : <span className="font-bold text-gray-700">{error.digest}</span>
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            className="mt-7 inline-flex items-center justify-center gap-2 rounded-pill bg-grad-primary px-5 py-3 text-[13.5px] font-bold text-white shadow-[0_10px_24px_rgba(24,87,184,0.28)]"
          >
            Recharger
          </button>
        </main>
      </body>
    </html>
  );
}
