/** En-tête des pages d'information / légales (titre seul — la navigation est portée
 *  par le layout public « Retour au site »). */
export function InfoHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h1 className="font-display text-[18px] font-extrabold tracking-tight text-ink">{title}</h1>
      {subtitle ? <p className="mt-0.5 text-[12px] text-gray-500">{subtitle}</p> : null}
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
