"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, X, ReceiptText, ShieldAlert } from "lucide-react";
import { BottomSheet, Button, useToast, useConfirm } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { money } from "@/lib/money";
import { fetchAdminRefunds, decideRefund, type AdminRefund, type RefundStatus } from "@/lib/tx-views-api";

const STATUS_META: Record<RefundStatus, { label: string; pill: string }> = {
  demande: { label: "En attente", pill: "bg-fee-bg text-gold-600" },
  approuve: { label: "Approuvé", pill: "bg-success-bg text-green" },
  rejete: { label: "Rejeté", pill: "bg-[#FDE7E8] text-red" },
};

/** Pastille de la décision de l'établissement (remboursements Tuition). */
function etabBadge(r: AdminRefund): { label: string; pill: string } | null {
  if (!r.needs_establishment) return null;
  if (r.establishment_decision === "approuve") return { label: "Établissement : validé", pill: "bg-success-bg text-green" };
  if (r.establishment_decision === "refuse") return { label: "Établissement : refusé", pill: "bg-[#FDE7E8] text-red" };
  return { label: "Établissement : en attente", pill: "bg-fee-bg text-gold-600" };
}

const canApproveNormally = (r: AdminRefund) => !r.needs_establishment || r.establishment_decision === "approuve";

function fdate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
}

