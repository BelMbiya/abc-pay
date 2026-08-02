"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/** En-tête des pages d'information / légales (retour + titre). */
export function InfoHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const router = useRouter();
  return (
    <div className="mb-5 flex items-center gap-3">
      <button
        type="button"
        onClick={() => router.push("/")}
        aria-label="Retour à l'accueil"
        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <ArrowLeft className="size-[18px]" strokeWidth={2.2} />
      </button>
      <div className="min-w-0">
        <h1 className="font-display text-[18px] font-extrabold tracking-tight text-ink">{title}</h1>
        {subtitle ? <p className="text-[12px] text-gray-500">{subtitle}</p> : null}
      </div>
    </div>
  );
}

/** Article de document légal (titre + paragraphe). */
export function LegalArticle({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <article className="border-t border-gray-100 py-3.5 first:border-t-0 first:pt-0">
      <h2 className="mb-1.5 text-[13.5px] font-bold text-ink">{heading}</h2>
      <p className="text-[12.5px] leading-relaxed text-gray-500">{children}</p>
    </article>
  );
}
