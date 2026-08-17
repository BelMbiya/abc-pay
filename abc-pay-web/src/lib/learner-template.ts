/**
 * Gabarit d'import des apprenants (réconciliation) — CSV téléchargeable.
 * Colonnes alignées sur les champs attendus par l'API (matricule obligatoire).
 */
const COLUMNS = [
  "matricule",
  "nom",
  "postnom",
  "prenom",
  "promotion",
  "parent_nom",
  "parent_telephone",
  "parent_relation",
];

const EXAMPLE = [
  "ISC-2026-0500",
  "Ilunga",
  "Mbuyi",
  "Grace",
  "Bac 2 · Informatique de Gestion",
  "Mbuyi Kalonji",
  "+243 810 000 000",
  "parent",
];

/** Génère et télécharge le gabarit CSV (BOM UTF-8 → accents corrects dans Excel). */
export function downloadLearnerTemplate(): void {
  const line = (cells: string[]) => cells.map((c) => (/[",;\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",");
  const csv = "﻿" + [line(COLUMNS), line(EXAMPLE)].join("\r\n") + "\r\n";
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "gabarit-apprenants.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
