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
  balance: number;
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

/** Envoie une relance à un apprenant en dette. */
export async function remindLearner(learnerId: string): Promise<void> {
  await api.post(`/api/v1/staff/learners/${learnerId}/remind`, {}, { token: getStaffToken() ?? undefined });
}
