"use client";

import { useEffect, useState } from "react";
import { BottomSheet, Button, Field, Chip, ChipGroup, useToast } from "@/components/ui";
import { createFeeSchedule, type ApiFeeType, type ApiFeeSchedule } from "@/lib/billing-api";
import { ApiError } from "@/lib/api";

/** Ajouter une ligne de barème (type de frais × promotion × montant), branché à l'API. */
export function AddScheduleSheet({
  open,
  feeTypes,
  onClose,
  onCreated,
}: {
  open: boolean;
  feeTypes: ApiFeeType[];
  onClose: () => void;
  onCreated: (schedule: ApiFeeSchedule) => void;
}) {
  const { showToast } = useToast();
  const [feeTypeId, setFeeTypeId] = useState("");
  const [group, setGroup] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- réinitialisation à l'ouverture */
    if (open) {
      setFeeTypeId(feeTypes[0]?.id ?? "");
      setGroup("");
      setAmount("");
      setError(null);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, feeTypes]);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const created = await createFeeSchedule({ fee_type_id: feeTypeId, academic_group: group.trim() || undefined, amount: Number(amount) });
      onCreated(created);
      showToast("Barème ajouté");
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Ajouter au barème">
      <p className="mb-1.5 text-[12.5px] font-bold text-gray-700">Type de frais</p>
      {feeTypes.length ? (
        <ChipGroup>
          {feeTypes.map((t) => (
            <Chip key={t.id} selected={feeTypeId === t.id} onClick={() => setFeeTypeId(t.id)}>{t.name}</Chip>
          ))}
        </ChipGroup>
      ) : (
        <p className="text-[12px] text-gray-500">Ajoute d&apos;abord un type de frais.</p>
      )}

      <Field label="Promotion / Niveau (vide = toutes)" placeholder="Ex : Bac 2 · Informatique de Gestion" value={group} onChange={(e) => setGroup(e.target.value)} />
      <Field label="Montant ($)" type="number" inputMode="decimal" placeholder="Ex : 300" value={amount} onChange={(e) => setAmount(e.target.value)} />

      {error ? <p className="mt-3 text-[12.5px] font-semibold text-red">{error}</p> : null}
      <Button className="mt-6" disabled={!feeTypeId || !amount || Number(amount) <= 0 || saving} onClick={submit}>
        {saving ? "Enregistrement…" : "Ajouter au barème"}
      </Button>
    </BottomSheet>
  );
}
