"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Upload, Download } from "lucide-react";
import { Button, Pagination, usePagination } from "@/components/ui";
import { PageHeader } from "@/components/backoffice/StatCard";
import { ImportLearnersSheet } from "@/components/backoffice/ImportLearnersSheet";
import { LearnerDetailSheet } from "@/components/backoffice/LearnerDetailSheet";
import { fmt } from "@/lib/api";
import { fetchLearners, type ApiLearner } from "@/lib/learners-api";
import { downloadLearnerTemplate } from "@/lib/learner-template";

export default function ApprenantsPage() {
  const [q, setQ] = useState("");
  const [learners, setLearners] = useState<ApiLearner[]>([]);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [selected, setSelected] = useState<ApiLearner | null>(null);

  useEffect(() => {
    let alive = true;
    fetchLearners()
      .then((list) => alive && setLearners(list))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const reload = () => { fetchLearners().then(setLearners).catch(() => {}); };

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return learners.filter((l) =>
      !s || l.name.toLowerCase().includes(s) || (l.matricule ?? "").toLowerCase().includes(s) || (l.group ?? "").toLowerCase().includes(s),
    );
  }, [q, learners]);

  const { page, setPage, pageItems, total, totalPages, pageSize } = usePagination(rows);

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 py-6 md:px-8 md:py-8">
      <PageHeader
        title="Réconciliation"
        subtitle={`Attendu / encaissé / restant par matricule — ${learners.length} apprenant(s)`}
        actions={
          <>
            <Button variant="outline" fullWidth={false} icon={Download} onClick={downloadLearnerTemplate}>Gabarit</Button>
            <Button fullWidth={false} icon={Upload} onClick={() => setImportOpen(true)}>Importer</Button>
          </>
        }
      />

      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-gray-500" strokeWidth={2} />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher par nom, matricule, promotion…"
          autoComplete="off"
          className="w-full rounded-[13px] border-[1.5px] border-gray-100 bg-gray-100 py-3 pl-11 pr-4 text-[14px] text-ink placeholder:text-gray-500 focus:border-blue-500 focus:bg-white focus:outline-none"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl bg-gray-100 p-5">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">
              <th className="pb-3 pr-3">Apprenant</th>
              <th className="pb-3 pr-3">Matricule</th>
              <th className="pb-3 pr-3">Classe / Promotion</th>
              <th className="pb-3 pr-3 text-right">Attendu</th>
              <th className="pb-3 pr-3 text-right">Encaissé</th>
              <th className="pb-3 pr-3 text-right">Restant</th>
              <th className="pb-3">Réconciliation</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((l) => {
              const due = l.due_total ?? 0;
              const paid = l.paid_total ?? 0;
              // État de réconciliation par matricule.
              const recon = due <= 0
                ? { label: l.source === "paiement" ? "Via paiement" : "Sans barème", cls: "text-gray-500" }
                : l.balance <= 0
                  ? { label: "Soldé", cls: "text-green" }
                  : paid > 0
                    ? { label: "Partiel", cls: "text-gold-600" }
                    : { label: "Impayé", cls: "text-red" };
              return (
                <tr key={l.id} onClick={() => setSelected(l)} className="cursor-pointer border-t border-white text-[13px] transition-colors hover:bg-white/60">
                  <td className="py-3 pr-3 font-bold text-ink">
                    <span className="flex items-center gap-2">
                      {l.name}
                      {l.source === "paiement" ? (
                        <span className="rounded-pill bg-blue-100 px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wide text-blue-700">via paiement</span>
                      ) : null}
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-gray-500">{l.matricule ?? "—"}</td>
                  <td className="py-3 pr-3 text-gray-500">{l.group ?? "—"}</td>
                  <td className="py-3 pr-3 text-right text-gray-700">{due > 0 ? `${fmt(due)} $` : "—"}</td>
                  <td className="py-3 pr-3 text-right text-gray-700">{paid > 0 ? `${fmt(paid)} $` : "—"}</td>
                  <td className="py-3 pr-3 text-right font-bold text-ink">{l.balance > 0 ? `${fmt(l.balance)} $` : "—"}</td>
                  <td className={`py-3 font-bold ${recon.cls}`}>{recon.label}</td>
                </tr>
              );
            })}
            {!loading && rows.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-[13px] text-gray-500">{learners.length === 0 ? "Aucun apprenant — ajoute le premier." : "Aucun résultat."}</td></tr>
            ) : null}
            {loading ? (
              <tr><td colSpan={7} className="py-8 text-center text-[13px] text-gray-500">Chargement…</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />

      <ImportLearnersSheet open={importOpen} onClose={() => setImportOpen(false)} onImported={reload} />
      <LearnerDetailSheet learner={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
