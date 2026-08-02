"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Upload, Plus } from "lucide-react";
import { Button, StatusPill, Pagination, usePagination } from "@/components/ui";
import { PageHeader } from "@/components/backoffice/StatCard";
import { AddLearnerSheet } from "@/components/backoffice/AddLearnerSheet";
import { ImportLearnersSheet } from "@/components/backoffice/ImportLearnersSheet";
import { LearnerDetailSheet } from "@/components/backoffice/LearnerDetailSheet";
import { fmt } from "@/lib/api";
import { fetchLearners, type ApiLearner } from "@/lib/learners-api";

const STATUS: Record<string, { label: string; tone: "live" | "gold" | "soon" }> = {
  actif: { label: "Actif", tone: "live" },
  redoublant: { label: "Redoublant", tone: "gold" },
  diplome: { label: "Diplômé", tone: "soon" },
};

export default function ApprenantsPage() {
  const [q, setQ] = useState("");
  const [learners, setLearners] = useState<ApiLearner[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
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
        title="Apprenants"
        subtitle={`${learners.length} apprenants inscrits`}
        actions={
          <>
            <Button variant="outline" fullWidth={false} icon={Upload} onClick={() => setImportOpen(true)}>Importer</Button>
            <Button fullWidth={false} icon={Plus} onClick={() => setAddOpen(true)}>Ajouter</Button>
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
              <th className="pb-3 pr-3">Classe / Promotion</th>
              <th className="pb-3 pr-3">Matricule</th>
              <th className="pb-3 pr-3">Statut</th>
              <th className="pb-3 text-right">Solde dû</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((l) => {
              const st = STATUS[l.status] ?? STATUS.actif;
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
                  <td className="py-3 pr-3 text-gray-500">{l.group ?? "—"}</td>
                  <td className="py-3 pr-3 text-gray-500">{l.matricule ?? "—"}</td>
                  <td className="py-3 pr-3"><StatusPill tone={st.tone}>{st.label}</StatusPill></td>
                  <td className="py-3 text-right font-bold text-ink">
                    {l.balance > 0 ? <span className="text-gold-600">{fmt(l.balance)} $</span> : <span className="text-green">À jour</span>}
                  </td>
                </tr>
              );
            })}
            {!loading && rows.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-[13px] text-gray-500">{learners.length === 0 ? "Aucun apprenant — ajoute le premier." : "Aucun résultat."}</td></tr>
            ) : null}
            {loading ? (
              <tr><td colSpan={5} className="py-8 text-center text-[13px] text-gray-500">Chargement…</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />

      <AddLearnerSheet open={addOpen} onClose={() => setAddOpen(false)} onCreated={(l) => setLearners((prev) => [l, ...prev])} />
      <ImportLearnersSheet open={importOpen} onClose={() => setImportOpen(false)} />
      <LearnerDetailSheet learner={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
