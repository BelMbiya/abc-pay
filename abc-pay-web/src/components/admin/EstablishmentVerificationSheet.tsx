"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, BadgeCheck, XCircle, IdCard } from "lucide-react";
import { BottomSheet, Button } from "@/components/ui";
import {
  fetchEstablishmentVerification,
  reviewEstablishmentDoc,
  decideUserKyc,
  type AdminEstablishment,
  type EstablishmentVerification,
} from "@/lib/admin-api";
import { ApiError } from "@/lib/api";

/** Libellé + couleur (tokens) par statut de pièce / KYC. */
const STATUS_META: Record<string, { label: string; cls: string }> = {
  approved: { label: "Approuvé", cls: "bg-success-bg text-green" },
  pending: { label: "En attente", cls: "bg-gold-400/15 text-gold-600" },
  rejected: { label: "Rejeté", cls: "bg-red/10 text-red" },
  missing: { label: "Manquant", cls: "bg-gray-100 text-gray-500" },
  none: { label: "Non soumis", cls: "bg-gray-100 text-gray-500" },
};

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? STATUS_META.missing;
  return <span className={`rounded-pill px-2.5 py-1 text-[10.5px] font-bold ${m.cls}`}>{m.label}</span>;
}

/**
 * Vérification d'un établissement par l'admin : confirmer/modifier le KYC du responsable ET
 * le statut des pièces KYB — MÊME si rien n'a été soumis via la plateforme (vérification
 * hors-ligne). Débloque un établissement sans attendre de dépôt.
 */
