"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Button, Field, Chip, ChipGroup } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { updateProfile, GENDERS, ID_DOC_TYPES, type ProfileInput } from "@/lib/profile-api";

type Step = "infos" | "conditions";
const REQUIRED: (keyof ProfileInput)[] = ["name", "birth_date", "gender", "address", "city", "id_doc_type", "id_doc_number"];

/**
 * Création de compte « lambda » — une personne autonome (non liée à un établissement).
 * Parcours : infos d'identité (KYC infos seulement) → conditions → entrée dans l'app.
 * Pas d'étape de liaison de compte. Requiert un utilisateur déjà authentifié (OTP).
 */
export default function InscriptionPage() {
  const router = useRouter();
  const { ready, token } = useAuth();
  const [step, setStep] = useState<Step>("infos");
  const [f, setF] = useState<ProfileInput>({});
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sans session, on renvoie vers la connexion (l'inscription suit l'OTP).
  useEffect(() => {
    if (ready && !token) router.replace("/connexion");
  }, [ready, token, router]);

  const set = (k: keyof ProfileInput) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  const missing = REQUIRED.filter((k) => !String(f[k] ?? "").trim());

  const finish = async () => {
    setError(null);
    setSaving(true);
    try {
      const payload: ProfileInput = {};
      (Object.keys(f) as (keyof ProfileInput)[]).forEach((k) => {
        const v = String(f[k] ?? "").trim();
        if (v) (payload[k] as string) = v;
      });
      await updateProfile(payload);
      router.replace("/");
    } catch (e) {
      // Aucune erreur silencieuse : raison exacte affichée.
      if (e instanceof ApiError && e.fields) setError(Object.values(e.fields).flat()[0] ?? e.message);
      else setError(e instanceof ApiError ? e.message : "Création impossible. Réessaie.");
      setStep("infos");
    } finally {
      setSaving(false);
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
          <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500">Ces informations nous permettent de connaître le titulaire du compte et de sécuriser tes opérations.</p>

          <div className="mt-5">
            <Field label="Nom complet" required placeholder="Ex : Grace Mbuyi" value={f.name ?? ""} onChange={set("name")} />
            <Field label="Date de naissance" required type="date" value={f.birth_date ?? ""} onChange={set("birth_date")} />
            <p className="mb-1.5 mt-3.5 text-[12.5px] font-bold text-gray-700">Genre <span className="text-red">*</span></p>
            <ChipGroup>
              {GENDERS.map((g) => <Chip key={g.id} selected={f.gender === g.id} onClick={() => setF((p) => ({ ...p, gender: g.id }))}>{g.label}</Chip>)}
            </ChipGroup>
            <Field label="Adresse" required placeholder="Ex : Av. de la Paix, Gombe" value={f.address ?? ""} onChange={set("address")} />
            <Field label="Ville" required placeholder="Ex : Kinshasa" value={f.city ?? ""} onChange={set("city")} />
            <p className="mb-1.5 mt-3.5 text-[12.5px] font-bold text-gray-700">Type de pièce d&apos;identité <span className="text-red">*</span></p>
            <ChipGroup>
              {ID_DOC_TYPES.map((t) => <Chip key={t.id} selected={f.id_doc_type === t.id} onClick={() => setF((p) => ({ ...p, id_doc_type: t.id }))}>{t.label}</Chip>)}
            </ChipGroup>
            <Field label="Numéro de la pièce" required placeholder="N° du document" value={f.id_doc_number ?? ""} onChange={set("id_doc_number")} />
            <Field label="E-mail (facultatif)" type="email" placeholder="toi@exemple.cd" value={f.email ?? ""} onChange={set("email")} />
          </div>

          {error ? <p className="mt-4 text-[12.5px] font-semibold text-red">{error}</p> : null}
          <p className="mt-4 text-[11px] text-gray-500"><span className="text-red">*</span> Champs obligatoires{missing.length ? ` · ${missing.length} restant(s)` : ""}</p>
          <Button className="mt-2" disabled={missing.length > 0} onClick={() => setStep("conditions")}>Continuer</Button>
        </div>
      ) : (
        <div className="flex flex-1 flex-col">
          <h1 className="font-display text-[22px] font-extrabold tracking-tight text-ink">Dernière étape</h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500">Conditions d&apos;utilisation & confidentialité.</p>

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
          <Button className="mt-3" disabled={!accepted || saving} onClick={finish}>{saving ? "Création…" : "Créer mon compte"}</Button>
        </div>
      )}
    </main>
  );
}
