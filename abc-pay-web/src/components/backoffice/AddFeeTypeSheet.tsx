"use client";

import { useEffect, useState } from "react";
import { BottomSheet, Button, Field, Chip, ChipGroup, useToast } from "@/components/ui";
import { createFeeType, type ApiFeeType } from "@/lib/billing-api";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";

const FREQUENCIES = ["Unique", "Mensuel", "Trimestriel", "Semestriel", "Par crédit"];

/** Formulaire d'ajout d'un type de frais (feuille coulissante), branché à l'API. */
export function AddFeeTypeSheet({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (feeType: ApiFeeType) => void;
}) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState("Semestriel");
  const [optional, setOptional] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- réinitialisation à l'ouverture */
    if (open) {
      setName("");
      setFrequency("Semestriel");
      setOptional(false);
      setError(null);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open]);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const created = await createFeeType({ name: name.trim(), frequency, optional });
      onCreated(created);
      showToast("Type de frais ajouté");
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Ajouter un type de frais">
      <Field label="Nom du frais" placeholder="Ex : Frais de bibliothèque" value={name} onChange={(e) => setName(e.target.value)} />

      <p className="mb-1.5 mt-3.5 text-[12.5px] font-bold text-gray-700">Fréquence</p>
      <ChipGroup>
        {FREQUENCIES.map((f) => (
          <Chip key={f} selected={frequency === f} onClick={() => setFrequency(f)}>{f}</Chip>
        ))}
      </ChipGroup>

      <button
        type="button"
        onClick={() => setOptional((v) => !v)}
        className="mt-4 flex w-full items-center justify-between rounded-xl bg-gray-100 px-4 py-3 text-left"
      >
        <span>
          <span className="block text-[13px] font-bold text-ink">Frais optionnel</span>
          <span className="block text-[11.5px] text-gray-500">Cantine, transport, laboratoire…</span>
        </span>
        <span className={cn("relative h-6 w-10 shrink-0 rounded-full transition-colors", optional ? "bg-blue-500" : "bg-gray-300")}>
          <span className={cn("absolute top-0.5 size-5 rounded-full bg-white transition-transform", optional ? "translate-x-[18px]" : "translate-x-0.5")} />
        </span>
      </button>

      {error ? <p className="mt-3 text-[12.5px] font-semibold text-red">{error}</p> : null}

      <Button className="mt-5" disabled={!name.trim() || saving} onClick={submit}>
        {saving ? "Enregistrement…" : "Ajouter le frais"}
      </Button>
    </BottomSheet>
  );
}
