"use client";

import { useEffect, useState } from "react";
import { BottomSheet, Button, Field, Chip, ChipGroup, useToast } from "@/components/ui";
import { createLearner, type ApiLearner } from "@/lib/learners-api";
import { ApiError } from "@/lib/api";

const RELATIONS = [
  { id: "parent", label: "Parent" },
  { id: "tuteur", label: "Tuteur" },
  { id: "proche", label: "Proche" },
];

/** Ajouter un apprenant (feuille coulissante) — branché à l'API staff. */
export function AddLearnerSheet({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (learner: ApiLearner) => void;
}) {
  const { showToast } = useToast();
  const [nom, setNom] = useState("");
  const [postnom, setPostnom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [group, setGroup] = useState("");
  const [matricule, setMatricule] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [relation, setRelation] = useState("parent");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- réinitialisation à l'ouverture */
    if (open) {
      setNom(""); setPostnom(""); setPrenom(""); setGroup(""); setMatricule("");
      setParentName(""); setParentPhone(""); setRelation("parent"); setError(null);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open]);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const created = await createLearner({
        last_name: nom.trim(),
        middle_name: postnom.trim() || undefined,
        first_name: prenom.trim(),
        academic_group: group.trim() || undefined,
        matricule: matricule.trim() || undefined,
        parent_name: parentName.trim() || undefined,
        parent_phone: parentPhone.trim() || undefined,
        parent_relation: relation,
      });
      onCreated(created);
      showToast("Apprenant ajouté");
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Ajouter un apprenant">
      <p className="mb-1 text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-blue-600">Identité de l&apos;apprenant</p>
      <Field label="Nom" placeholder="Ex : Ilunga" value={nom} onChange={(e) => setNom(e.target.value)} />
      <Field label="Post-nom" placeholder="Ex : Mbuyi" value={postnom} onChange={(e) => setPostnom(e.target.value)} />
      <Field label="Prénom" placeholder="Ex : Grace" value={prenom} onChange={(e) => setPrenom(e.target.value)} />
      <Field label="Promotion / Niveau" placeholder="Ex : Bac 2 · Informatique de Gestion" value={group} onChange={(e) => setGroup(e.target.value)} />
      <Field label="Matricule (obligatoire)" placeholder="Ex : ISC-2026-0500" value={matricule} onChange={(e) => setMatricule(e.target.value)} />

      <p className="mb-1 mt-6 text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-blue-600">Parent / tuteur</p>
      <Field label="Nom complet" placeholder="Ex : Mbuyi Kalonji" value={parentName} onChange={(e) => setParentName(e.target.value)} />
      <Field label="Téléphone" type="tel" inputMode="tel" placeholder="+243 81 000 00 00" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} />
      <p className="mb-1.5 mt-3.5 text-[12.5px] font-bold text-gray-700">Relation</p>
      <ChipGroup>
        {RELATIONS.map((r) => (
          <Chip key={r.id} selected={relation === r.id} onClick={() => setRelation(r.id)}>{r.label}</Chip>
        ))}
      </ChipGroup>

      {error ? <p className="mt-3 text-[12.5px] font-semibold text-red">{error}</p> : null}
      <Button className="mt-6" disabled={!nom.trim() || !prenom.trim() || !matricule.trim() || saving} onClick={submit}>
        {saving ? "Enregistrement…" : "Ajouter l'apprenant"}
      </Button>
    </BottomSheet>
  );
}
