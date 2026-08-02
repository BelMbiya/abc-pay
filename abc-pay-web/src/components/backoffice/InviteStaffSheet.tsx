"use client";

import { useEffect, useState } from "react";
import { BottomSheet, Button, Field, Chip, ChipGroup, useToast } from "@/components/ui";
import { inviteStaffMember, type StaffMember } from "@/lib/staff-members-api";
import { ApiError } from "@/lib/api";

const ROLES = [
  { id: "direction", label: "Direction" },
  { id: "comptable", label: "Comptable" },
  { id: "caissier", label: "Caissier" },
  { id: "consultation", label: "Consultation" },
];

/** Inviter un membre du personnel (feuille coulissante), branché à l'API. */
export function InviteStaffSheet({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (member: StaffMember) => void;
}) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("comptable");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- réinitialisation à l'ouverture */
    if (open) {
      setName(""); setEmail(""); setRole("comptable"); setPassword(""); setError(null);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open]);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const created = await inviteStaffMember({ name: name.trim(), email: email.trim(), role, password });
      onCreated(created);
      showToast("Membre ajouté");
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Inviter un membre">
      <Field label="Nom complet" placeholder="Ex : Divine Kalonji" value={name} onChange={(e) => setName(e.target.value)} />
      <Field label="Email professionnel" type="email" placeholder="compta@etablissement.cd" value={email} onChange={(e) => setEmail(e.target.value)} />
      <p className="mb-1.5 mt-3.5 text-[12.5px] font-bold text-gray-700">Rôle</p>
      <ChipGroup>
        {ROLES.map((r) => (
          <Chip key={r.id} selected={role === r.id} onClick={() => setRole(r.id)}>{r.label}</Chip>
        ))}
      </ChipGroup>
      <Field label="Mot de passe provisoire" type="password" placeholder="Au moins 6 caractères" value={password} onChange={(e) => setPassword(e.target.value)} />

      {error ? <p className="mt-3 text-[12.5px] font-semibold text-red">{error}</p> : null}
      <Button className="mt-6" disabled={!name.trim() || !email.trim() || password.length < 6 || saving} onClick={submit}>
        {saving ? "Enregistrement…" : "Ajouter le membre"}
      </Button>
    </BottomSheet>
  );
}
