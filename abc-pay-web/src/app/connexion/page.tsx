"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Phone, Mail, Lock, User, Building2 } from "lucide-react";
import { Button, BottomSheet } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { requestOtp, verifyOtp, resetOtp, firebaseEnabled } from "@/lib/auth-api";
import { staffLogin, setStaffSession, getStaffToken } from "@/lib/staff-auth";
import { ApiError } from "@/lib/api";

type Mode = "user" | "establishment";

/**
 * Connexion UNIFIÉE : un seul écran, un toggle « Particulier / Établissement ».
 * Le formulaire s'adapte (OTP téléphone pour le payeur, email+mot de passe pour
 * l'établissement) et redirige vers le bon espace après authentification.
 */
export default function ConnexionPage() {
  const router = useRouter();
  const { ready, token, login } = useAuth();
  const [mode, setMode] = useState<Mode>("user");

  // — Particulier (OTP) —
  const [phone, setPhone] = useState("+243 ");
  const [code, setCode] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [noAccount, setNoAccount] = useState(false);

  // — Établissement (email + mot de passe) —
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Déjà connecté → on renvoie vers l'espace correspondant.
  useEffect(() => {
    if (!ready) return;
    if (token) router.replace("/");
    else if (getStaffToken()) router.replace("/etablissement");
  }, [ready, token, router]);

  // Pré-sélection du toggle via ?espace=etablissement (liens entrants). Lecture UNIQUE
  // d'un paramètre d'URL au montage (synchronisation depuis un système externe = l'URL).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("espace");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seed d'UI depuis l'URL (one-shot)
    if (p === "etablissement" || p === "establishment") setMode("establishment");
  }, []);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setNoAccount(false);
  };

  const normalized = phone.replace(/\s/g, "");
  const phoneValid = /^\+\d{9,15}$/.test(normalized);

  /* ------------------------------ Particulier ----------------------------- */
  const sendCode = async () => {
    setError(null);
    setLoading(true);
    try {
      await requestOtp(normalized);
      setCode("");
      setSheetOpen(true);
    } catch {
      resetOtp();
      setError("Impossible d'envoyer le code. Vérifie le numéro et réessaie.");
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    setError(null);
    setNoAccount(false);
    setLoading(true);
    try {
      const { token: jwt, refresh, user } = await verifyOtp(normalized, code, "login");
      login(jwt, user, refresh);
      // Identité/KYC désormais « paresseux » : on ouvre l'app ; la complétion est
      // demandée seulement au moment d'une opération qui l'exige (depuis le profil).
      router.replace("/");
    } catch (e) {
      if (e instanceof ApiError && e.code === "account_not_found") {
        setSheetOpen(false);
        setNoAccount(true);
        setError(null);
      } else {
        setError(e instanceof ApiError ? e.message : "Code invalide. Réessaie.");
      }
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------- Établissement ---------------------------- */
  const submitStaff = async () => {
    setError(null);
    setLoading(true);
    try {
      const { token: t, refresh, user } = await staffLogin(email.trim(), password);
      setStaffSession(t, user, refresh);
      router.replace("/etablissement");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Connexion impossible.");
    } finally {
      setLoading(false);
    }
  };

  const tab = (m: Mode, label: string, Icon: typeof User) => (
    <button
      type="button"
      onClick={() => switchMode(m)}
      aria-pressed={mode === m}
      className={`flex flex-1 items-center justify-center gap-2 rounded-[11px] py-2.5 text-[13px] font-bold transition-colors ${
        mode === m ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-ink"
      }`}
    >
      <Icon className="size-[16px]" strokeWidth={2.2} />
      {label}
    </button>
  );

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col px-6 py-8">
      <button
        type="button"
        onClick={() => router.push("/bienvenue")}
        aria-label="Retour"
        className="mb-8 flex size-9 items-center justify-center rounded-lg bg-gray-100 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <ArrowLeft className="size-[18px]" strokeWidth={2.2} />
      </button>

      <div className="mb-6 flex items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element -- logo statique */}
        <img src="/logo.png" alt="abc pay" width={34} height={34} className="size-[34px] rounded-[10px] object-contain" />
        <span className="font-display text-[15.5px] font-bold text-ink">abc pay</span>
      </div>

      {/* Toggle Particulier / Établissement */}
      <div className="flex gap-1.5 rounded-[14px] bg-gray-100 p-1.5" role="tablist" aria-label="Type de connexion">
        {tab("user", "Particulier", User)}
        {tab("establishment", "Établissement", Building2)}
      </div>

      {mode === "user" ? (
        <div className="flex flex-1 flex-col">
          <h1 className="mt-7 font-display text-[23px] font-extrabold tracking-tight text-ink">Connexion</h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-gray-500">
            Saisis le numéro de ton compte abc pay. On t&apos;envoie un code de vérification par SMS.
          </p>

          <label htmlFor="phone" className="mb-[7px] mt-7 text-[12.5px] font-bold text-gray-700">Numéro de téléphone</label>
          <div className="flex items-center gap-2 rounded-[13px] border-[1.5px] border-gray-100 bg-gray-100 px-3.5 focus-within:border-blue-500 focus-within:bg-white">
            <Phone className="size-[18px] shrink-0 text-gray-500" strokeWidth={2} />
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+243 81 000 00 00"
              className="w-full bg-transparent py-3.5 text-[14.5px] text-ink placeholder:text-gray-500 focus:outline-none"
            />
          </div>

          {error && !sheetOpen ? <p className="mt-3 text-[12.5px] font-semibold text-red">{error}</p> : null}

          {noAccount ? (
            <div className="mt-4 rounded-2xl bg-gray-100 p-4">
              <p className="text-[13px] font-bold text-ink">Aucun compte pour ce numéro</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-gray-500">
                Ce numéro n&apos;est pas encore inscrit chez abc pay. Crée ton compte — c&apos;est rapide.
              </p>
              <Button className="mt-3 w-full" onClick={() => router.push(`/inscription?tel=${encodeURIComponent(normalized)}`)}>
                Créer mon compte
              </Button>
            </div>
          ) : null}

          <Button className="mt-auto" disabled={!phoneValid || loading} onClick={sendCode}>
            {loading ? "Envoi…" : "Recevoir le code"}
          </Button>

          <p className="mt-3 text-center text-[12.5px] text-gray-500">
            Pas encore de compte ?{" "}
            <button type="button" onClick={() => router.push(`/inscription?tel=${encodeURIComponent(normalized)}`)} className="font-bold text-blue-600">
              Crée ton compte
            </button>
          </p>

          {/* Conteneur reCAPTCHA invisible (requis par Firebase Phone Auth). */}
          <div id="recaptcha-container" />
        </div>
      ) : (
        <div className="flex flex-1 flex-col">
          <h1 className="mt-7 font-display text-[23px] font-extrabold tracking-tight text-ink">Espace établissement</h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-gray-500">Connecte-toi avec l&apos;email et le mot de passe de ton établissement.</p>

          <label htmlFor="email" className="mb-[7px] mt-7 text-[12.5px] font-bold text-gray-700">Email professionnel</label>
          <div className="flex items-center gap-2 rounded-[13px] border-[1.5px] border-gray-100 bg-gray-100 px-3.5 focus-within:border-blue-500 focus-within:bg-white">
            <Mail className="size-[18px] shrink-0 text-gray-500" strokeWidth={2} />
            <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="direction@ets045.cd" className="w-full bg-transparent py-3.5 text-[14.5px] text-ink placeholder:text-gray-500 focus:outline-none" />
          </div>

          <label htmlFor="password" className="mb-[7px] mt-3.5 text-[12.5px] font-bold text-gray-700">Mot de passe</label>
          <div className="flex items-center gap-2 rounded-[13px] border-[1.5px] border-gray-100 bg-gray-100 px-3.5 focus-within:border-blue-500 focus-within:bg-white">
            <Lock className="size-[18px] shrink-0 text-gray-500" strokeWidth={2} />
            <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-transparent py-3.5 text-[14.5px] text-ink placeholder:text-gray-500 focus:outline-none" onKeyDown={(e) => e.key === "Enter" && submitStaff()} />
          </div>

          {error ? <p className="mt-3 text-[12.5px] font-semibold text-red">{error}</p> : null}

          <Button className="mt-auto" disabled={!email || !password || loading} onClick={submitStaff}>
            {loading ? "Connexion…" : "Se connecter"}
          </Button>

          <p className="mt-3 text-center text-[12.5px] text-gray-500">
            Envie de partenariat ?{" "}
            <button type="button" onClick={() => router.push("/bienvenue#partenariat")} className="font-bold text-blue-600">
              Devenir établissement partenaire
            </button>
          </p>
        </div>
      )}

      {/* OTP en feuille coulissante (mode Particulier) */}
      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Vérification">
        <p className="text-[13px] leading-relaxed text-gray-500">
          Saisis le code à 6 chiffres envoyé au <b className="text-ink">{phone.trim()}</b>.
          {!firebaseEnabled ? (
            <>
              <br />
              <span className="text-[11.5px] text-gray-300">(Mode démo : saisis n&apos;importe quels 6 chiffres.)</span>
            </>
          ) : null}
        </p>

        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="••••••"
          className="mt-4 w-full rounded-[13px] border-[1.5px] border-gray-100 bg-gray-100 py-4 text-center font-display text-[24px] font-extrabold tracking-[0.4em] text-ink focus:border-blue-500 focus:bg-white focus:outline-none"
        />

        {error && sheetOpen ? <p className="mt-3 text-[12.5px] font-semibold text-red">{error}</p> : null}

        <Button className="mt-5" disabled={code.length < 6 || loading} onClick={confirm}>
          {loading ? "Vérification…" : "Vérifier et se connecter"}
        </Button>
      </BottomSheet>
    </main>
  );
}
