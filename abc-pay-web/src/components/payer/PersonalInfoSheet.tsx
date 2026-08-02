"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, ShieldQuestion } from "lucide-react";
import { BottomSheet, Button, Field, Chip, ChipGroup, useToast } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { fetchMe, updateProfile, GENDERS, ID_DOC_TYPES, type Profile, type ProfileInput } from "@/lib/profile-api";

const REQUIRED: (keyof ProfileInput)[] = ["name", "birth_date", "gender", "address", "city", "id_doc_type", "id_doc_number"];

/**
 * Informations personnelles & KYC (infos seulement).
 * Exige l'identité de l'utilisateur pour « connaître » le titulaire du compte et
 * réutiliser ces infos ailleurs (préremplissage, reçus, conformité BCC).
 * Toute erreur est remontée explicitement (aucune erreur silencieuse).
 */
export function PersonalInfoSheet({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: (p: Profile) => void;
}) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState<ProfileInput>({});
  const [kycComplete, setKycComplete] = useState(false);
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError(null);
    fetchMe()
      .then((p) => {
        if (!active) return;
        setF({
          name: p.name ?? "", email: p.email ?? "", birth_date: p.birth_date ?? "",
          gender: p.gender ?? "", address: p.address ?? "", city: p.city ?? "",
          id_doc_type: p.id_doc_type ?? "", id_doc_number: p.id_doc_number ?? "",
        });
        setKycComplete(p.kyc_complete);
        setPhone(p.phone);
      })
      .catch((e) => active && setError(e instanceof ApiError ? e.message : "Impossible de charger ton profil."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [open]);

  const set = (k: keyof ProfileInput) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  const missing = REQUIRED.filter((k) => !String(f[k] ?? "").trim());
  const canSave = missing.length === 0;

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      // On n'envoie que des valeurs non vides (les champs optionnels vides restent nuls).
      const payload: ProfileInput = {};
      (Object.keys(f) as (keyof ProfileInput)[]).forEach((k) => {
        const v = String(f[k] ?? "").trim();
        if (v) (payload[k] as string) = v;
      });
      const updated = await updateProfile(payload);
      setKycComplete(updated.kyc_complete);
      showToast(updated.kyc_complete ? "Profil vérifié ✓" : "Informations enregistrées");
      onSaved?.(updated);
      onClose();
    } catch (e) {
      // Aucune erreur silencieuse : on affiche la raison exacte (validation incluse).
      if (e instanceof ApiError && e.fields) {
        setError(Object.values(e.fields).flat()[0] ?? e.message);
      } else {
        setError(e instanceof ApiError ? e.message : "Enregistrement impossible. Réessaie.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Informations personnelles">
      {loading ? (
        <div className="flex flex-col gap-3 py-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-11 animate-pulse rounded-[13px] bg-gray-100" />)}
        </div>
      ) : (
        <>
          {/* Statut KYC */}
          <div className={`mb-3 flex items-center gap-2.5 rounded-2xl px-4 py-3 text-[12.5px] font-bold ${kycComplete ? "bg-success-bg text-green" : "bg-fee-bg text-gold-600"}`}>
            {kycComplete ? <BadgeCheck className="size-[18px] shrink-0" strokeWidth={2.2} /> : <ShieldQuestion className="size-[18px] shrink-0" strokeWidth={2.2} />}
            {kycComplete ? "Profil vérifié — ton identité est enregistrée." : "Complète ces informations pour vérifier ton compte."}
          </div>

          <div className="mb-3 rounded-2xl bg-gray-100 px-4 py-2.5 text-[12px] text-gray-500">
            Téléphone du compte : <b className="text-ink">{phone}</b>
          </div>

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

          {error ? <p className="mt-4 text-[12.5px] font-semibold text-red">{error}</p> : null}
          <p className="mt-4 text-[11px] text-gray-500"><span className="text-red">*</span> Champs obligatoires{missing.length ? ` · ${missing.length} restant(s)` : ""}</p>
          <Button className="mt-2" disabled={!canSave || saving} onClick={save}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </>
      )}
    </BottomSheet>
  );
}
