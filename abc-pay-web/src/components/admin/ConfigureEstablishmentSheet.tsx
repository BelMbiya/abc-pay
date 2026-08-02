"use client";

import { useEffect, useState } from "react";
import { BottomSheet, Button, Field, Chip, ChipGroup, useToast } from "@/components/ui";
import { updateEstablishment, updateEstablishmentLogin, type AdminEstablishment } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import { EstablishmentQrCard } from "@/components/qr/EstablishmentQrCard";

const TYPES = ["École maternelle", "École primaire", "École secondaire", "Institut supérieur", "Université"];
const BILLING = [
  { id: "payment_only", label: "Paiement seul" },
  { id: "fee_management", label: "Gestion des soldes" },
] as const;

/** Configure un établissement : infos, statut, compte de connexion + QR. */
export function ConfigureEstablishmentSheet({
  establishment,
  onClose,
  onSaved,
}: {
  establishment: AdminEstablishment | null;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [type, setType] = useState(TYPES[3]);
  const [city, setCity] = useState("");
  const [commission, setCommission] = useState("2");
  const [currency, setCurrency] = useState("USD");
  const [billing, setBilling] = useState<string>("payment_only");
  const [active, setActive] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- pré-remplissage à l'ouverture */
    if (establishment) {
      setName(establishment.name);
      setType(establishment.type);
      setCity(establishment.city ?? "");
      setCommission(String(Math.round(establishment.commission_rate * 100 * 10) / 10));
      setCurrency(establishment.currency || "USD");
      setBilling(establishment.billing_mode);
      setActive(establishment.is_active);
      setEmail(establishment.login_email ?? "");
      setPassword("");
      setError(null);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [establishment]);

  const submit = async () => {
    if (!establishment) return;
    setError(null);
    setSaving(true);
    try {
      // 1) Infos établissement (champs modifiés).
      const patch: Record<string, unknown> = {};
      if (name.trim() && name !== establishment.name) patch.name = name.trim();
      if (type !== establishment.type) patch.type = type;
      if (city !== (establishment.city ?? "")) patch.city = city.trim();
      if (Number(commission) !== Math.round(establishment.commission_rate * 1000) / 10) patch.commission_rate = Number(commission);
      if (currency !== establishment.currency) patch.currency = currency;
      if (billing !== establishment.billing_mode) patch.billing_mode = billing;
      if (active !== establishment.is_active) patch.is_active = active;
      if (Object.keys(patch).length) await updateEstablishment(establishment.id, patch);

      // 2) Compte de connexion (si modifié).
      const login: Record<string, unknown> = {};
      if (email.trim() && email.trim() !== establishment.login_email) login.login_email = email.trim();
      if (password) login.login_password = password;
      if (Object.keys(login).length) await updateEstablishmentLogin(establishment.id, login);

      showToast("Établissement mis à jour");
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet open={establishment !== null} onClose={onClose} title={establishment?.name ?? "Configurer"}>
      {establishment ? (
        <>
          <p className="mb-1 text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-blue-600">Informations</p>
          <Field label="Raison sociale" value={name} onChange={(e) => setName(e.target.value)} />
          <p className="mb-1.5 mt-3.5 text-[12.5px] font-bold text-gray-700">Type</p>
          <ChipGroup>
            {TYPES.map((t) => <Chip key={t} selected={type === t} onClick={() => setType(t)}>{t}</Chip>)}
          </ChipGroup>
          <Field label="Ville" value={city} onChange={(e) => setCity(e.target.value)} />
          <Field label="Commission (%)" type="number" inputMode="decimal" value={commission} onChange={(e) => setCommission(e.target.value)} />
          <p className="mb-1.5 mt-3.5 text-[12.5px] font-bold text-gray-700">Devise de facturation</p>
          <ChipGroup>
            {["USD", "CDF"].map((c) => <Chip key={c} selected={currency === c} onClick={() => setCurrency(c)}>{c === "USD" ? "USD ($)" : "CDF (FC)"}</Chip>)}
          </ChipGroup>
          <p className="mb-1.5 mt-3.5 text-[12.5px] font-bold text-gray-700">Mode de facturation</p>
          <ChipGroup>
            {BILLING.map((b) => <Chip key={b.id} selected={billing === b.id} onClick={() => setBilling(b.id)}>{b.label}</Chip>)}
          </ChipGroup>

          {/* Statut */}
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-gray-100 px-4 py-3">
            <div>
              <p className="text-[13px] font-bold text-ink">Établissement actif</p>
              <p className="text-[11.5px] text-gray-500">{active ? "Peut recevoir des paiements." : "Suspendu : aucun paiement possible."}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={active}
              onClick={() => setActive((v) => !v)}
              className={`relative h-6 w-11 shrink-0 rounded-pill transition-colors ${active ? "bg-green" : "bg-gray-300"}`}
            >
              <span className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${active ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </div>

          <p className="mb-1 mt-6 text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-blue-600">Compte de connexion</p>
          <Field label="Email de connexion" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Field label="Nouveau mot de passe" type="password" autoComplete="new-password" placeholder="Laisser vide pour ne pas changer" value={password} onChange={(e) => setPassword(e.target.value)} />

          {error ? <p className="mt-3 text-[12.5px] font-semibold text-red">{error}</p> : null}

          <Button className="mt-6" disabled={saving} onClick={submit}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>

          <p className="mb-2 mt-6 text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-blue-600">QR de paiement</p>
          <EstablishmentQrCard refCode={establishment.merchant_code || establishment.id} name={establishment.name} compact />
        </>
      ) : null}
    </BottomSheet>
  );
}
