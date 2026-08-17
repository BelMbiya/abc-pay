"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, X, ReceiptText } from "lucide-react";
import { PageHeader } from "@/components/backoffice/StatCard";
import { useToast, useConfirm } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { money } from "@/lib/money";
import { fetchStaffRefunds, staffDecideRefund, type AdminRefund } from "@/lib/tx-views-api";

/** Étape du dossier vu par l'établissement. */
function stageMeta(r: AdminRefund): { label: string; pill: string } {
  if (r.establishment_decision === "approuve") {
    return r.status === "approuve"
      ? { label: "Validé · remboursé", pill: "bg-success-bg text-green" }
      : { label: "Validé · en attente admin", pill: "bg-blue-100 text-blue-700" };
  }
  if (r.establishment_decision === "refuse") {
    return r.status === "approuve"
      ? { label: "Refusé · forcé par l'admin", pill: "bg-ink text-white" }
      : { label: "Refusé par vous", pill: "bg-[#FDE7E8] text-red" };
  }
  return { label: "À valider", pill: "bg-fee-bg text-gold-600" };
}

function fdate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
}

export default function StaffRemboursementsPage() {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState<AdminRefund[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setState("loading");
    fetchStaffRefunds()
      .then((r) => { setRows(r); setState("ready"); })
      .catch(() => setState("error"));
  }, []);

  useEffect(() => {
    let active = true;
    fetchStaffRefunds()
      .then((r) => active && (setRows(r), setState("ready")))
      .catch(() => active && setState("error"));
    return () => { active = false; };
  }, []);

  const decide = async (r: AdminRefund, decision: "approuve" | "refuse") => {
    const ok = decision === "approuve"
      ? await confirm({ title: "Valider ce remboursement ?", message: `${money(r.amount, r.currency)} — « ${r.reason} ». Il sera transmis à l'administrateur pour exécution.`, confirmLabel: "Valider" })
      : await confirm({ title: "Refuser ce remboursement ?", message: `${money(r.amount, r.currency)} — « ${r.reason} ». L'administrateur ne pourra l'exécuter qu'en cas de force majeure.`, confirmLabel: "Refuser", danger: true });
    if (!ok) return;
    setBusy(true);
    try {
      await staffDecideRefund(r.id, decision);
      showToast(decision === "approuve" ? "Remboursement validé — transmis à l'administrateur" : "Remboursement refusé");
      load();
    } catch (e) {
      const field = e instanceof ApiError ? Object.values(e.fields ?? {})[0]?.[0] : undefined;
      showToast(field ?? (e instanceof ApiError ? e.message : "Action impossible"));
    } finally { setBusy(false); }
  };

  const pending = rows.filter((r) => r.establishment_decision === null && r.status === "demande").length;

  return (
    <div className="mx-auto w-full max-w-[1000px] px-5 py-6 md:px-8 md:py-8">
      <PageHeader
        title="Remboursements"
        subtitle={`Demandes concernant votre établissement — ${pending} à valider`}
      />
      <p className="mb-5 text-[13px] text-gray-500">
        Chaque demande de remboursement d&apos;une scolarité passe d&apos;abord par <b>votre validation</b>, puis par l&apos;administrateur abc pay pour exécution. Un refus de votre part bloque le remboursement, sauf force majeure actée par l&apos;administrateur.
      </p>

      {state === "error" ? (
        <div className="rounded-2xl bg-gray-100 py-16 text-center text-[13px] text-gray-500">Chargement impossible. <button onClick={load} className="font-bold text-blue-600">Réessayer</button></div>
      ) : state === "loading" ? (
        <div className="py-16 text-center text-[13px] text-gray-500">Chargement…</div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-gray-100 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-white text-gray-500"><ReceiptText className="size-6" strokeWidth={2} /></span>
          <p className="text-[13px] text-gray-500">Aucune demande de remboursement pour votre établissement.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r) => {
            const s = stageMeta(r);
            const actionable = r.establishment_decision === null && r.status === "demande";
            return (
              <div key={r.id} className="rounded-2xl bg-gray-100 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-pill px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${s.pill}`}>{s.label}</span>
                      <span className="font-display text-[15px] font-extrabold text-ink">{money(r.amount, r.currency)}</span>
                      {r.created_at ? <span className="text-[10.5px] text-gray-500">{fdate(r.created_at)}</span> : null}
                    </div>
                    <p className="mt-2 text-[13.5px] text-ink">« {r.reason} »</p>
                    {r.transaction_reference ? <p className="mt-1 text-[11.5px] text-gray-500">Réf. transaction : {r.transaction_reference}</p> : null}
                  </div>
                  {actionable ? (
                    <div className="flex shrink-0 gap-2">
                      <button onClick={() => decide(r, "approuve")} disabled={busy} aria-label="Valider" className="flex size-9 items-center justify-center rounded-lg bg-green text-white hover:opacity-90 disabled:opacity-50"><Check className="size-4" strokeWidth={2.4} /></button>
                      <button onClick={() => decide(r, "refuse")} disabled={busy} aria-label="Refuser" className="flex size-9 items-center justify-center rounded-lg bg-red text-white hover:opacity-90 disabled:opacity-50"><X className="size-4" strokeWidth={2.4} /></button>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