export default function AdminRemboursementsPage() {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState<AdminRefund[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState(false);
  const [forcing, setForcing] = useState<AdminRefund | null>(null);
  const [forceReason, setForceReason] = useState("");

  const load = useCallback(() => {
    setState("loading");
    fetchAdminRefunds()
      .then((r) => { setRows(r); setState("ready"); })
      .catch(() => setState("error"));
  }, []);

  useEffect(() => {
    let active = true;
    fetchAdminRefunds()
      .then((r) => active && (setRows(r), setState("ready")))
      .catch(() => active && setState("error"));
    return () => { active = false; };
  }, []);

  const showErr = (e: unknown) => {
    const field = e instanceof ApiError ? Object.values(e.fields ?? {})[0]?.[0] : undefined;
    showToast(field ?? (e instanceof ApiError ? e.message : "Action impossible"));
  };

  const decide = async (r: AdminRefund, decision: "approuve" | "rejete") => {
    const ok = decision === "rejete"
      ? await confirm({ title: "Rejeter ce remboursement ?", message: `Demande de ${money(r.amount, r.currency)} — « ${r.reason} ».`, confirmLabel: "Rejeter", danger: true })
      : await confirm({ title: "Approuver et exécuter ?", message: `${money(r.amount, r.currency)} sera remboursé et la transaction marquée « remboursée ».`, confirmLabel: "Approuver" });
    if (!ok) return;
    setBusy(true);
    try {
      await decideRefund(r.id, decision);
      showToast(decision === "approuve" ? "Remboursement approuvé et exécuté" : "Demande rejetée");
      load();
    } catch (e) { showErr(e); } finally { setBusy(false); }
  };

  const submitForce = async () => {
    if (!forcing) return;
    if (!forceReason.trim()) { showToast("Un motif de force majeure est requis"); return; }
    setBusy(true);
    try {
      await decideRefund(forcing.id, "approuve", forceReason.trim(), true);
      showToast("Remboursement forcé et exécuté");
      setForcing(null); setForceReason("");
      load();
    } catch (e) { showErr(e); } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto w-full max-w-[1000px] px-5 py-6 md:px-8 md:py-8">
      <h1 className="font-display text-[22px] font-extrabold tracking-tight text-ink">Remboursements</h1>
      <p className="mb-5 text-[13px] text-gray-500">
        Circuit de validation. <b>Tuition</b> : l&apos;établissement concerné valide d&apos;abord, puis l&apos;administrateur acte. Si l&apos;établissement refuse, seul un <b>forçage (force majeure)</b>, justifié, permet d&apos;exécuter. L&apos;approbation exécute le remboursement et marque la transaction « remboursée ».
      </p>

      {state === "error" ? (
        <div className="rounded-2xl bg-gray-100 py-16 text-center text-[13px] text-gray-500">Chargement impossible. <button onClick={load} className="font-bold text-blue-600">Réessayer</button></div>
      ) : state === "loading" ? (
        <div className="py-16 text-center text-[13px] text-gray-500">Chargement…</div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-gray-100 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-white text-gray-500"><ReceiptText className="size-6" strokeWidth={2} /></span>
          <p className="text-[13px] text-gray-500">Aucune demande de remboursement. Ouvre-en une depuis le détail d&apos;une transaction.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r) => {
            const eb = etabBadge(r);
            return (
              <div key={r.id} className="rounded-2xl bg-gray-100 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-pill px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${STATUS_META[r.status].pill}`}>{STATUS_META[r.status].label}</span>
                      {eb ? <span className={`rounded-pill px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${eb.pill}`}>{eb.label}</span> : null}
                      {r.forced ? <span className="rounded-pill bg-ink px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">Forcé</span> : null}
                      <span className="font-display text-[15px] font-extrabold text-ink">{money(r.amount, r.currency)}</span>
                      {r.created_at ? <span className="text-[10.5px] text-gray-500">{fdate(r.created_at)}</span> : null}
                    </div>
                    <p className="mt-2 text-[13.5px] text-ink">« {r.reason} »</p>
                    <p className="mt-1 text-[11.5px] text-gray-500">
                      Demandé par {r.requested_by}
                      {r.establishment_decided_by ? ` · établissement : ${r.establishment_decided_by}` : ""}
                      {r.decided_by ? ` · acté par ${r.decided_by}` : ""}
                      {r.transaction_reference ? ` · réf. ${r.transaction_reference}` : ""}
                    </p>
                    {r.force_reason ? <p className="mt-1 text-[11.5px] font-semibold text-gray-700">Force majeure : {r.force_reason}</p> : r.decision_note ? <p className="mt-1 text-[11.5px] text-gray-500">Note : {r.decision_note}</p> : null}
                  </div>
                  {r.status === "demande" ? (
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                      {canApproveNormally(r) ? (
                        <button onClick={() => decide(r, "approuve")} disabled={busy} aria-label="Approuver" className="flex size-9 items-center justify-center rounded-lg bg-green text-white hover:opacity-90 disabled:opacity-50"><Check className="size-4" strokeWidth={2.4} /></button>
                      ) : (
                        <button onClick={() => { setForcing(r); setForceReason(""); }} disabled={busy} className="flex items-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-[12px] font-bold text-white hover:opacity-90 disabled:opacity-50"><ShieldAlert className="size-4" strokeWidth={2.2} /> Forcer</button>
                      )}
                      <button onClick={() => decide(r, "rejete")} disabled={busy} aria-label="Rejeter" className="flex size-9 items-center justify-center rounded-lg bg-red text-white hover:opacity-90 disabled:opacity-50"><X className="size-4" strokeWidth={2.4} /></button>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BottomSheet open={!!forcing} onClose={() => setForcing(null)} title="Forcer le remboursement (force majeure)">
        <p className="text-[12.5px] leading-relaxed text-gray-500">
          {forcing?.establishment_decision === "refuse"
            ? "L'établissement a refusé cette demande. Le forçage exécute le remboursement malgré ce refus — réservé aux cas de force majeure et tracé."
            : "L'établissement n'a pas encore validé. Le forçage exécute le remboursement sans attendre — réservé aux cas de force majeure et tracé."}
        </p>
        <label className="mb-[7px] mt-3.5 block text-[12.5px] font-bold text-gray-700">Motif de force majeure<span className="ml-0.5 text-red">*</span></label>
        <textarea
          value={forceReason}
          onChange={(e) => setForceReason(e.target.value)}
          rows={3}
          placeholder="Ex : double débit avéré, décision du régulateur, erreur technique confirmée…"
          className="w-full resize-y rounded-[13px] border-[1.5px] border-gray-100 bg-gray-100 p-3.5 text-[14px] leading-relaxed text-ink placeholder:text-gray-500 focus:border-blue-500 focus:bg-white focus:outline-none"
        />
        <Button className="mt-5 w-full" disabled={busy} onClick={submitForce}>Forcer et exécuter le remboursement</Button>
      </BottomSheet>
    </div>
  );
}
