"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Phone } from "lucide-react";
import { Button, BottomSheet } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { requestOtp, verifyOtp, resetOtp, firebaseEnabled } from "@/lib/auth-api";
import { fetchMe } from "@/lib/profile-api";
import { ApiError } from "@/lib/api";

export default function ConnexionPage() {
  const router = useRouter();
  const { ready, token, login } = useAuth();
  const [phone, setPhone] = useState("+243 ");
  const [code, setCode] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && token) router.replace("/");
  }, [ready, token, router]);

  const normalized = phone.replace(/\s/g, "");
  const phoneValid = /^\+\d{9,15}$/.test(normalized);

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
      const { token: jwt, refresh, user } = await verifyOtp(normalized, code);
      login(jwt, user, refresh);
      // Nouveau compte / profil incomplet → parcours d'inscription (infos KYC + conditions).
      // Erreur de lecture du profil : on n'empêche pas l'entrée (dégradation gracieuse).
      let complete = true;
      try {
        complete = (await fetchMe()).kyc_complete;
      } catch {
        complete = true;
      }
      router.replace(complete ? "/" : "/inscription");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Code invalide. Réessaie.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col px-6 py-8">
      <button
        type="button"
        onClick={() => router.push("/bienvenue")}
        aria-label="Retour"
        className="mb-8 flex size-9 items-center justify-center rounded-lg bg-gray-100 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <ArrowLeft className="size-[18px]" strokeWidth={2.2} />
      </button>

      <div className="flex flex-1 flex-col">
        <h1 className="font-display text-[24px] font-extrabold tracking-tight text-ink">Connexion</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-gray-500">
          Saisis ton numéro de téléphone. On t&apos;envoie un code de vérification par SMS.
        </p>

        <label htmlFor="phone" className="mb-[7px] mt-8 text-[12.5px] font-bold text-gray-700">
          Numéro de téléphone
        </label>
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

        <Button className="mt-auto" disabled={!phoneValid || loading} onClick={sendCode}>
          {loading ? "Envoi…" : "Recevoir le code"}
        </Button>

        {/* Conteneur reCAPTCHA invisible (requis par Firebase Phone Auth). */}
        <div id="recaptcha-container" />
      </div>

      {/* OTP en feuille coulissante */}
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
