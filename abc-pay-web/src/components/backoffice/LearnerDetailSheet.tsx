"use client";

import { BellRing, FileText } from "lucide-react";
import { BottomSheet, Button, StatusPill, useToast } from "@/components/ui";
import { fmt } from "@/lib/api";
import { remindLearner, type ApiLearner } from "@/lib/learners-api";

const STATUS: Record<string, { label: string; tone: "live" | "gold" | "soon" }> = {
  actif: { label: "Actif", tone: "live" },
  redoublant: { label: "Redoublant", tone: "gold" },
  diplome: { label: "Diplômé", tone: "soon" },
};

const RELATION: Record<string, string> = { parent: "Parent", tuteur: "Tuteur", proche: "Proche" };

/** Aperçu détaillé d'un apprenant (feuille coulissante). */
export function LearnerDetailSheet({ learner, onClose }: { learner: ApiLearner | null; onClose: () => void }) {
  const { showToast } = useToast();
  const st = learner ? (STATUS[learner.status] ?? STATUS.actif) : STATUS.actif;

  return (
    <BottomSheet open={learner !== null} onClose={onClose} title={learner?.name ?? "Apprenant"}>
      {learner ? (
        <>
          <div className="flex items-center justify-between">
            <StatusPill tone={st.tone}>{st.label}</StatusPill>
            {learner.balance > 0 ? (
              <span className="font-display text-[18px] font-extrabold text-gold-600">{fmt(learner.balance)} $ dû</span>
            ) : (
              <span className="font-display text-[15px] font-bold text-green">À jour</span>
            )}
          </div>

          <p className="mb-1.5 mt-5 text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-blue-600">Scolarité</p>
          <div className="rounded-2xl bg-gray-100 px-4 py-1">
            {[
              { l: "Réf. abc pay", v: learner.ref },
              { l: "Promotion / Niveau", v: learner.group ?? "—" },
              { l: "Matricule", v: learner.matricule ?? "—" },
            ].map((r) => (
              <div key={r.l} className="flex justify-between border-b border-white py-3 text-[12.5px] last:border-b-0">
                <span className="text-gray-500">{r.l}</span>
                <span className="font-bold text-ink">{r.v}</span>
              </div>
            ))}
          </div>

          <p className="mb-1.5 mt-4 text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-blue-600">Parent / tuteur</p>
          <div className="rounded-2xl bg-gray-100 px-4 py-1">
            {[
              { l: "Nom", v: learner.parent_name ?? "—" },
              { l: "Téléphone", v: learner.parent_phone ?? "—" },
              { l: "Relation", v: learner.parent_relation ? (RELATION[learner.parent_relation] ?? learner.parent_relation) : "—" },
            ].map((r) => (
              <div key={r.l} className="flex justify-between border-b border-white py-3 text-[12.5px] last:border-b-0">
                <span className="text-gray-500">{r.l}</span>
                <span className="font-bold text-ink">{r.v}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button variant="outline" fullWidth icon={FileText} onClick={() => showToast("État de compte généré")}>État de compte</Button>
            <Button fullWidth icon={BellRing} onClick={async () => { try { await remindLearner(learner.id); showToast(`Relance envoyée à ${learner.name}`); } catch { showToast("Échec de la relance"); } onClose(); }}>Relancer</Button>
          </div>
        </>
      ) : null}
    </BottomSheet>
  );
}
