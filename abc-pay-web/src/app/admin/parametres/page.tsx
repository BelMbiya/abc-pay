"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, LogOut, Coins } from "lucide-react";
import { Button, Field, useToast } from "@/components/ui";
import { PageHeader } from "@/components/backoffice/StatCard";
import { getAdminUser, clearAdminToken, updateAdminProfile, type AdminUser } from "@/lib/admin-auth";
import { fetchSettings, updateCurrency, updateRate, updateTransferCap, CURRENCIES } from "@/lib/settings-api";
import { setCurrencyCode, setRate } from "@/lib/money";
import { ApiError } from "@/lib/api";

export default function AdminParametresPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currency, setCurrency] = useState("USD");
  const [rate, setRateInput] = useState("2800");
  const [cap, setCap] = useState("10000");
  const [savingCurrency, setSavingCurrency] = useState(false);
  const [savingRate, setSavingRate] = useState(false);
  const [savingCap, setSavingCap] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- init depuis localStorage + API */
    const u = getAdminUser();
    setAdmin(u);
    setName(u?.name ?? "");
    setEmail(u?.email ?? "");
    fetchSettings().then((s) => { setCurrency(s.currency); setRateInput(String(s.usd_cdf_rate)); setCap(String(s.transfer_cap)); }).catch(() => {});
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const saveCap = async () => {
    setSavingCap(true);
    try {
      const s = await updateTransferCap(Number(cap) || 10000);
      setCap(String(s.transfer_cap));
      showToast("Plafond mis à jour");
    } catch {
      showToast("Changement impossible");
    } finally {
      setSavingCap(false);
    }
  };

  const saveRate = async () => {
    setSavingRate(true);
    try {
      const s = await updateRate(Number(rate) || 2800);
      setRateInput(String(s.usd_cdf_rate));
      setRate(s.usd_cdf_rate);
      showToast("Taux de change mis à jour");
    } catch {
      showToast("Changement impossible");
    } finally {
      setSavingRate(false);
    }
  };

  const saveProfile = async () => {
    setProfileError(null);
    setSavingProfile(true);
    try {
      const patch: { name?: string; email?: string; password?: string } = {};
      if (name.trim() && name !== admin?.name) patch.name = name.trim();
      if (email.trim() && email !== admin?.email) patch.email = email.trim();
      if (password) patch.password = password;
      if (Object.keys(patch).length === 0) {
        showToast("Aucune modification");
      } else {
        const updated = await updateAdminProfile(patch);
        setAdmin(updated);
        setPassword("");
        showToast("Profil mis à jour");
      }
    } catch (e) {
      setProfileError(e instanceof ApiError ? e.message : "Enregistrement impossible.");
    } finally {
      setSavingProfile(false);
    }
  };

  const saveCurrency = async (c: string) => {
    setSavingCurrency(true);
    try {
      const s = await updateCurrency(c);
      setCurrency(s.currency);
      setCurrencyCode(s.currency); // adapte l'affichage immédiatement
      showToast(`Devise : ${s.currency}`);
    } catch {
      showToast("Changement impossible");
    } finally {
      setSavingCurrency(false);
    }
  };

  const logout = () => {
    clearAdminToken();
    router.replace("/admin-connexion");
  };

  return (
    <div className="mx-auto w-full max-w-[720px] px-5 py-6 md:px-8 md:py-8">
      <PageHeader title="Paramètres" subtitle="Compte administrateur et configuration de la plateforme" />

      {/* Profil admin (éditable) */}
      <div className="mb-4 rounded-2xl bg-gray-100 p-5">
        <div className="mb-3 flex items-center gap-2"><ShieldCheck className="size-[18px] text-blue-600" strokeWidth={2.2} /><h2 className="font-display text-[14px] font-bold text-ink">Mon compte</h2></div>
        <Field label="Nom" value={name} onChange={(e) => setName(e.target.value)} />
        <Field label="Email" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Nouveau mot de passe" type="password" autoComplete="new-password" placeholder="Laisser vide pour ne pas changer" value={password} onChange={(e) => setPassword(e.target.value)} />
        {profileError ? <p className="mt-3 text-[12.5px] font-semibold text-red">{profileError}</p> : null}
        <Button className="mt-4" fullWidth={false} disabled={savingProfile} onClick={saveProfile}>{savingProfile ? "Enregistrement…" : "Enregistrer"}</Button>
      </div>

      {/* Devise plateforme */}
      <div className="mb-4 rounded-2xl bg-gray-100 p-5">
        <div className="mb-2 flex items-center gap-2"><Coins className="size-[18px] text-gold-600" strokeWidth={2.2} /><h2 className="font-display text-[14px] font-bold text-ink">Devise de la plateforme</h2></div>
        <p className="mb-3 text-[11.5px] leading-relaxed text-gray-500">Détermine la devise affichée partout et enregistrée sur les nouvelles transactions.</p>
        <div className="flex flex-wrap gap-2">
          {CURRENCIES.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={savingCurrency}
              onClick={() => saveCurrency(c.id)}
              className={`rounded-pill px-4 py-2.5 text-[12.5px] font-bold transition-colors disabled:opacity-50 ${currency === c.id ? "bg-grad-primary text-white" : "bg-white text-ink hover:bg-gray-300/30"}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Taux de change (pour agréger les devises différentes) */}
        <p className="mb-1.5 mt-5 text-[12.5px] font-bold text-gray-700">Taux de change — 1 USD = ? CDF</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            value={rate}
            onChange={(e) => setRateInput(e.target.value)}
            className="w-40 rounded-[12px] border-[1.5px] border-gray-100 bg-white px-3.5 py-2.5 text-[14px] font-bold text-ink focus:border-blue-500 focus:outline-none"
          />
          <button type="button" disabled={savingRate} onClick={saveRate} className="rounded-[12px] bg-ink px-4 py-2.5 text-[12.5px] font-bold text-white disabled:opacity-50">
            {savingRate ? "…" : "Enregistrer"}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-gray-500">Sert à convertir les montants USD/CDF dans les totaux plateforme.</p>
      </div>

      {/* Limites */}
      <div className="mb-4 rounded-2xl bg-gray-100 p-5">
        <h2 className="mb-1.5 font-display text-[14px] font-bold text-ink">Plafond de transfert</h2>
        <p className="mb-3 text-[11.5px] leading-relaxed text-gray-500">Montant maximum autorisé par envoi (en USD). Au-delà, l&apos;opération échoue et l&apos;expéditeur est notifié. Les montants en CDF sont convertis avant contrôle.</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            value={cap}
            onChange={(e) => setCap(e.target.value)}
            className="w-40 rounded-[12px] border-[1.5px] border-gray-100 bg-white px-3.5 py-2.5 text-[14px] font-bold text-ink focus:border-blue-500 focus:outline-none"
          />
          <span className="text-[13px] font-bold text-gray-500">USD</span>
          <button type="button" disabled={savingCap} onClick={saveCap} className="rounded-[12px] bg-ink px-4 py-2.5 text-[12.5px] font-bold text-white disabled:opacity-50">
            {savingCap ? "…" : "Enregistrer"}
          </button>
        </div>
      </div>

      <button type="button" onClick={logout} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red/10 px-4 py-3 text-[13px] font-bold text-red hover:bg-red/15">
        <LogOut className="size-4" strokeWidth={2.2} /> Se déconnecter
      </button>
    </div>
  );
}
