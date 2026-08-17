"use client";

import { useState } from "react";
import { UploadCloud, ImageIcon, ShieldCheck, Clock, LogOut } from "lucide-react";
import { Button } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { submitStaffKyc, type KycRecord } from "@/lib/kyc-api";
import { clearStaffToken } from "@/lib/staff-auth";

function FilePick({ label, file, onPick, required }: { label: string; file: File | null; onPick: (f: File | null) => void; required?: boolean }) {
  return (
    <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-xl border-[1.5px] border-dashed border-gray-300 bg-gray-100/60 px-4 py-3.5">
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

/** Mur de vérification : un compte staff « à vérifier » ne voit que cet écran tant que non approuvé. */
export function StaffKycWall({ status, rejectReason, onSubmitted }: {
  status: string;
  rejectReason?: string | null;
  onSubmitted?: (rec: KycRecord) => void;
}) {
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = status === "pending";

  const submit = async () => {
    if (!front || !selfie) { setError("Le recto de la pièce et le selfie sont obligatoires"); return; }
    setBusy(true); setError(null);
    try {
      const rec = await submitStaffKyc({ front, selfie, back });
      onSubmitted?.(rec);
    } catch (e) {
      const field = e instanceof ApiError ? Object.values(e.fields ?? {})[0]?.[0] : undefined;
      setError(field ?? (e instanceof ApiError ? e.message : "Envoi impossible"));
    } finally { setBusy(false); }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gray-100 px-5 py-10">
      <div className="w-full max-w-[440px] rounded-2xl bg-white p-6 shadow-hero">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-grad-navy text-gold-400"><ShieldCheck className="size-6" strokeWidth={2} /></span>
        <h1 className="mt-4 font-display text-[19px] font-extrabold tracking-tight text-ink">Vérifie ton identité</h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500">
          Ce compte doit être vérifié avant d&apos;accéder à l&apos;espace établissement. Dépose ta pièce d&apos;identité et un selfie : un administrateur abc pay validera ton accès.
        </p>

        {pending ? (
          <div className="mt-5 flex items-center gap-3 rounded-xl bg-fee-bg p-4 text-gold-600">
            <Clock className="size-5 shrink-0" strokeWidth={2.2} />
            <p className="text-[13px] font-semibold">Pièces reçues — vérification en cours. Tu recevras une notification dès validation.</p>
          </div>
        ) : (
          <>
            {status === "rejected" && rejectReason ? (
              <p className="mt-4 rounded-xl bg-[#FDE7E8] p-3 text-[12.5px] font-semibold text-red">Précédent refus : {rejectReason}. Soumets de nouvelles pièces.</p>
            ) : null}
            <FilePick label="Pièce d'identité — recto" file={front} onPick={setFront} required />
            <FilePick label="Pièce d'identité — verso (optionnel)" file={back} onPick={setBack} />
            <FilePick label="Selfie" file={selfie} onPick={setSelfie} required />
            {error ? <p className="mt-3 rounded-lg bg-[#FDE7E8] px-3 py-2 text-[12px] font-semibold text-red">{error}</p> : null}
            <Button className="mt-5 w-full" disabled={busy || !front || !selfie} onClick={submit}>{busy ? "Envoi…" : "Envoyer pour vérification"}</Button>
          </>
        )}

        <button type="button" onClick={() => { clearStaffToken(); window.location.href = "/etablissement-connexion"; }} className="mt-4 flex w-full items-center justify-center gap-1.5 text-[12.5px] font-bold text-gray-500 hover:text-ink">
          <LogOut className="size-4" strokeWidth={2.2} /> Se déconnecter
        </button>
      </div>
    </div>
  );
}
