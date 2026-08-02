"use client";

import { useState } from "react";
import { UploadCloud, FileSpreadsheet, Download } from "lucide-react";
import { BottomSheet, Button, useToast } from "@/components/ui";

/** Import en masse des apprenants (Excel/CSV) — feuille coulissante. UI de démo. */
export function ImportLearnersSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { showToast } = useToast();
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <BottomSheet open={open} onClose={onClose} title="Importer des apprenants">
      <p className="text-[12.5px] leading-relaxed text-gray-500">
        Importe ta liste d&apos;apprenants via un fichier Excel/CSV. Utilise le gabarit fourni pour
        éviter les erreurs (nom, promotion, contact du parent, matricule).
      </p>

      <button
        type="button"
        onClick={() => showToast("Gabarit téléchargé")}
        className="mt-3 flex w-full items-center gap-2 rounded-xl bg-gray-100 px-4 py-3 text-[12.5px] font-bold text-blue-700"
      >
        <Download className="size-4" strokeWidth={2.2} /> Télécharger le gabarit
      </button>

      <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-gray-300 bg-gray-100/50 px-4 py-8 text-center">
        {fileName ? (
          <>
            <FileSpreadsheet className="size-8 text-green" strokeWidth={1.6} />
            <span className="text-[13px] font-bold text-ink">{fileName}</span>
          </>
        ) : (
          <>
            <UploadCloud className="size-8 text-gray-500" strokeWidth={1.6} />
            <span className="text-[13px] font-bold text-ink">Choisir un fichier</span>
            <span className="text-[11.5px] text-gray-500">Excel (.xlsx) ou CSV</span>
          </>
        )}
        <input
          type="file"
          accept=".xlsx,.csv"
          className="hidden"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        />
      </label>

      <Button className="mt-5" disabled={!fileName} onClick={() => { showToast("Import lancé"); onClose(); }}>
        Importer
      </Button>
    </BottomSheet>
  );
}
