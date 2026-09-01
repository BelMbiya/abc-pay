"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LogOut } from "lucide-react";
import { Button, useToast } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { changeAdminPassword, clearAdminToken, getAdminUser } from "@/lib/admin-auth";

/**
 * Mon compte (admin) — accessible à TOUS les rôles (page non gardée par permission).
 * Changement de son propre mot de passe + déconnexion.
 */
export default function AdminAccountPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const user = getAdminUser();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (next.length < 8) { setError("Le nouveau mot de passe doit faire au moins 8 caractères."); return; }
    if (next !== confirm) { setError("Les deux mots de passe ne correspondent pas."); return; }
    if (next === current) { setError("Le nouveau mot de passe doit être différent de l'actuel."); return; }
    setBusy(true); setError(null);
    try {
      await changeAdminPassword(current, next);
      setCurrent(""); setNext(""); setConfirm("");
      showToast("Mot de passe changé");
    } catch (e) {
      const field = e instanceof ApiError ? Object.values(e.fields ?? {})[0]?.[0] : undefined;
      setError(field ?? (e instanceof ApiError ? e.message : "Changement impossible."));
    } finally { setBusy(false); }
  };

  const input = "w-full rounded-[13px] border-[1.5px] border-gray-100 bg-gray-100 p-3.5 text-[14px] text-ink placeholder:text-gray-500 focus:border-blue-500 focus:bg-white focus:outline-none";

  return (
    <div className="mx-auto w-full max-w-app px-5 py-8 md:px-8">
      <h1 className="font-display text-[22px] font-extrabold tracking-tight text-ink">Mon compte</h1>
      <p className="mt-1 text-[13px] text-gray-500">{user?.name ?? user?.email} · {user?.role}</p>

      <div className="mt-6 max-w-[440px] rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-grad-navy text-gold-400"><KeyRound className="size-5" strokeWidth={2} /></span>
        <h2 className="mt-3.5 font-display text-[16px] font-bold text-ink">Changer mon mot de passe</h2>

        <label className="mb-[7px] mt-4 block text-[12.5px] font-bold text-gray-700">Mot de passe actuel</label>
        <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={input} />
        <label className="mb-[7px] mt-3 block text-[12.5px] font-bold text-gray-700">Nouveau mot de passe</label>
        <input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="8 caractères minimum" className={input} />
        <label className="mb-[7px] mt-3 block text-[12.5px] font-bold text-gray-700">Confirme le nouveau mot de passe</label>
        <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} />

        {error ? <p className="mt-3 rounded-lg bg-[#FDE7E8] px-3 py-2 text-[12px] font-semibold text-red">{error}</p> : null}
        <Button className="mt-5 w-full" disabled={busy || !current || !next || !confirm} onClick={submit}>{busy ? "Enregistrement…" : "Changer le mot de passe"}</Button>
      </div>

      <button
        type="button"
        onClick={() => { clearAdminToken(); router.replace("/admin-connexion"); }}
        className="mt-6 flex items-center gap-2 text-[13px] font-bold text-red hover:underline"
      >
        <LogOut className="size-4" strokeWidth={2.2} /> Se déconnecter
      </button>
    </div>
  );
}
