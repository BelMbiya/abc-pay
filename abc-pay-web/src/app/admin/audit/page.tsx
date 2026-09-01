"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollText, Search, RefreshCw } from "lucide-react";
import { StatusPill, Pagination, usePagination } from "@/components/ui";
import { fetchAuditLogs, type AuditLog } from "@/lib/audit-api";

function when(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
}

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super admin", finance: "Finance", compliance: "Conformité", support: "Support", readonly: "Lecture seule",
};

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [q, setQ] = useState("");

  const load = useCallback(() => {
    setState("loading");
    fetchAuditLogs().then((l) => { setLogs(l); setState("ready"); }).catch(() => setState("error"));
  }, []);

  useEffect(() => {
    let active = true;
    fetchAuditLogs().then((l) => active && (setLogs(l), setState("ready"))).catch(() => active && setState("error"));
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? logs.filter((l) => `${l.action} ${l.admin_name} ${l.path} ${l.target_type} ${l.target_id}`.toLowerCase().includes(s)) : logs;
  }, [q, logs]);

  const { page, setPage, pageItems, total, totalPages, pageSize } = usePagination(filtered);

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 py-6 md:px-8 md:py-8">
      <div className="mb-2 flex items-center gap-2">
        <ScrollText className="size-[22px] text-blue-600" strokeWidth={2.2} />
        <h1 className="font-display text-[22px] font-extrabold tracking-tight text-ink">Journal d&apos;audit</h1>
      </div>
      <p className="mb-5 text-[13px] text-gray-500">Trace de toutes les actions sensibles des administrateurs (qui, quoi, quand). Lecture seule, réservé au super-administrateur.</p>

      <div className="mb-4 flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl bg-gray-100 px-3.5 py-2.5">
          <Search className="size-4 text-gray-500" strokeWidth={2.2} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une action, un admin, une ressource…" className="w-full bg-transparent text-[13px] text-ink placeholder:text-gray-500 focus:outline-none" />
        </div>
        <button type="button" onClick={load} aria-label="Rafraîchir" className="flex size-[42px] items-center justify-center rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-300/40"><RefreshCw className="size-4" strokeWidth={2.2} /></button>
      </div>

      {state === "error" ? (
        <div className="rounded-2xl bg-gray-100 py-16 text-center text-[13px] text-gray-500">Chargement impossible. <button onClick={load} className="font-bold text-blue-600">Réessayer</button></div>
      ) : state === "loading" ? (
        <div className="py-16 text-center text-[13px] text-gray-500">Chargement…</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-gray-100 p-5">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">
                <th className="pb-3 pr-3">Quand</th>
                <th className="pb-3 pr-3">Administrateur</th>
                <th className="pb-3 pr-3">Action</th>
                <th className="pb-3 pr-3">Ressource</th>
                <th className="pb-3 text-right">Statut</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((l) => (
                <tr key={l.id} className="border-t border-white text-[13px]">
                  <td className="py-3 pr-3 whitespace-nowrap text-gray-500">{when(l.created_at)}</td>
                  <td className="py-3 pr-3">
                    <div className="font-bold text-ink">{l.admin_name ?? "—"}</div>
                    <div className="text-[11px] text-gray-500">{ROLE_LABEL[l.admin_role ?? ""] ?? l.admin_role} · {l.ip ?? "—"}</div>
                  </td>
                  <td className="py-3 pr-3 font-semibold text-ink">{l.action}</td>
                  <td className="py-3 pr-3 text-gray-500">{l.target_type ? `${l.target_type} ${l.target_id ? "· " + String(l.target_id).slice(0, 8) : ""}` : "—"}</td>
                  <td className="py-3 text-right">
                    <StatusPill tone={l.status < 300 ? "live" : "soon"}>{l.status}</StatusPill>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-[13px] text-gray-500">Aucune action enregistrée.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />
    </div>
  );
}
