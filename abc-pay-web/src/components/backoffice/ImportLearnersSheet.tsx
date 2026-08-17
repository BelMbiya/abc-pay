"use client";

import { useState } from "react";
import { UploadCloud, FileSpreadsheet, Download } from "lucide-react";
import { BottomSheet, Button, useToast } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { importLearners, type NewLearnerInput, type ImportReport } from "@/lib/learners-api";
import { downloadLearnerTemplate } from "@/lib/learner-template";

/** Enlève les accents et met en minuscule (pour matcher les en-têtes du gabarit). */
const norm = (s: string) => s.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

/** Synonymes d'en-têtes acceptés → champ interne. */
const HEADER_MAP: Record<string, keyof RawRow> = {
  matricule: "matricule",
  nom: "nom", last_name: "nom",
  postnom: "postnom", middle_name: "postnom", "post-nom": "postnom",
  prenom: "prenom", first_name: "prenom",
  promotion: "promotion", classe: "promotion", niveau: "promotion", academic_group: "promotion",
  parent_nom: "parent_nom", parent_name: "parent_nom", "nom du parent": "parent_nom",
  parent_telephone: "parent_tel", parent_phone: "parent_tel", telephone: "parent_tel", "telephone parent": "parent_tel",
  parent_relation: "parent_relation", relation: "parent_relation",
};

interface RawRow { matricule?: string; nom?: string; postnom?: string; prenom?: string; promotion?: string; parent_nom?: string; parent_tel?: string; parent_relation?: string }

/** Découpe une ligne CSV en respectant les guillemets (délimiteur , ou ;). */
function splitCsvLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ;
    } else if (c === delim && !inQ) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/** Parse le contenu CSV en lignes typées (mappe les en-têtes). */
function parseCsv(text: string): RawRow[] {
  const clean = text.replace(/^﻿/, ""); // retire le BOM éventuel
  const lines = clean.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return [];
  const delim = (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const headers = splitCsvLine(lines[0], delim).map((h) => HEADER_MAP[norm(h)]);
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line, delim);
    const row: RawRow = {};
    headers.forEach((key, i) => { if (key) row[key] = cells[i] ?? ""; });
    return row;
  });
}

const RELATIONS = new Set(["parent", "tuteur", "proche"]);

export function ImportLearnersSheet({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported?: () => void }) {
  const { showToast } = useToast();
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<RawRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportReport | null>(null);

  const reset = () => { setFileName(null); setRows([]); setResult(null); };

  const onFile = (file: File | undefined) => {
    setResult(null);
    if (!file) { reset(); return; }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setRows(parseCsv(String(reader.result ?? "")));
    reader.onerror = () => { showToast("Lecture du fichier impossible"); reset(); };
    reader.readAsText(file);
  };

  const doImport = async () => {
    if (rows.length === 0) { showToast("Aucune ligne exploitable dans le fichier"); return; }
    setBusy(true);
    const payload: NewLearnerInput[] = rows.map((r) => {
      const rel = norm(r.parent_relation ?? "");
      return {
        last_name: r.nom ?? "",
        middle_name: r.postnom || undefined,
        first_name: r.prenom ?? "",
        academic_group: r.promotion || undefined,
        matricule: r.matricule ?? "",
        parent_name: r.parent_nom || undefined,
        parent_phone: r.parent_tel || undefined,
        parent_relation: RELATIONS.has(rel) ? rel : undefined,
      };
    });
    try {
      const report = await importLearners(payload);
      setResult(report);
      const total = report.created + report.reconciled;
      if (total > 0) onImported?.();
      showToast(total > 0
        ? `${report.created} ajouté(s) · ${report.reconciled} réconcilié(s)${report.errors.length ? ` · ${report.errors.length} erreur(s)` : ""}`
        : "Aucun apprenant traité — vérifie le fichier");
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Import impossible");
    } finally { setBusy(false); }
  };

  return (
    <BottomSheet open={open} onClose={() => { reset(); onClose(); }} title="Importer des apprenants">
      <p className="text-[12.5px] leading-relaxed text-gray-500">
        Importe ta liste d&apos;apprenants via un fichier CSV. Utilise le gabarit pour éviter les erreurs
        (matricule, nom, post-nom, prénom, promotion, contact du parent). Le matricule est obligatoire et unique.
      </p>

      <button
        type="button"
        onClick={downloadLearnerTemplate}
        className="mt-3 flex w-full items-center gap-2 rounded-xl bg-gray-100 px-4 py-3 text-[12.5px] font-bold text-blue-700"
      >
        <Download className="size-4" strokeWidth={2.2} /> Télécharger le gabarit
      </button>

      <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-gray-300 bg-gray-100/50 px-4 py-8 text-center">
        {fileName ? (
          <>
            <FileSpreadsheet className="size-8 text-green" strokeWidth={1.6} />
            <span className="text-[13px] font-bold text-ink">{fileName}</span>
            <span className="text-[11.5px] text-gray-500">{rows.length} ligne(s) détectée(s)</span>
          </>
        ) : (
          <>
            <UploadCloud className="size-8 text-gray-500" strokeWidth={1.6} />
            <span className="text-[13px] font-bold text-ink">Choisir un fichier</span>
            <span className="text-[11.5px] text-gray-500">CSV (.csv)</span>
          </>
        )}
        <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      </label>

      {result ? (
        <div className="mt-4 rounded-xl bg-gray-100 p-3.5 text-[12.5px]">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-pill bg-success-bg px-2.5 py-1 text-[11px] font-extrabold text-green">{result.created} ajouté(s)</span>
            <span className="rounded-pill bg-blue-100 px-2.5 py-1 text-[11px] font-extrabold text-blue-700">{result.reconciled} réconcilié(s)</span>
            {result.errors.length ? <span className="rounded-pill bg-[#FDE7E8] px-2.5 py-1 text-[11px] font-extrabold text-red">{result.errors.length} erreur(s)</span> : null}
          </div>
          <p className="mt-2 text-[11.5px] text-gray-500">« Réconciliés » = matricules déjà présents dans le système, mis à jour et rapprochés (paiements déjà reçus conservés).</p>
          {result.errors.length ? (
            <ul className="mt-2 max-h-40 list-disc space-y-1 overflow-y-auto pl-4 text-[11.5px] text-red">
              {result.errors.slice(0, 20).map((err, i) => <li key={i}>Ligne {err.line} : {err.message}</li>)}
              {result.errors.length > 20 ? <li>… et {result.errors.length - 20} autre(s).</li> : null}
            </ul>
          ) : null}
        </div>
      ) : null}

      {result ? (
        <Button className="mt-5" onClick={() => { reset(); onClose(); }}>Terminer</Button>
      ) : (
        <Button className="mt-5" disabled={!rows.length || busy} onClick={doImport}>
          {busy ? "Import en cours…" : `Importer${rows.length ? ` ${rows.length} ligne(s)` : ""}`}
        </Button>
      )}
    </BottomSheet>
  );
}
