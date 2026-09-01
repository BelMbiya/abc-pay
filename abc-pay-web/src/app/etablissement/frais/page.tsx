"use client";

import { useEffect, useState } from "react";
import { Plus, Coins, FileSpreadsheet, Download, Pencil, Trash2 } from "lucide-react";
import { Button, StatusPill, Pagination, usePagination } from "@/components/ui";
import { PageHeader } from "@/components/backoffice/StatCard";
import { AddFeeTypeSheet } from "@/components/backoffice/AddFeeTypeSheet";
import { AddScheduleSheet } from "@/components/backoffice/AddScheduleSheet";
import { fmt, ApiError } from "@/lib/api";
import { feeTypes as mockFeeTypes } from "@/lib/backoffice-data";
import { fetchFeeTypes, fetchFeeSchedules, updateFeeSchedule, deleteFeeSchedule, deleteFeeType, type ApiFeeType, type ApiFeeSchedule } from "@/lib/billing-api";

type FeeTypeVM = { id?: string; name: string; frequency: string; optional: boolean };

export default function FraisPage() {
  const [types, setTypes] = useState<FeeTypeVM[]>(mockFeeTypes);
  const [schedules, setSchedules] = useState<ApiFeeSchedule[]>([]);
  const [typeSheet, setTypeSheet] = useState(false);
  const [scheduleSheet, setScheduleSheet] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchFeeTypes().then((l) => alive && l.length && setTypes(l)).catch(() => {});
    fetchFeeSchedules().then((l) => alive && setSchedules(l)).catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Types réels (avec id) pour le barème.
  const apiTypes: ApiFeeType[] = types.filter((t): t is ApiFeeType => Boolean(t.id));

  const { page, setPage, pageItems, total, totalPages, pageSize } = usePagination(schedules);

  const fail = (e: unknown, fallback: string) => window.alert(e instanceof ApiError ? (Object.values(e.fields ?? {})[0]?.[0] ?? e.message) : fallback);

  const editAmount = async (r: ApiFeeSchedule) => {
    const v = window.prompt(`Nouveau montant pour « ${r.fee_type} — ${r.group} » :`, String(r.amount));
    if (v === null) return;
    const amount = Number(v);
    if (!amount || amount <= 0) { window.alert("Montant invalide."); return; }
    try {
      const up = await updateFeeSchedule(r.id, { amount });
      setSchedules((prev) => prev.map((s) => (s.id === r.id ? up : s)));
    } catch (e) { fail(e, "Modification impossible."); }
  };

  const removeSchedule = async (r: ApiFeeSchedule) => {
    if (!window.confirm(`Supprimer la ligne « ${r.fee_type} — ${r.group} » ? Les postes déjà payés sont conservés.`)) return;
    try { await deleteFeeSchedule(r.id); setSchedules((prev) => prev.filter((s) => s.id !== r.id)); }
    catch (e) { fail(e, "Suppression impossible."); }
  };

  const removeType = async (t: ApiFeeType) => {
    if (!window.confirm(`Supprimer le type de frais « ${t.name} » ?`)) return;
    try { await deleteFeeType(t.id); setTypes((prev) => prev.filter((x) => x.id !== t.id)); }
    catch (e) { fail(e, "Suppression impossible."); }
  };

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 py-6 md:px-8 md:py-8">
      <PageHeader
        title="Frais & barèmes"
        subtitle="Types de frais et barème par promotion"
        actions={<Button fullWidth={false} icon={Plus} onClick={() => setTypeSheet(true)}>Ajouter un frais</Button>}
      />

      {/* Gabarit Excel de réconciliation des soldes */}
      <div className="mb-6 flex flex-col gap-3 rounded-2xl bg-blue-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600">
            <FileSpreadsheet className="size-[18px]" strokeWidth={2} />
          </span>
          <div>
            <h3 className="text-[13px] font-bold text-blue-700">Réconcilier les soldes de vos apprenants</h3>
            <p className="text-[11.5px] leading-relaxed text-blue-700/80">
              Téléchargez le gabarit Excel, remplissez-le (une ligne par apprenant et type de frais), puis importez-le.
            </p>
          </div>
        </div>
        <a
          href="/modeles/gabarit-reconciliation-abc-tuition.xlsx"
          download
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-pill bg-white px-4 py-2.5 text-[12.5px] font-bold text-blue-700 hover:bg-blue-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Download className="size-4" strokeWidth={2.2} />
          Télécharger le gabarit
        </a>
      </div>

      {/* Types de frais */}
      <h2 className="mb-3 font-display text-[14px] font-bold text-ink">Types de frais</h2>
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {types.map((t) => (
          <div key={t.id ?? t.name} className="rounded-2xl bg-gray-100 p-4">
            <span className="mb-2.5 flex size-9 items-center justify-center rounded-xl bg-white text-blue-600">
              <Coins className="size-[17px]" strokeWidth={2} />
            </span>
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-[13px] font-bold text-ink">{t.name}</h3>
              <div className="flex items-center gap-1.5">
                {t.optional ? <StatusPill tone="gold">Optionnel</StatusPill> : null}
                {t.id ? (
                  <button type="button" aria-label="Supprimer le type" title="Supprimer le type" onClick={() => removeType(t as ApiFeeType)} className="flex size-7 items-center justify-center rounded-lg bg-white text-red hover:opacity-80">
                    <Trash2 className="size-3.5" strokeWidth={2.2} />
                  </button>
                ) : null}
              </div>
            </div>
            <p className="mt-1 text-[11.5px] capitalize text-gray-500">{t.frequency}</p>
          </div>
        ))}
      </div>

      {/* Barème par promotion */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-[14px] font-bold text-ink">Barème par promotion</h2>
        <Button variant="outline" fullWidth={false} icon={Plus} onClick={() => setScheduleSheet(true)} className="px-3 py-2 text-[12px]">Ajouter au barème</Button>
      </div>
      <div className="overflow-x-auto rounded-2xl bg-gray-100 p-5">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">
              <th className="pb-3 pr-3">Type de frais</th>
              <th className="pb-3 pr-3">Promotion / Niveau</th>
              <th className="pb-3 pr-3">Fréquence</th>
              <th className="pb-3 pr-3 text-right">Montant</th>
              <th className="pb-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((r) => (
              <tr key={r.id} className="border-t border-white text-[13px]">
                <td className="py-3 pr-3 font-bold text-ink">{r.fee_type}</td>
                <td className="py-3 pr-3 text-gray-500">{r.group}</td>
                <td className="py-3 pr-3 text-gray-500">{r.frequency}</td>
                <td className="py-3 pr-3 text-right font-bold text-ink">{fmt(r.amount)} {r.currency === "USD" ? "$" : "FC"}</td>
                <td className="py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button type="button" aria-label="Modifier le montant" title="Modifier le montant" onClick={() => editAmount(r)} className="flex size-8 items-center justify-center rounded-lg bg-white text-gray-700 hover:bg-gray-300/40"><Pencil className="size-4" strokeWidth={2.2} /></button>
                    <button type="button" aria-label="Supprimer la ligne" title="Supprimer la ligne" onClick={() => removeSchedule(r)} className="flex size-8 items-center justify-center rounded-lg bg-white text-red hover:opacity-80"><Trash2 className="size-4" strokeWidth={2.2} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {schedules.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-[13px] text-gray-500">Aucune ligne de barème — ajoute-en une.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />

      <AddFeeTypeSheet open={typeSheet} onClose={() => setTypeSheet(false)} onCreated={(t) => setTypes((prev) => [...prev, t])} />
      <AddScheduleSheet open={scheduleSheet} feeTypes={apiTypes} onClose={() => setScheduleSheet(false)} onCreated={(s) => setSchedules((prev) => [...prev, s])} />
    </div>
  );
}
