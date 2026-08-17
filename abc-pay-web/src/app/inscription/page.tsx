"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck, Phone } from "lucide-react";
import { Button, Field, BottomSheet } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { requestOtp, verifyOtp, resetOtp, firebaseEnabled, type SignupProfile } from "@/lib/auth-api";
import { type ProfileInput } from "@/lib/profile-api";

type Step = "infos" | "conditions";

/**
 * INSCRIPTION — seul point de CRÉATION d'un compte payeur (acte délibéré).
 * Parcours : identité (nom + numéro requis, KYC optionnel) → conditions →
 * vérification du numéro par code SMS → le compte est créé À CE MOMENT (avec l'identité)
 * puis la session s'ouvre. Aucune session préalable requise : c'est ici qu'elle naît.
 */
export default function InscriptionPage() {
  const router = useRouter();
  const { ready, token, login } = useAuth();
  const [step, setStep] = useState<Step>("infos");
  const [phone, setPhone] = useState("+243 ");
  const [f, setF] = useState<ProfileInput>({});
  const [accepted, setAccepted] = useState(false);
  const [code, setCode] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Déjà connecté → l'app. Numéro pré-rempli depuis la connexion (?tel=), après montage.
  useEffect(() => {
    if (ready && token) { router.replace("/"); return; }
    const tel = new URLSearchParams(window.location.search).get("tel");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pré-remplissage depuis l'URL (one-shot)
    if (tel) setPhone(tel);
  }, [ready, token, router]);

  const set = (k: keyof ProfileInput) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  const normalized = phone.replace(/\s/g, "");
  const phoneValid = /^\+\d{9,15}$/.test(normalized);
  const nameValid = String(f.name ?? "").trim().length >= 2;

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
    setLoading(true);
    try {
      // Inscription minimale : nom + numéro suffisent. L'identité (pièce, adresse…)
      // se complète plus tard, au moment où une opération l'exige (KYC).
      const profile: SignupProfile = { name: String(f.name).trim() };

      const { token: jwt, refresh, user } = await verifyOtp(normalized, code, "signup", profile);
      login(jwt, user, refresh);
      router.replace("/");
    } catch (e) {
      setSheetOpen(false);
      if (e instanceof ApiError && e.fields) setError(Object.values(e.fields).flat()[0] ?? e.message);
      else setError(e instanceof ApiError ? e.message : "Création impossible. Réessaie.");
      setStep("infos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col px-6 py-8">
      <button
        type="button"
        onClick={() => (step === "conditions" ? setStep("infos") : router.push("/bienvenue"))}
        aria-label="Retour"
        className="mb-6 flex size-9 items-center justify-center rounded-lg bg-gray-100 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <ArrowLeft className="size-[18px]" strokeWidth={2.2} />
      </button>

      {step === "infos" ? (
        <div className="flex flex-1 flex-col">
          <h1 className="font-display text-[22px] font-extrabold tracking-tight text-ink">Créer ton compte</h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500">Ton nom et ton numéro suffisent pour démarrer. Tu complèteras ton identité depuis ton profil, seulement quand une opération l&apos;exige.</p>

          <div className="mt-5">
            <label htmlFor="phone" className="mb-[7px] block text-[12.5px] font-bold text-gray-700">Numéro de téléphone <span className="text-red">*</span></label>
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

            <Field label="Nom complet" required placeholder="Ex : Grace Mbuyi" value={f.name ?? ""} onChange={set("name")} />
          </div>

          {error ? <p className="mt-4 text-[12.5px] font-semibold text-red">{error}</p> : null}
          <p className="mt-4 text-[11px] text-gray-500"><span className="text-red">*</span> Nom et numéro obligatoires</p>
          <Button className="mt-2" disabled={!nameValid || !phoneValid} onClick={() => { setError(null); setStep("conditions"); }}>Continuer</Button>

          <p className="mt-3 text-center text-[12.5px] text-gray-500">
            Déjà un compte ?{" "}
            <button type="button" onClick={() => router.push("/connexion")} className="font-bold text-blue-600">Se connecter</button>
          </p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col">
          <h1 className="font-display text-[22px] font-extrabold tracking-tight text-ink">Dernière étape</h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500">On vérifie ton numéro par SMS, puis on crée ton compte.</p>

          <div className="mt-5 rounded-2xl bg-gray-100 p-4 text-[12px] leading-relaxed text-gray-500">
            En utilisant abc pay, tu acceptes de fournir des informations exactes et de respecter la réglementation en vigueur en RDC. Tes données d&apos;identité servent uniquement à fournir le service, prévenir la fraude et respecter nos obligations légales. Elles ne sont jamais vendues à des tiers.
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-3">
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 size-[18px] shrink-0 accent-blue-600" />
            <span className="text-[12.5px] leading-relaxed text-gray-700">J&apos;ai lu et j&apos;accepte les <b className="text-ink">Conditions d&apos;utilisation</b> et la <b className="text-ink">Politique de confidentialité</b> d&apos;abc pay.</span>
          </label>

          {error ? <p className="mt-4 text-[12.5px] font-semibold text-red">{error}</p> : null}
          <div className="mt-auto flex items-center gap-2 rounded-2xl bg-success-bg px-4 py-3 text-[12px] font-semibold text-green">
            <ShieldCheck className="size-4 shrink-0" strokeWidth={2.2} /> Tes informations sont chiffrées et protégées.
          </div>
          <Button className="mt-3" disabled={!accepted || loading} onClick={sendCode}>{loading ? "Envoi…" : "Recevoir le code"}</Button>
        </div>
      )}

      {/* Conteneur reCAPTCHA invisible (requis par Firebase Phone Auth). */}
      <div id="recaptcha-container" />

      {/* Vérification OTP → création du compte */}
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
          {loading ? "Création…" : "Vérifier et créer mon compte"}
        </Button>
      </BottomSheet>
    </main>
  );
}
