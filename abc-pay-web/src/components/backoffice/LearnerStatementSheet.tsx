"use client";

import { Printer } from "lucide-react";
import { BottomSheet, Button } from "@/components/ui";
import type { LearnerStatement } from "@/lib/learners-api";

function money(n: number, sym: string): string {
  return `${n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${sym}`;
}

/** Relevé de compte d'un apprenant — affichable et imprimable (Enregistrer en PDF). */
export function LearnerStatementSheet({ statement, onClose }: { statement: LearnerStatement | null; onClose: () => void }) {
  const s = statement;
  const sym = s?.establishment.currency === "CDF" ? "FC" : "$";
  const generated = s ? new Date(s.generated_at).toLocaleString("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <BottomSheet open={s !== null} onClose={onClose} title="Relevé de compte">
      {s ? (
        <>
          <div id="abc-statement-print" className="text-[12.5px] text-ink">
            {/* En-tête */}
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
              <div>
                <p className="font-display text-[16px] font-extrabold text-blue-600">{s.establishment.name ?? "abc pay"}</p>
                <p className="text-[11px] text-gray-500">{s.establishment.city ?? ""}</p>
              </div>
              <div className="text-right">
                <p className="font-display text-[13px] font-bold text-ink">Relevé de compte</p>
                <p className="text-[10.5px] text-gray-500">Généré le {generated}</p>
              </div>
            </div>

            {/* Identité apprenant */}
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
              {[
                { l: "Apprenant", v: s.learner.name },
                { l: "Matricule", v: s.learner.matricule ?? "—" },
                { l: "Promotion / Niveau", v: s.learner.academic_group ?? "—" },
                { l: "Réf. abc pay", v: s.learner.abcpay_ref ?? "—" },
                { l: "Parent / tuteur", v: s.learner.parent_name ?? "—" },
                { l: "Téléphone", v: s.learner.parent_phone ?? "—" },
              ].map((r) => (
                <div key={r.l} className="flex justify-between gap-2">
                  <span className="text-gray-500">{r.l}</span>
                  <span className="font-bold text-ink">{r.v}</span>
                </div>
              ))}
            </div>

            {/* Postes de frais */}
            <p className="mb-1.5 mt-4 text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-blue-600">Frais</p>
            <div className="overflow-hidden rounded-xl border border-gray-100">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr className="bg-gray-100 text-left text-[10.5px] uppercase tracking-wide text-gray-500">
                    <th className="px-3 py-2">Poste</th>
                    <th className="px-3 py-2 text-right">Dû</th>
                    <th className="px-3 py-2 text-right">Payé</th>
                    <th className="px-3 py-2 text-right">Solde</th>
                  </tr>
                </thead>
                <tbody>
                  {s.fees.length === 0 ? (
                    <tr><td colSpan={4} className="px-3 py-3 text-center text-gray-500">Aucun poste de frais.</td></tr>
                  ) : (
                    s.fees.map((f, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="px-3 py-2 font-bold text-ink">{f.label}</td>
                        <td className="px-3 py-2 text-right text-gray-700">{money(f.due, sym)}</td>
                        <td className="px-3 py-2 text-right text-green">{money(f.paid, sym)}</td>
                        <td className={`px-3 py-2 text-right font-bold ${f.balance > 0 ? "text-gold-600" : "text-ink"}`}>{money(f.balance, sym)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-100 bg-gray-100 font-bold">
                    <td className="px-3 py-2 text-ink">Total</td>
                    <td className="px-3 py-2 text-right text-ink">{money(s.totals.due, sym)}</td>
                    <td className="px-3 py-2 text-right text-green">{money(s.totals.paid, sym)}</td>
                    <td className={`px-3 py-2 text-right ${s.totals.balance > 0 ? "text-gold-600" : "text-green"}`}>{money(s.totals.balance, sym)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Historique des paiements */}
            <p className="mb-1.5 mt-4 text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-blue-600">Paiements encaissés</p>
            {s.payments.length === 0 ? (
              <p className="rounded-xl bg-gray-100 px-3 py-3 text-center text-gray-500">Aucun paiement pour l&apos;instant.</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-100">
                <table className="w-full border-collapse text-[12px]">
                  <thead>
                    <tr className="bg-gray-100 text-left text-[10.5px] uppercase tracking-wide text-gray-500">
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Frais</th>
                      <th className="px-3 py-2">Reçu</th>
                      <th className="px-3 py-2 text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.payments.map((p, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="px-3 py-2 text-gray-700">{p.date ?? "—"}</td>
                        <td className="px-3 py-2 text-ink">{p.fee_type ?? "—"}</td>
                        <td className="px-3 py-2 text-gray-500">{p.receipt ?? "—"}</td>
                        <td className="px-3 py-2 text-right font-bold text-ink">{money(p.amount, sym)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className="mt-4 text-[10px] leading-relaxed text-gray-500">Document généré par abc pay — The Connected Money. Les montants sont exprimés en {s.establishment.currency}.</p>
          </div>

          <div className="mt-5 no-print">
            <Button fullWidth icon={Printer} onClick={() => window.print()}>Imprimer / Enregistrer en PDF</Button>
          </div>
        </>
      ) : null}
    </BottomSheet>
  );
}
