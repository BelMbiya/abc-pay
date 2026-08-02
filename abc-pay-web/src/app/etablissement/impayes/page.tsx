"use client";

import { useEffect, useMemo, useState } from "react";
import { BellRing, Check } from "lucide-react";
import { Button, useToast, Pagination, usePagination } from "@/components/ui";
import { PageHeader } from "@/components/backoffice/StatCard";
import { fmt } from "@/lib/api";
import { fetchLearners, remindLearner, type ApiLearner } from "@/lib/learners-api";

export default function ImpayesPage() {
  const { showToast } = useToast();
  const [learners, setLearners] = useState<ApiLearner[]>([]);
  const [loading, setLoading] = useState(true);
  const [reminded, setReminded] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState<string | null>(null);

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

  const unpaid = useMemo(() => learners.filter((l) => l.balance > 0).sort((a, b) => b.balance - a.balance), [learners]);
  const total = unpaid.reduce((s, l) => s + l.balance, 0);

  const { page, setPage, pageItems, total: pageTotal, totalPages, pageSize } = usePagination(unpaid);

  const remind = async (l: ApiLearner) => {
    setSending(l.id);
    try {
      await remindLearner(l.id);
      setReminded((prev) => new Set(prev).add(l.id));
      showToast(`Relance envoyée à ${l.name}`);
    } catch {
      showToast("Échec de la relance");
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 py-6 md:px-8 md:py-8">
      <PageHeader
        title="Impayés & relances"
        subtitle={loading ? "Chargement…" : `${unpaid.length} apprenants en retard · ${fmt(total)} $ à recouvrer`}
      />

      <div className="overflow-x-auto rounded-2xl bg-gray-100 p-5">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">
              <th className="pb-3 pr-3">Apprenant</th>
              <th className="pb-3 pr-3">Classe / Promotion</th>
              <th className="pb-3 pr-3 text-right">Montant dû</th>
              <th className="pb-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((l) => (
              <tr key={l.id} className="border-t border-white text-[13px]">
                <td className="py-3 pr-3 font-bold text-ink">{l.name}</td>
                <td className="py-3 pr-3 text-gray-500">{l.group ?? "—"}</td>
                <td className="py-3 pr-3 text-right font-bold text-gold-600">{fmt(l.balance)} $</td>
                <td className="py-3 text-right">
                  {reminded.has(l.id) ? (
                    <span className="inline-flex items-center gap-1.5 rounded-pill bg-success-bg px-3 py-2 text-[12px] font-bold text-green">
                      <Check className="size-4" strokeWidth={2.4} /> Relancé
                    </span>
                  ) : (
                    <Button variant="ghost" fullWidth={false} icon={BellRing} disabled={sending === l.id} onClick={() => remind(l)} className="bg-white px-3 py-2 text-[12px] hover:bg-gray-300/50">
                      {sending === l.id ? "Envoi…" : "Relancer"}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && unpaid.length === 0 ? (
              <tr><td colSpan={4} className="py-8 text-center text-[13px] text-green">Aucun impayé — tout est à jour. 🎉</td></tr>
            ) : null}
            {loading ? (
              <tr><td colSpan={4} className="py-8 text-center text-[13px] text-gray-500">Chargement…</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} total={pageTotal} pageSize={pageSize} onPage={setPage} />
    </div>
  );
}
