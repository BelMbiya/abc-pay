"use client";

import { useEffect, useState } from "react";
import { BottomSheet, Button, Field, useToast } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { createUser } from "@/lib/admin-users-api";

/** Création d'un compte utilisateur (particulier) par le super-admin. */
export function CreateUserSheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { showToast } = useToast();
  const [f, setF] = useState({ phone: "+243 ", name: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect -- reset à l'ouverture */
    setF({ phone: "+243 ", name: "", email: "" });
    setError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open]);

  const phone = f.phone.replace(/\s/g, "");
  const canSubmit = /^\+?\d{9,15}$/.test(phone);

  const submit = async () => {
    setError(null);
    setSaving(true);
    try {
      await createUser({ phone, name: f.name.trim() || undefined, email: f.email.trim() || undefined });
      showToast("Compte créé");
      onCreated();
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.fields) setError(Object.values(e.fields).flat()[0] ?? e.message);
      else setError(e instanceof ApiError ? e.message : "Création impossible. Réessaie.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Créer un compte">
      <p className="mb-3 text-[12.5px] leading-relaxed text-gray-500">
        Le titulaire se connectera par code OTP sur son numéro. Les informations d&apos;identité (KYC) pourront être complétées ensuite.
      </p>
      <Field label="Numéro de téléphone" required type="tel" inputMode="tel" placeholder="+243 81 000 00 00" value={f.phone} onChange={(e) => setF((p) => ({ ...p, phone: e.target.value }))} />
      <Field label="Nom complet (facultatif)" placeholder="Ex : Grace Mbuyi" value={f.name} onChange={(e) => setF((p) => ({ ...p, name: e.target.value }))} />
      <Field label="E-mail (facultatif)" type="email" placeholder="toi@exemple.cd" value={f.email} onChange={(e) => setF((p) => ({ ...p, email: e.target.value }))} />

      {error ? <p className="mt-4 text-[12.5px] font-semibold text-red">{error}</p> : null}
      <Button className="mt-4" disabled={!canSubmit || saving} onClick={submit}>{saving ? "Création…" : "Créer le compte"}</Button>
    </BottomSheet>
  );
}
