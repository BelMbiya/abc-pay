"use client";

import { useState } from "react";
import { BottomSheet, Button, useToast } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { money } from "@/lib/money";

/**
 * Feuille de demande de remboursement, réutilisable côté payeur et établissement.
 * `onSubmit(reason)` porte l'appel API propre à l'espace ; la feuille gère la saisie du motif.
 */
export function RefundRequestSheet({
  open, onClose, title, amount, currency, onSubmit, onDone,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  amount: number;
  currency: string;
  onSubmit: (reason: string) => Promise<void>;
  onDone?: () => void;
}) {
  const { showToast } = useToast();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!reason.trim()) { showToast("Indique un motif"); return; }
    setBusy(true);
    try {
      await onSubmit(reason.trim());
      showToast("Demande de remboursement envoyée");
      setReason("");
      onDone?.();
      onClose();
    } catch (e) {
      const field = e instanceof ApiError ? Object.values(e.fields ?? {})[0]?.[0] : undefined;
      showToast(field ?? (e instanceof ApiError ? e.message : "Demande impossible"));
    } finally { setBusy(false); }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Demander un remboursement">
      <p className="text-[12.5px] leading-relaxed text-gray-500">
        {title} · <b className="text-ink">{money(amount, currency)}</b>. Ta demande sera examinée puis validée. Le remboursement, s&apos;il est accordé, est effectué vers la source du paiement.
      </p>
      <label className="mb-[7px] mt-3.5 block text-[12.5px] font-bold text-gray-700">Motif<span className="ml-0.5 text-red">*</span></label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        placeholder="Ex : double paiement, erreur de montant, service non rendu…"
        className="w-full resize-y rounded-[13px] border-[1.5px] border-gray-100 bg-gray-100 p-3.5 text-[14px] leading-relaxed text-ink placeholder:text-gray-500 focus:border-blue-500 focus:bg-white focus:outline-none"
      />
      <Button className="mt-5 w-full" disabled={busy} onClick={submit}>Envoyer la demande</Button>
    </BottomSheet>
  );
}
