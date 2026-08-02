"use client";

import { useEffect, useState } from "react";
import { BottomSheet, Button, Field, Chip, ChipGroup, useToast } from "@/components/ui";
import { createEstablishment } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";

const TYPES = ["École maternelle", "École primaire", "École secondaire", "Institut supérieur", "Université"];
const BILLING = [
  { id: "payment_only", label: "Paiement seul" },
  { id: "fee_management", label: "Gestion des soldes" },
] as const;

const CURRENCIES = [
  { id: "USD", label: "USD ($)" },
  { id: "CDF", label: "CDF (FC)" },
];

const EMPTY = {
  name: "", type: TYPES[3], rccm: "", agrement: "", city: "", province: "Kinshasa",
  email: "", phone: "", commission: "2", billing: "payment_only" as string,
  currency: "USD" as string, password: "",
};

/**
 * Onboarder un établissement — crée l'établissement ET son compte de connexion
 * (email + mot de passe « direction ») via l'API super-admin.
 */
export function OnboardEstablishmentSheet({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}) {
  const { showToast } = useToast();
  const [f, setF] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- réinitialisation à l'ouverture */
    if (open) {
      setF({ ...EMPTY });
      setError(null);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  const canSubmit = f.name.trim() && f.email.trim() && f.password.length >= 6;

  const submit = async () => {
    setError(null);
    setSaving(true);
    try {
      await createEstablishment({
        name: f.name.trim(),
        type: f.type,
        city: f.city.trim() || undefined,
        // Champ vidé → on n'envoie rien (le serveur applique son défaut 2%) plutôt que 0.
        commission_rate: f.commission.trim() === "" ? undefined : Number(f.commission),
        currency: f.currency,
        billing_mode: f.billing as "payment_only" | "fee_management",
        login_email: f.email.trim(),
        login_password: f.password,
        login_name: `Direction ${f.name.trim()}`,
      });
      showToast("Établissement créé avec son compte de connexion");
      onCreated?.();
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Création impossible. Réessaie.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Onboarder un établissement">
      {/* Informations administratives */}
      <p className="mb-1 text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-blue-600">Informations administratives</p>
      <Field label="Raison sociale" required placeholder="Ex : Institut Supérieur de Commerce" value={f.name} onChange={set("name")} />
      <p className="mb-1.5 mt-3.5 text-[12.5px] font-bold text-gray-700">Type d&apos;établissement</p>
      <ChipGroup>
        {TYPES.map((t) => <Chip key={t} selected={f.type === t} onClick={() => setF((p) => ({ ...p, type: t }))}>{t}</Chip>)}
      </ChipGroup>
      <Field label="Numéro RCCM" placeholder="Ex : CD/KIN/RCCM/22-B-1234" value={f.rccm} onChange={set("rccm")} />
      <Field label="Agrément ministériel (EPST / ESU)" placeholder="N° d'agrément" value={f.agrement} onChange={set("agrement")} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Ville" placeholder="Ex : Kinshasa" value={f.city} onChange={set("city")} />
        <Field label="Province" placeholder="Ex : Kinshasa" value={f.province} onChange={set("province")} />
      </div>

      {/* Compte de connexion */}
      <p className="mb-1 mt-6 text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-blue-600">Compte de connexion</p>
      <p className="mb-2 text-[11.5px] leading-relaxed text-gray-500">
        Ces identifiants permettront à l&apos;établissement de se connecter à son back-office. Modifiables à tout moment.
      </p>
      <Field label="Email de connexion" required type="email" autoComplete="off" placeholder="direction@etablissement.cd" value={f.email} onChange={set("email")} />
      <Field label="Mot de passe (min. 6)" required type="password" autoComplete="new-password" placeholder="••••••••" value={f.password} onChange={set("password")} />
      <Field label="Téléphone (contact)" type="tel" inputMode="tel" placeholder="+243 81 000 00 00" value={f.phone} onChange={set("phone")} />

      {/* Configuration financière */}
      <p className="mb-1 mt-6 text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-blue-600">Configuration financière</p>
      <p className="mb-1.5 text-[12.5px] font-bold text-gray-700">Mode de facturation</p>
      <ChipGroup>
        {BILLING.map((b) => <Chip key={b.id} selected={f.billing === b.id} onClick={() => setF((p) => ({ ...p, billing: b.id }))}>{b.label}</Chip>)}
      </ChipGroup>
      <Field label="Commission (%)" type="number" inputMode="decimal" value={f.commission} onChange={set("commission")} />
      <p className="mb-1.5 mt-3.5 text-[12.5px] font-bold text-gray-700">Devise de facturation</p>
      <ChipGroup>
        {CURRENCIES.map((c) => <Chip key={c.id} selected={f.currency === c.id} onClick={() => setF((p) => ({ ...p, currency: c.id }))}>{c.label}</Chip>)}
      </ChipGroup>

      {error ? <p className="mt-4 text-[12.5px] font-semibold text-red">{error}</p> : null}
      <p className="mt-4 text-[11px] text-gray-500"><span className="text-red">*</span> Champs obligatoires</p>
      <Button className="mt-2" disabled={!canSubmit || saving} onClick={submit}>
        {saving ? "Création…" : "Créer l'établissement"}
      </Button>
    </BottomSheet>
  );
}
