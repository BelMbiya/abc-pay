import { api } from "@/lib/api";
import { getStaffToken } from "@/lib/staff-auth";

export interface ApiLearner {
  id: string;
  ref: string;
  name: string;
  group: string | null;
  matricule: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  parent_relation: string | null;
  status: string;
  source?: string; // registre | paiement (traçabilité Tuition)
  due_total?: number; // attendu (réconciliation)
  paid_total?: number; // encaissé
  balance: number; // restant = attendu − encaissé
}

export interface NewLearnerInput {
  last_name: string;
  middle_name?: string;
  first_name: string;
  academic_group?: string;
  matricule?: string;
  parent_name?: string;
  parent_phone?: string;
  parent_relation?: string;
}

/** Apprenants de l'établissement du staff connecté (route protégée). */
export async function fetchLearners(): Promise<ApiLearner[]> {
  return api.get<ApiLearner[]>("/api/v1/staff/learners", { token: getStaffToken() ?? undefined });
}

export async function createLearner(input: NewLearnerInput): Promise<ApiLearner> {
  return api.post<ApiLearner>("/api/v1/staff/learners", input, { token: getStaffToken() ?? undefined });
}

export interface ImportReport {
  created: number;      // nouveaux apprenants
  reconciled: number;   // matricules déjà présents → mis à jour (réconciliés)
  errors: { line: number; message: string }[];
}

/** Import / réconciliation en masse (rapprochement par matricule). */
export async function importLearners(learners: NewLearnerInput[]): Promise<ImportReport> {
  return api.post<ImportReport>("/api/v1/staff/learners/import", { learners }, { token: getStaffToken() ?? undefined });
}

/** Envoie une relance à un apprenant en dette. */
export async function remindLearner(learnerId: string): Promise<void> {
  await api.post(`/api/v1/staff/learners/${learnerId}/remind`, {}, { token: getStaffToken() ?? undefined });
}

/* -------------------------- Relevé de compte (#10) ------------------------ */

export interface LearnerStatement {
  learner: { name: string; matricule: string | null; academic_group: string | null; parent_name: string | null; parent_phone: string | null; abcpay_ref: string | null; status: string | null };
  establishment: { name: string | null; city: string | null; currency: string };
  fees: Array<{ label: string; due: number; paid: number; balance: number }>;
  payments: Array<{ date: string | null; fee_type: string | null; amount: number; receipt: string | null; reference: string | null }>;
  totals: { due: number; paid: number; balance: number };
  generated_at: string;
}

/** Relevé de compte d'un apprenant (postes dû/payé/solde + historique). */
export async function fetchLearnerStatement(learnerId: string): Promise<LearnerStatement> {
  return api.get<LearnerStatement>(`/api/v1/staff/learners/${learnerId}/statement`, { token: getStaffToken() ?? undefined });
}
