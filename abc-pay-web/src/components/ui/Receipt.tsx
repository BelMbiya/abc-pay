import type { ReactNode } from "react";

/** Reçu (montant + lignes + badge de statut). `status` par défaut « PAYÉ » ;
 *  passer « ENVOYÉ » / « REÇU » / « RETIRÉ » selon le type d'opération. */
export function Receipt({
  amount,
  rows,
  status = "PAYÉ",
}: {
  amount: string;
  rows: { label: ReactNode; value: ReactNode }[];
  status?: string;
}) {
  return (
    <div className="mt-3.5 rounded-3xl bg-gray-100 p-[18px]">
      <div className="mb-2.5 border-b-[1.5px] border-dashed border-gray-300 pb-3.5 text-center">
        <b className="font-display text-[26px] font-extrabold text-ink">{amount}</b>
        <div>
          <span className="mt-2 inline-block rounded-pill bg-success-bg px-2.5 py-1 text-[10px] font-extrabold tracking-wide text-green">
            {status}
          </span>
        </div>
      </div>
      {rows.map((r, i) => (
        <div key={i} className="flex justify-between gap-3 py-1.5 text-[11.5px]">
          <span className="text-gray-500">{r.label}</span>
          <span className="text-right font-bold text-ink">{r.value}</span>
        </div>
      ))}
    </div>
  );
}
