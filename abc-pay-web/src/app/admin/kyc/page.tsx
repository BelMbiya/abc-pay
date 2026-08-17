"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, ShieldCheck, X, ChevronRight } from "lucide-react";
import { Button, useToast } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { fetchKycRecords, decideKyc, fetchKycDocument, type KycRecord } from "@/lib/kyc-api";

const DOC_LABEL: Record<string, string> = { front: "Pièce — recto", back: "Pièce — verso", selfie: "Selfie" };

const FILTERS = [
  { id: "pending", label: "En attente" },
  { id: "approved", label: "Approuvés" },
  { id: "rejected", label: "Rejetés" },
  { id: "all", label: "Tous" },
] as const;

const STATUS_PILL: Record<string, { label: string; cls: string }> = {
  pending: { label: "En attente", cls: "bg-fee-bg text-gold-600" },
  approved: { label: "Vérifié", cls: "bg-success-bg text-green" },
  rejected: { label: "Rejeté", cls: "bg-[#FDE7E8] text-red" },
  none: { label: "—", cls: "bg-white text-gray-500" },
};

function fdate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
}

export default function AdminKycPage() {
  const { showToast } = useToast();
  const [rows, setRows] = useState<KycRecord[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [selected, setSelected] = useState<KycRecord | null>(null);
  const [filter, setFilter] = useState<string>("pending");

  const load = useCallback((f = filter) => {
    setState("loading");
    fetchKycRecords(f === "all" ? undefined : f).then((r) => { setRows(r); setState("ready"); }).catch(() => setState("error"));
  }, [filter]);

  useEffect(() => {
    let active = true;
    fetchKycRecords(filter === "all" ? undefined : filter).then((r) => active && (setRows(r), setState("ready"))).catch(() => active && setState("error"));
    return () => { active = false; };
  }, [filter]);

  return (
    <div className="mx-auto w-full max-w-[1000px] px-5 py-6 md:px-8 md:py-8">
      <h1 className="font-display text-[22px] font-extrabold tracking-tight text-ink">Vérification KYC</h1>
      <p className="mb-3 text-[13px] text-gray-500">Compare les pièces (recto/verso + selfie) aux informations déclarées, puis approuve ou refuse. Tu peux aussi <b>revoir les pièces d&apos;un compte après décision</b> via les onglets. Les pièces sont stockées en privé et servies uniquement ici.</p>

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" onClick={() => setFilter(f.id)} className={`rounded-pill px-3.5 py-1.5 text-[12.5px] font-bold transition-colors ${filter === f.id ? "bg-ink text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-300/40"}`}>{f.label}</button>
        ))}
      </div>

      {state === "error" ? (
        <div className="rounded-2xl bg-gray-100 py-16 text-center text-[13px] text-gray-500">Chargement impossible. <button onClick={() => load()} className="font-bold text-blue-600">Réessayer</button></div>
      ) : state === "loading" ? (
        <div className="py-16 text-center text-[13px] text-gray-500">Chargement…</div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-gray-100 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-white text-gray-500"><ShieldCheck className="size-6" strokeWidth={2} /></span>
          <p className="max-w-[380px] text-[13px] text-gray-500">Aucun dossier dans cette catégorie. Les pièces sont déposées par les <b>utilisateurs</b> (Profil → « Vérification d&apos;identité ») et par le <b>personnel des établissements</b> (mur de vérification) ; elles apparaissent ici pour revue (onglets « Approuvés » / « Rejetés » pour les revoir après décision).</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r) => (
            <button key={r.id} onClick={() => setSelected(r)} className="flex items-center justify-between gap-3 rounded-2xl bg-gray-100 p-4 text-left hover:bg-gray-300/30">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-pill px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${(STATUS_PILL[r.kyc_status] ?? STATUS_PILL.none).cls}`}>{(STATUS_PILL[r.kyc_status] ?? STATUS_PILL.none).label}</span>
                  {r.kyc_submitted_at ? <span className="text-[10.5px] text-gray-500">{fdate(r.kyc_submitted_at)}</span> : null}
                </div>
                <p className="mt-2 text-[14px] font-bold text-ink">{r.name || "—"}</p>
                <p className="mt-0.5 text-[11.5px] text-gray-500">{r.phone} · {r.id_doc_type ?? "pièce"} {r.id_doc_number ?? ""}</p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 text-[11.5px] font-bold text-blue-600">Examiner <ChevronRight className="size-4" strokeWidth={2.4} /></span>
            </button>
          ))}
        </div>
      )}

      {selected ? <KycReviewDrawer record={selected} onClose={() => setSelected(null)} onDecided={() => { setSelected(null); load(); }} onError={(m) => showToast(m)} onOk={(m) => showToast(m)} /> : null}
    </div>
  );
}

function KycReviewDrawer({ record, onClose, onDecided, onError, onOk }: {
  record: KycRecord;
  onClose: () => void;
  onDecided: () => void;
  onError: (m: string) => void;
  onOk: (m: string) => void;
}) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const created: string[] = [];
    const types: ("front" | "back" | "selfie")[] = [
      ...(record.has_front ? ["front" as const] : []),
      ...(record.has_back ? ["back" as const] : []),
      ...(record.has_selfie ? ["selfie" as const] : []),
    ];
    Promise.all(types.map((t) => fetchKycDocument(record.id, t).then((u) => { created.push(u); return [t, u] as const; }).catch(() => null)))
      .then((pairs) => { if (active) setUrls(Object.fromEntries(pairs.filter(Boolean) as [string, string][])); });
    return () => { active = false; created.forEach((u) => URL.revokeObjectURL(u)); };
  }, [record]);

  const decide = async (decision: "approve" | "reject") => {
    if (decision === "reject" && !reason.trim()) { onError("Indique un motif de refus"); return; }
    setBusy(true);
    try {
      await decideKyc(record.id, decision, decision === "reject" ? reason.trim() : undefined);
      onOk(decision === "approve" ? "Identité vérifiée" : "Dossier refusé");
      onDecided();
    } catch (e) {
      onError(e instanceof ApiError ? e.message : "Action impossible");
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div onClick={onClose} className="absolute inset-0 bg-navy/30 backdrop-blur-[1px]" aria-hidden="true" />
      <aside role="dialog" aria-label="Revue KYC" className="relative flex h-full w-full max-w-[440px] flex-col border-l border-gray-100 bg-white shadow-hero">
        <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-display text-[15px] font-bold text-ink">{record.name || "Dossier KYC"}</h2>
            <p className="text-[11.5px] text-gray-500">{record.phone} · {record.id_doc_type ?? "pièce"} {record.id_doc_number ?? ""}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="flex size-8 items-center justify-center rounded-lg bg-gray-100 text-ink hover:bg-gray-300/40"><X className="size-4" strokeWidth={2.4} /></button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Verdict de l'OCR serveur — aide à la décision */}
          <div className="mb-3 rounded-xl bg-gray-100 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Lecture automatique (OCR)</span>
              {record.ocr_match === true ? (
                <span className="rounded-pill bg-success-bg px-2 py-0.5 text-[10px] font-extrabold uppercase text-green">Correspond</span>
              ) : record.ocr_match === false ? (
                <span className="rounded-pill bg-[#FDE7E8] px-2 py-0.5 text-[10px] font-extrabold uppercase text-red">Ne correspond pas</span>
              ) : (
                <span className="rounded-pill bg-white px-2 py-0.5 text-[10px] font-extrabold uppercase text-gray-500">Indisponible</span>
              )}
            </div>
            {record.ocr_details ? (
              <p className={`mt-2 text-[12px] font-semibold ${record.ocr_details.match === true ? "text-green" : record.ocr_details.match === false ? "text-red" : "text-gray-600"}`}>{record.ocr_details.summary}</p>
            ) : null}
            {record.ocr_details && (record.ocr_details.name_missing.length > 0 || record.ocr_details.name_found.length > 0) ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {record.ocr_details.name_found.map((t) => <span key={`f-${t}`} className="rounded-pill bg-success-bg px-2 py-0.5 text-[10px] font-bold text-green">✓ {t}</span>)}
                {record.ocr_details.name_missing.map((t) => <span key={`m-${t}`} className="rounded-pill bg-[#FDE7E8] px-2 py-0.5 text-[10px] font-bold text-red">✗ {t}</span>)}
                {record.ocr_details.doc_expected ? (
                  <span className={`rounded-pill px-2 py-0.5 text-[10px] font-bold ${record.ocr_details.doc_found === true ? "bg-success-bg text-green" : record.ocr_details.doc_found === false ? "bg-[#FDE7E8] text-red" : "bg-white text-gray-500"}`}>
                    {record.ocr_details.doc_found === true ? "✓" : record.ocr_details.doc_found === false ? "✗" : "?"} n° pièce
                  </span>
                ) : null}
              </div>
            ) : null}
            {record.ocr_text ? (
              <pre className="mt-2 max-h-24 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-white p-2 text-[10.5px] leading-relaxed text-gray-600">{record.ocr_text}</pre>
            ) : (
              <p className="mt-2 text-[11.5px] text-gray-500">Aucun texte lu (moteur OCR absent ou pièce illisible) — vérifie manuellement les pièces ci-dessous.</p>
            )}
          </div>
          <div className="flex flex-col gap-3">
            {(["front", "back", "selfie"] as const).map((t) => (
              urls[t] ? (
                <figure key={t} className="overflow-hidden rounded-xl border border-gray-100 bg-gray-100">
                  <figcaption className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-gray-500">{DOC_LABEL[t]}</figcaption>
                  {/* eslint-disable-next-line @next/next/no-img-element -- pièce privée servie en blob */}
                  <img src={urls[t]} alt={DOC_LABEL[t]} className="max-h-[320px] w-full object-contain" />
                </figure>
              ) : null
            ))}
            {Object.keys(urls).length === 0 ? <p className="py-8 text-center text-[13px] text-gray-500">Chargement des pièces…</p> : null}
          </div>

          <label className="mb-[7px] mt-5 block text-[12.5px] font-bold text-gray-700">Motif (si refus)</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Ex : pièce illisible, infos non concordantes…" className="w-full resize-y rounded-[13px] border-[1.5px] border-gray-100 bg-gray-100 p-3 text-[13px] text-ink placeholder:text-gray-500 focus:border-blue-500 focus:bg-white focus:outline-none" />
        </div>
        <footer className="flex gap-2 border-t border-gray-100 p-4">
          <Button className="flex-1" icon={BadgeCheck} disabled={busy} onClick={() => decide("approve")}>Approuver</Button>
          <button type="button" disabled={busy} onClick={() => decide("reject")} className="flex-1 rounded-full bg-red px-4 py-3 text-[14px] font-bold text-white hover:opacity-90 disabled:opacity-50">Refuser</button>
        </footer>
      </aside>
    </div>
  );
}
