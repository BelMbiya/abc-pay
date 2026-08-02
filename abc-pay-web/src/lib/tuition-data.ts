/**
 * Données du module Tuition — reprises du prototype MVP.
 * (À terme, remplacées par les appels API : GET /establishments…)
 */

export type SchoolLevel = "petit" | "secondaire" | "superieur";

export interface School {
  id: string;
  name: string;
  type: string;
  level: SchoolLevel;
  city: string;
  code: string;
  currency?: string;
  fees: string[];
  presets: number[];
}

export const schools: School[] = [
  { id: "sch1", name: "École Maternelle Les Petits Génies", type: "École maternelle", level: "petit", city: "Kinshasa : Gombe", code: "ABC-TUITION-014", fees: ["Frais scolaires", "Frais d'inscription"], presets: [50, 80] },
  { id: "sch2", name: "Complexe Scolaire La Sagesse", type: "École primaire", level: "petit", city: "Kinshasa : Limete", code: "ABC-TUITION-021", fees: ["Frais scolaires", "Frais de cantine"], presets: [60, 100] },
  { id: "sch3", name: "Institut Bonsomi", type: "École secondaire", level: "secondaire", city: "Kinshasa : Ngaliema", code: "ABC-TUITION-032", fees: ["Frais scolaires", "Frais d'inscription", "Frais d'examen"], presets: [70, 120, 200] },
  { id: "sch4", name: "Institut Supérieur de Commerce (ISC)", type: "Institut supérieur", level: "superieur", city: "Kinshasa : Gombe", code: "ABC-TUITION-045", fees: ["Minerval", "Frais académiques"], presets: [150, 250] },
  { id: "sch5", name: "Université de Kinshasa (UNIKIN)", type: "Université", level: "superieur", city: "Kinshasa : Lemba", code: "ABC-TUITION-002", fees: ["Minerval", "Frais académiques", "Frais de laboratoire"], presets: [200, 350, 500] },
];

export interface StudentField {
  id: string;
  label: string;
  placeholder: string;
  /** Champ obligatoire (affiche un `*` et bloque la validation s'il est vide). */
  required?: boolean;
}

/**
 * Jeux de champs adaptés au TYPE d'établissement (une école et une université
 * n'ont pas les mêmes questions) :
 *  - petit/secondaire (écoles)  → identité + matricule + classe (+ option au secondaire) + année scolaire.
 *  - superieur (ISP/université) → identité + faculté + promotion + n° étudiant + année académique.
 * Le `matricule` reste obligatoire partout (clé d'imputation côté backend).
 */
export const fieldSets: Record<SchoolLevel, StudentField[]> = {
  petit: [
    { id: "nom", label: "Nom", placeholder: "Ex : Ilunga", required: true },
    { id: "postnom", label: "Post-nom", placeholder: "Ex : Mbuyi" },
    { id: "prenom", label: "Prénom", placeholder: "Ex : Grace", required: true },
    { id: "matricule", label: "Matricule de l'élève", placeholder: "Ex : ETS-2026-0481", required: true },
    { id: "classe", label: "Classe", placeholder: "Ex : 3ème primaire", required: true },
    { id: "annee", label: "Année scolaire", placeholder: "Ex : 2026-2027" },
  ],
  secondaire: [
    { id: "nom", label: "Nom", placeholder: "Ex : Ilunga", required: true },
    { id: "postnom", label: "Post-nom", placeholder: "Ex : Mbuyi" },
    { id: "prenom", label: "Prénom", placeholder: "Ex : Grace", required: true },
    { id: "matricule", label: "Matricule de l'élève", placeholder: "Ex : ETS-2026-0481", required: true },
    { id: "classe", label: "Classe", placeholder: "Ex : 4ème secondaire", required: true },
    { id: "option", label: "Option / Section", placeholder: "Ex : Scientifique, Commerciale..." },
    { id: "annee", label: "Année scolaire", placeholder: "Ex : 2026-2027" },
  ],
  superieur: [
    { id: "nom", label: "Nom", placeholder: "Ex : Ilunga", required: true },
    { id: "postnom", label: "Post-nom", placeholder: "Ex : Mbuyi" },
    { id: "prenom", label: "Prénom", placeholder: "Ex : Grace", required: true },
    { id: "faculte", label: "Faculté", placeholder: "Ex : Sciences Économiques", required: true },
    { id: "promotion", label: "Promotion", placeholder: "Ex : G3 / L2 / Bac3", required: true },
    { id: "matricule", label: "Numéro d'étudiant / matricule", placeholder: "Ex : UNI-2026-04871", required: true },
    { id: "anneeacad", label: "Année académique", placeholder: "Ex : 2026-2027" },
  ],
};

/** IDs des champs obligatoires pour un niveau donné (validation front). */
export function requiredFieldIds(level: SchoolLevel): string[] {
  return fieldSets[level].filter((f) => f.required).map((f) => f.id);
}

/** Taux de frais de service (cf. MVP FEE_RATES). */
export const FEE_RATES = { tuition: 0.02, tuitionAcad: 0.03 } as const;

export interface PaymentMethod {
  id: string;
  title: string;
  subtitle: string;
}

export const paymentMethods: PaymentMethod[] = [
  { id: "mpesa", title: "M-Pesa", subtitle: "Vodacom" },
  { id: "airtel", title: "Airtel Money", subtitle: "Airtel" },
  { id: "orange", title: "Orange Money", subtitle: "Orange" },
  { id: "africell", title: "Africell Money", subtitle: "Africell" },
  { id: "visa", title: "Carte Visa", subtitle: "Carte bancaire" },
];

/** Info « classe / filière » selon le niveau, à partir des champs saisis. */
export function studentInfo(level: SchoolLevel, f: Record<string, string>): string {
  if (level === "petit") return f.classe || "-";
  if (level === "secondaire") return [f.classe, f.option].filter(Boolean).join(" : ") || "-";
  return [f.faculte, f.promotion].filter(Boolean).join(" : ") || "-";
}
