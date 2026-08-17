"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button, useToast } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { fetchStaffSettings, updateStaffSettings, type EstablishmentSettings } from "@/lib/staff-settings-api";

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${on ? "bg-blue-600" : "bg-gray-300"}`}>
      <span className={`inline-block size-5 transform rounded-full bg-white shadow transition-transform ${on ? "translate-x-[22px]" : "translate-x-[2px]"}`} />
    </button>
  );
}

/** Réglages propres à l'établissement (politique de remboursement, notifications). Édition = direction. */
export function EstablishmentSettingsCard({ canEdit }: { canEdit: boolean }) {
  const { showToast } = useToast();
  const [s, setS] = useState<EstablishmentSettings | null>(null);
  const [platformWindow, setPlatformWindow] = useState(30);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchStaffSettings()
      .then((r) => { if (alive) { setS(r.settings); setPlatformWindow(r.platform_refund_window_days); } })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const patch = (p: Partial<EstablishmentSettings>) => { setS((cur) => cur ? { ...cur, ...p } : cur); setDirty(true); };

  const save = async () => {
    if (!s) return;
    setBusy(true);
    try {
      const r = await updateStaffSettings(s);
      setS(r.settings);
      setDirty(false);
      showToast("Réglages enregistrés");
    } catch (e) {
      const field = e instanceof ApiError ? Object.values(e.fields ?? {})[0]?.[0] : undefined;
      showToast(field ?? (e instanceof ApiError ? e.message : "Enregistrement impossible"));
    } finally { setBusy(false); }
  };

  if (!s) return null;
  const usePlatform = s.refund_window_days === null;

  return (
    <div className="mb-6 rounded-2xl border-[1.5px] border-gray-100 bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <SlidersHorizontal className="size-[18px] text-blue-600" strokeWidth={2.2} />
        <h2 className="font-display text-[15px] font-bold text-ink">Réglages de l&apos;établissement</h2>
      </div>
      {!canEdit ? <p className="mb-3 text-[11.5px] font-semibold text-gray-500">Lecture seule — seule la direction peut modifier ces réglages.</p> : null}

      <div className="flex flex-col divide-y divide-gray-100">
        <div className="flex items-center justify-between gap-4 py-3">
          <div className="min-w-0">
            <div className="text-[13.5px] font-bold text-ink">Accepter les demandes de remboursement</div>
            <div className="text-[11.5px] text-gray-500">Si désactivé, aucun remboursement ne peut être demandé sur tes encaissements.</div>
          </div>
          <Toggle on={s.accept_refunds} disabled={!canEdit} onChange={(v) => patch({ accept_refunds: v })} />
        </div>

        <div className="py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[13.5px] font-bold text-ink">Délai de remboursement</div>
              <div className="text-[11.5px] text-gray-500">Au-delà, un remboursement n&apos;est plus possible.</div>
            </div>
            <Toggle on={!usePlatform} disabled={!canEdit} onChange={(v) => patch({ refund_window_days: v ? platformWindow : null })} />
          </div>
          {usePlatform ? (
            <p className="mt-2 text-[11.5px] font-semibold text-gray-500">Délai plateforme : {platformWindow} jours.</p>
          ) : (
            <div className="mt-2 flex items-center gap-2">
              <input type="number" min={1} max={3650} disabled={!canEdit} value={s.refund_window_days ?? platformWindow}
                onChange={(e) => patch({ refund_window_days: Math.max(1, Number(e.target.value) || 1) })}
                className="w-24 rounded-lg border-[1.5px] border-gray-100 bg-gray-100 px-3 py-2 text-[13px] font-semibold text-ink focus:border-blue-500 focus:bg-white focus:outline-none" />
              <span className="text-[12.5px] text-gray-500">jours (personnalisé)</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 py-3">
          <div className="min-w-0">
            <div className="text-[13.5px] font-bold text-ink">Notifier le personnel à chaque encaissement</div>
            <div className="text-[11.5px] text-gray-500">Chaque paiement reçu déclenche une notification dans l&apos;espace du personnel.</div>
          </div>
          <Toggle on={s.notify_staff_on_payment} disabled={!canEdit} onChange={(v) => patch({ notify_staff_on_payment: v })} />
        </div>
      </div>

      {canEdit ? <Button className="mt-4" disabled={busy || !dirty} onClick={save}>{busy ? "Enregistrement…" : "Enregistrer les réglages"}</Button> : null}
    </div>
  );
}