export function EstablishmentVerificationSheet({
  establishment,
  onClose,
  onSaved,
}: {
  establishment: AdminEstablishment | null;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const open = establishment !== null;
  const [data, setData] = useState<EstablishmentVerification | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (id: string) => {
    setState("loading");
    try {
      setData(await fetchEstablishmentVerification(id));
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- réinitialisation à l'ouverture */
    if (establishment) {
      setData(null);
      setError(null);
      void load(establishment.id);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [establishment, load]);

  const fail = (e: unknown) =>
    setError(e instanceof ApiError ? (e.fields ? Object.values(e.fields).flat()[0] ?? e.message : e.message) : "Action impossible. Réessaie.");

  const decideDoc = async (type: string, status: "approved" | "rejected", number?: string) => {
    if (!establishment) return;
    setBusy(type);
    setError(null);
    try {
      await reviewEstablishmentDoc(establishment.id, { type, status, ...(number ? { number } : {}) });
      await load(establishment.id);
      onSaved?.();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  const decideKyc = async (decision: "approve" | "reject") => {
    if (!establishment || !data?.director) return;
    let reason: string | undefined;
    if (decision === "reject") {
      reason = window.prompt("Motif du rejet de l'identité :")?.trim() || undefined;
      if (!reason) return; // motif obligatoire au rejet
    }
    setBusy("kyc");
    setError(null);
    try {
      await decideUserKyc(data.director.user_id, decision, reason);
      await load(establishment.id);
      onSaved?.();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  const director = data?.director;

  return (
    <BottomSheet open={open} onClose={onClose} title="Vérification de l'établissement">
      <div className="flex flex-col gap-4">
        <p className="text-[12.5px] text-gray-500">
          <b className="text-gray-700">Option de validation manuelle.</b> L&apos;établissement soumet normalement lui-même
          son KYC/KYB depuis son espace. Utilise ceci uniquement s&apos;il a remis ses justificatifs en main propre à
          l&apos;équipe abc pay (onboarding) — pour confirmer ou modifier son statut sans dépôt en ligne.
        </p>

        {state === "loading" ? (
          <div className="flex flex-col gap-2">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-100" />)}</div>
        ) : state === "error" ? (
          <div className="rounded-2xl bg-gray-100 py-8 text-center text-[13px] text-gray-500">
            Impossible de charger. <button onClick={() => establishment && load(establishment.id)} className="font-bold text-blue-600">Réessayer</button>
          </div>
        ) : (
          <>
            {error ? <div className="rounded-xl bg-red/10 px-3.5 py-2.5 text-[12.5px] font-semibold text-red">{error}</div> : null}

            {/* KYC du responsable */}
            {director ? (
              <section className="rounded-2xl border border-gray-100 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <IdCard className="size-[18px] text-blue-600" strokeWidth={2} />
                  <h3 className="font-display text-[13.5px] font-bold text-ink">Identité du responsable (KYC)</h3>
                </div>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[13px] font-bold text-ink">{director.name ?? "—"}</div>
                    <div className="text-[11.5px] text-gray-500">{director.phone ?? "—"}{director.kyc_required ? "" : " · KYC non exigé"}</div>
                  </div>
                  <StatusBadge status={director.kyc_status} />
                </div>
                <div className="flex gap-2">
                  <Button fullWidth={false} variant="outline" icon={XCircle} disabled={busy === "kyc"} onClick={() => decideKyc("reject")}>Rejeter</Button>
                  <Button fullWidth={false} icon={BadgeCheck} disabled={busy === "kyc" || director.kyc_status === "approved"} onClick={() => decideKyc("approve")}>
                    {director.kyc_status === "approved" ? "Vérifiée" : "Vérifier l'identité"}
                  </Button>
                </div>
              </section>
            ) : (
              <div className="rounded-xl bg-gray-100 px-3.5 py-2.5 text-[12px] text-gray-500">Aucun compte responsable rattaché.</div>
            )}

            {/* Documents KYB */}
            <section className="rounded-2xl border border-gray-100 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-[18px] text-blue-600" strokeWidth={2} />
                  <h3 className="font-display text-[13.5px] font-bold text-ink">Documents d&apos;entreprise (KYB)</h3>
                </div>
                {data ? (
                  <span className="text-[11px] font-semibold text-gray-500">{data.completeness.approved}/{data.completeness.required} obligatoires</span>
                ) : null}
              </div>

              {(data?.items.length ?? 0) === 0 ? (
                <p className="py-2 text-center text-[12.5px] text-gray-500">Aucune pièce applicable.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {data!.items.map((doc) => (
                    <DocRow key={doc.type} doc={doc} busy={busy === doc.type} onDecide={decideDoc} />
                  ))}
                </div>
              )}

              {data?.completeness.complete ? (
                <div className="mt-3 rounded-xl bg-success-bg px-3.5 py-2.5 text-[12px] font-semibold text-green">✓ KYB complet — l&apos;établissement peut être encaissé.</div>
              ) : null}
            </section>
          </>
        )}

        <Button variant="outline" onClick={onClose}>Fermer</Button>
      </div>
    </BottomSheet>
  );
}

/** Ligne d'une pièce KYB : statut + n° (si requis) + Approuver / Rejeter. */
function DocRow({
  doc,
  busy,
  onDecide,
}: {
  doc: EstablishmentVerification["items"][number];
  busy: boolean;
  onDecide: (type: string, status: "approved" | "rejected", number?: string) => void;
}) {
  const [number, setNumber] = useState(doc.number ?? "");

  return (
    <div className="rounded-xl bg-gray-100 p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <div className="text-[12.5px] font-bold text-ink">{doc.label}{doc.required ? <span className="text-red"> *</span> : null}</div>
          {doc.hint ? <div className="text-[11px] text-gray-500">{doc.hint}</div> : null}
        </div>
        <StatusBadge status={doc.status} />
      </div>
      {doc.needs_number ? (
        <input
          type="text"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="N° du document"
          className="mb-2 w-full rounded-lg border-[1.5px] border-white bg-white px-3 py-2 text-[12.5px] text-ink placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
        />
      ) : null}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onDecide(doc.type, "rejected")}
          className="flex-1 rounded-lg bg-white py-2 text-[12px] font-bold text-red disabled:opacity-50 hover:opacity-80"
        >
          Rejeter
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onDecide(doc.type, "approved", number.trim() || undefined)}
          className="flex-1 rounded-lg bg-grad-primary py-2 text-[12px] font-bold text-white disabled:opacity-50 hover:opacity-90"
        >
          {doc.status === "approved" ? "Réapprouver" : "Approuver"}
        </button>
      </div>
    </div>
  );
}
