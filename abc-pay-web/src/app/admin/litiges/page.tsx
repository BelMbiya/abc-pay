"use client";

import { useCallback, useEffect, useState } from "react";
import { LifeBuoy, RefreshCw } from "lucide-react";
import { StatusPill, Pagination, usePagination } from "@/components/ui";
import { PageHeader } from "@/components/backoffice/StatCard";
import { fetchTickets, CATEGORY_LABEL, TICKET_STATUS, PRIORITY_LABEL, type Ticket } from "@/lib/support-api";
import { AdminTicketSheet } from "@/components/admin/AdminTicketSheet";

const FILTERS = [
  { id: "open", label: "Ouverts" },
  { id: "in_progress", label: "En cours" },
  { id: "all", label: "Tous" },
  { id: "resolved", label: "Résolus" },
];
const STATUS_TONE: Record<string, "live" | "gold" | "soon"> = { resolved: "live", in_progress: "gold", open: "soon" };
const PRIORITY_TONE: Record<string, "live" | "gold" | "soon"> = { urgent: "soon", high: "gold", normal: "live", low: "live" };

function fdate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
}

export default function LitigesPage() {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [open, setOpen] = useState(0);
  const [filter, setFilter] = useState("open");
  const [selected, setSelected] = useState<Ticket | null>(null);

  const load = useCallback(async (status = filter) => {
    setState("loading");
    try {
      const d = await fetchTickets(status);
      setTickets(d.tickets);
      setOpen(d.open);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [filter]);

  useEffect(() => {
    let active = true;
    fetchTickets("open")
      .then((d) => active && (setTickets(d.tickets), setOpen(d.open), setState("ready")))
      .catch(() => active && setState("error"));
    return () => {
      active = false;
    };
  }, []);

  const changeFilter = (id: string) => {
    setFilter(id);
    void load(id);
  };

  const { page, setPage, pageItems, total, totalPages, pageSize } = usePagination(tickets);

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 py-6 md:px-8 md:py-8">
      <PageHeader
        title="Support & litiges"
        subtitle="Tickets ouverts par les utilisateurs (litiges, sécurité, accès)"
        actions={
          <button type="button" onClick={() => load()} aria-label="Actualiser" className="flex size-[42px] items-center justify-center rounded-[12px] bg-gray-100 text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            <RefreshCw className={`size-[17px] ${state === "loading" ? "animate-spin" : ""}`} strokeWidth={2.2} />
          </button>
        }
      />

      <div className="mb-5 flex items-center gap-3 rounded-2xl bg-gray-100 p-4 sm:max-w-xs">
        <span className={`flex size-10 items-center justify-center rounded-xl ${open > 0 ? "bg-fee-bg text-gold-600" : "bg-success-bg text-green"}`}><LifeBuoy className="size-5" strokeWidth={2.2} /></span>
        <div>
          <p className="font-display text-[20px] font-extrabold text-ink">{open}</p>
          <p className="text-[11.5px] font-bold uppercase tracking-wide text-gray-500">Ticket(s) ouvert(s)</p>
        </div>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" onClick={() => changeFilter(f.id)} className={`shrink-0 rounded-pill px-3.5 py-1.5 text-[12.5px] font-bold transition-colors ${filter === f.id ? "bg-ink text-white" : "bg-gray-100 text-gray-700"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {state === "error" ? (
        <div className="rounded-2xl bg-gray-100 py-16 text-center text-[13px] text-gray-500">Impossible de charger. <button onClick={() => load()} className="font-bold text-blue-600">Réessayer</button></div>
      ) : state === "ready" && tickets.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-gray-100 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-success-bg text-green"><LifeBuoy className="size-6" strokeWidth={2} /></span>
          <p className="text-[13.5px] font-bold text-ink">Aucun ticket ici</p>
          <p className="max-w-[300px] text-[12.5px] text-gray-500">Les demandes des utilisateurs (litiges, sécurité, accès) apparaîtront ici.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl bg-gray-100 p-5">
            <table className="w-full min-w-[820px] border-collapse">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">
                  <th className="pb-3 pr-3">Date</th>
                  <th className="pb-3 pr-3">Sujet</th>
                  <th className="pb-3 pr-3">Auteur</th>
                  <th className="pb-3 pr-3">Motif</th>
                  <th className="pb-3 pr-3">Priorité</th>
                  <th className="pb-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                {state === "loading"
                  ? [0, 1, 2].map((i) => <tr key={i} className="border-t border-white"><td colSpan={6} className="py-3"><div className="h-4 animate-pulse rounded bg-white" /></td></tr>)
                  : pageItems.map((t) => (
                      <tr key={t.id} onClick={() => setSelected(t)} className="cursor-pointer border-t border-white text-[13px] hover:bg-white/60">
                        <td className="py-3 pr-3 text-gray-500">{fdate(t.created_at)}</td>
                        <td className="py-3 pr-3"><div className="font-bold text-ink">{t.subject}</div><div className="text-[11px] text-gray-500">{t.reference}</div></td>
                        <td className="py-3 pr-3 text-gray-500">{t.user?.name || t.user?.phone || "—"}</td>
                        <td className="py-3 pr-3 text-gray-500">{CATEGORY_LABEL[t.category] ?? t.category}</td>
                        <td className="py-3 pr-3"><StatusPill tone={PRIORITY_TONE[t.priority] ?? "live"}>{PRIORITY_LABEL[t.priority] ?? t.priority}</StatusPill></td>
                        <td className="py-3"><StatusPill tone={STATUS_TONE[t.status] ?? "soon"}>{TICKET_STATUS[t.status] ?? t.status}</StatusPill></td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />
        </>
      )}

      <AdminTicketSheet ticket={selected} onClose={() => setSelected(null)} onChanged={load} />
    </div>
  );
}
