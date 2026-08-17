"use client";

import { useState } from "react";
import { KeyRound, LogOut } from "lucide-react";
import { Button } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { changeStaffPassword, clearStaffToken } from "@/lib/staff-auth";

/** Mur de 1re connexion : le compte doit changer son mot de passe provisoire avant tout accès. */
export function StaffPasswordWall({ onDone }: { onDone: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (next.length < 8) { setError("Le nouveau mot de passe doit faire au moins 8 caractères"); return; }
    if (next !== confirm) { setError("Les deux mots de passe ne correspondent pas"); return; }
    if (next === current) { setError("Le nouveau mot de passe doit être différent de l'actuel"); return; }
    setBusy(true); setError(null);
    try {
      await changeStaffPassword(current, next);
      onDone();
    } catch (e) {
      const field = e instanceof ApiError ? Object.values(e.fields ?? {})[0]?.[0] : undefined;
      setError(field ?? (e instanceof ApiError ? e.message : "Changement impossible"));
    } finally { setBusy(false); }
  };

  const input = "w-full rounded-[13px] border-[1.5px] border-gray-100 bg-gray-100 p-3.5 text-[14px] text-ink placeholder:text-gray-500 focus:border-blue-500 focus:bg-white focus:outline-none";

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gray-100 px-5 py-10">
      <div className="w-full max-w-[420px] rounded-2xl bg-white p-6 shadow-hero">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-grad-navy text-gold-400"><KeyRound className="size-6" strokeWidth={2} /></span>
        <h1 className="mt-4 font-display text-[19px] font-extrabold tracking-tight text-ink">Change ton mot de passe</h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500">Pour ta sécurité, tu dois remplacer le mot de passe provisoire avant d&apos;accéder à ton espace.</p>

        <label className="mb-[7px] mt-4 block text-[12.5px] font-bold text-gray-700">Mot de passe actuel</label>
        <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={input} />
        <label className="mb-[7px] mt-3 block text-[12.5px] font-bold text-gray-700">Nouveau mot de passe</label>
        <input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="8 caractères minimum" className={input} />
        <label className="mb-[7px] mt-3 block text-[12.5px] font-bold text-gray-700">Confirme le nouveau mot de passe</label>
        <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} />

        {error ? <p className="mt-3 rounded-lg bg-[#FDE7E8] px-3 py-2 text-[12px] font-semibold text-red">{error}</p> : null}
        <Button className="mt-5 w-full" disabled={busy || !current || !next || !confirm} onClick={submit}>{busy ? "Enregistrement…" : "Changer le mot de passe"}</Button>

        <button type="button" onClick={() => { clearStaffToken(); window.location.href = "/etablissement-connexion"; }} className="mt-4 flex w-full items-center justify-center gap-1.5 text-[12.5px] font-bold text-gray-500 hover:text-ink">
          <LogOut className="size-4" strokeWidth={2.2} /> Se déconnecter
        </button>
      </div>
    </div>
  );
}
