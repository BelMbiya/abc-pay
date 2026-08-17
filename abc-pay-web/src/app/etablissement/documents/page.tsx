"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Upload, CheckCircle2, Clock, AlertCircle, FileText } from "lucide-react";
import { Button, StatusPill, useToast } from "@/components/ui";
import { PageHeader } from "@/components/backoffice/StatCard";
import { fetchEstablishmentDocs, uploadEstablishmentDoc, type DocsOverview, type DocItem } from "@/lib/establishment-docs-api";

const STATUS: Record<DocItem["status"], { label: string; tone: "live" | "gold" | "soon"; Icon: typeof Clock }> = {
  approved: { label: "Approuvé", tone: "live", Icon: CheckCircle2 },
  pending: { label: "En vérification", tone: "gold", Icon: Clock },
  rejected: { label: "Rejeté", tone: "soon", Icon: AlertCircle },
  missing: { label: "Manquant", tone: "soon", Icon: FileText },
};

function DocRow({ item, onUpload }: { item: DocItem; onUpload: (type: string, number: string, file: File | null) => Promise<void> }) {
  const [number, setNumber] = useState(item.number ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const st = STATUS[item.status];

  return (
    <div className="rounded-2xl bg-gray-100 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-bold text-ink">{item.label}{item.required ? <span className="text-red"> *</span> : null}</p>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-gray-500">{item.hint}</p>
        </div>
        <StatusPill tone={st.tone}>{st.label}</StatusPill>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        {item.needs_number ? (
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="Numéro / référence"
            className="w-full rounded-[11px] border-[1.5px] border-white bg-white px-3 py-2.5 text-[13px] text-ink placeholder:text-gray-500 focus:border-blue-500 focus:outline-none sm:max-w-[240px]"
          />
        ) : null}
        <label className="flex cursor-pointer items-center gap-2 rounded-[11px] border-[1.5px] border-dashed border-gray-300 bg-white px-3 py-2.5 text-[12.5px] font-semibold text-gray-700 hover:border-blue-500">
          <Upload className="size-4" strokeWidth={2} />
          <span className="truncate">{file ? file.name : "Choisir un fichier (PDF/image)"}</span>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <Button
          fullWidth={false}
          disabled={busy || (!file && !number.trim())}
          onClick={async () => { setBusy(true); try { await onUpload(item.type, number.trim(), file); setFile(null); } finally { setBusy(false); } }}
        >
          {busy ? "Envoi…" : "Déposer"}
        </Button>
      </div>
    </div>
  );
}

export default function EstablishmentDocumentsPage() {
  const { showToast } = useToast();
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [data, setData] = useState<DocsOverview | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      setData(await fetchEstablishmentDocs());
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchEstablishmentDocs().then((d) => active && (setData(d), setState("ready"))).catch(() => active && setState("error"));
    return () => { active = false; };
  }, []);

  const upload = async (type: string, number: string, file: File | null) => {
    try {
      await uploadEstablishmentDoc({ type, number: number || undefined, file });
      showToast("Pièce déposée — en attente de vérification");
      await load();
    } catch {
      showToast("Dépôt impossible");
    }
  };

  const c = data?.completeness;

  return (
    <div className="mx-auto w-full max-w-[820px] px-5 py-6 md:px-8 md:py-8">
      <PageHeader
        title="Documents (KYB)"
        subtitle="Pièces légales de ton établissement — vérifiées par abc pay"
        actions={
          <button type="button" onClick={load} aria-label="Actualiser" className="flex size-[42px] items-center justify-center rounded-[12px] bg-gray-100 text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            <RefreshCw className={`size-[17px] ${state === "loading" ? "animate-spin" : ""}`} strokeWidth={2.2} />
          </button>
        }
      />

      {c ? (
        <div className={`mb-5 rounded-2xl px-4 py-3 text-[12.5px] font-semibold ${c.complete ? "bg-success-bg text-green" : "bg-gray-100 text-gray-700"}`}>
          {c.complete
            ? "Dossier complet : tous les documents obligatoires sont approuvés."
            : `${c.approved}/${c.required} document(s) obligatoire(s) approuvé(s). Un dossier incomplet empêche l'encaissement.`}
        </div>
      ) : null}

      {state === "error" ? (
        <div className="rounded-2xl bg-gray-100 py-16 text-center text-[13px] text-gray-500">Impossible de charger les documents. <button onClick={load} className="font-bold text-blue-600">Réessayer</button></div>
      ) : (
        <div className="flex flex-col gap-3">
          {(data?.items ?? []).map((it) => <DocRow key={it.type} item={it} onUpload={upload} />)}
        </div>
      )}
    </div>
  );
}
