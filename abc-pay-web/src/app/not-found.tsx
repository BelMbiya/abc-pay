import Link from "next/link";
import { Home, Compass } from "lucide-react";

/** 404 — page introuvable, dans la charte abc pay (navy/bleu/or, Sora/Inter). */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col items-center justify-center px-6 py-12 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- logo statique */}
      <img src="/logo.png" alt="abc pay" width={40} height={40} className="mb-8 size-10 rounded-[11px] object-contain" />

      <p className="bg-grad-primary bg-clip-text font-display text-[76px] font-extrabold leading-none text-transparent sm:text-[92px]">404</p>
      <h1 className="mt-4 font-display text-[20px] font-extrabold text-ink">Page introuvable</h1>
      <p className="mt-2 max-w-[38ch] text-[13.5px] leading-relaxed text-gray-500">
        La page que tu cherches n&apos;existe pas, a été déplacée, ou le lien est incorrect.
      </p>

      <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-pill bg-grad-primary px-5 py-3 text-[13.5px] font-bold text-white shadow-[0_10px_24px_rgba(24,87,184,0.28)] transition-transform active:scale-[0.98]"
        >
          <Home className="size-4" strokeWidth={2.2} /> Retour à l&apos;accueil
        </Link>
        <Link href="/paiements" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-blue-600 hover:text-blue-700">
          <Compass className="size-4" strokeWidth={2.2} /> Voir les paiements
        </Link>
      </div>
    </main>
  );
}
