"use client";

import { useState } from "react";
import { UploadCloud, ImageIcon } from "lucide-react";
import { BottomSheet, Button, useToast } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { submitKyc, type KycRecord, type KycStatusValue } from "@/lib/kyc-api";

const STATUS_MSG: Record<KycStatusValue, { label: string; cls: string } | null> = {
  none: null,
  pending: { label: "En attente de vérification", cls: "bg-fee-bg text-gold-600" },
  approved: { label: "Identité vérifiée", cls: "bg-success-bg text-green" },
  rejected: { label: "Refusée — soumets de nouvelles pièces", cls: "bg-[#FDE7E8] text-red" },
};

function FilePick({ label, file, onPick, required }: { label: string; file: File | null; onPick: (f: File | null) => void; required?: boolean }) {
  return (
    <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-xl border-[1.5px] border-dashed border-gray-300 bg-gray-100/50 px-4 py-3.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600">
        {file ? <ImageIcon className="size-4" strokeWidth={2.2} /> : <UploadCloud className="size-4" strokeWidth={2.2} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-bold text-ink">{label}{required ? <span className="ml-0.5 text-red">*</span> : null}</span>
        <span className="block truncate text-[11.5px] text-gray-500">{file ? file.name : "JPG ou PNG"}</span>
      </span>
      <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
    </label>
  );
}

export function KycUploadSheet({ open, onClose, status, onDone }: {
  open: boolean;
  onClose: () => void;
  status: KycStatusValue;
  onDone?: (rec: KycRecord) => void;
}) {
  const { showToast } = useToast();
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const badge = STATUS_MSG[status];

  const submit = async () => {
    if (!front || !selfie) { showToast("Le recto de la pièce et le selfie sont obligatoires"); return; }
    setBusy(true);
    try {
      const rec = await submitKyc({ front, selfie, back });
      showToast(rec.kyc_status === "approved" ? "Identité vérifiée !" : "Pièces envoyées — vérification en cours");
      onDone?.(rec);
      onClose();
    } catch (e) {
      const field = e instanceof ApiError ? Object.values(e.fields ?? {})[0]?.[0] : undefined;
      showToast(field ?? (e instanceof ApiError ? e.message : "Envoi impossible"));
    } finally { setBusy(false); }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Vérifier mon identité">
      {badge ? <span className={`mb-1 inline-block rounded-pill px-2.5 py-1 text-[11px] font-extrabold ${badge.cls}`}>{badge.label}</span> : null}
      <p className="text-[12.5px] leading-relaxed text-gray-500">
        Prends en photo ta pièce d&apos;identité (recto, et verso si utile) et un selfie. Les images sont conservées en privé et servent uniquement à vérifier ton identité.
      </p>
      <FilePick label="Pièce d'identité — recto" file={front} onPick={setFront} required />
      <FilePick label="Pièce d'identité — verso (optionnel)" file={back} onPick={setBack} />
      <FilePick label="Selfie" file={selfie} onPick={setSelfie} required />
      <Button className="mt-5 w-full" disabled={busy || !front || !selfie} onClick={submit}>{busy ? "Envoi…" : "Envoyer pour vérification"}</Button>
    </BottomSheet>
  );
}
