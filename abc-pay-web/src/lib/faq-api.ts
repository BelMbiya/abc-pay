/** FAQ — lecture publique (landing + page /faq) + gestion super-admin. */
import { api } from "@/lib/api";
import { getAdminToken } from "@/lib/admin-auth";

export interface PublicFaq {
  id: string;
  category: string | null;
  question: string;
  answer: string;
}

export interface AdminFaq extends PublicFaq {
  position: number;
  is_published: boolean;
  created_at: string | null;
}

export interface FaqInput {
  question: string;
  answer: string;
  category?: string | null;
  position?: number;
  is_published?: boolean;
}

/** Entrées publiées, affichées publiquement. */
export async function fetchPublicFaqs(): Promise<PublicFaq[]> {
  return api.get<PublicFaq[]>("/api/v1/faqs/public");
}

/* ------------------------------ Admin (CRUD) ------------------------------ */
const auth = () => ({ token: getAdminToken() ?? undefined });

export async function fetchAdminFaqs(): Promise<AdminFaq[]> {
  return api.get<AdminFaq[]>("/api/v1/admin/faqs", auth());
}

export async function createFaq(input: FaqInput): Promise<AdminFaq> {
  return api.post<AdminFaq>("/api/v1/admin/faqs", input, auth());
}

export async function updateFaq(id: string, input: Partial<FaqInput>): Promise<AdminFaq> {
  return api.patch<AdminFaq>(`/api/v1/admin/faqs/${id}`, input, auth());
}

export async function deleteFaq(id: string): Promise<void> {
  await api.delete(`/api/v1/admin/faqs/${id}`, auth());
}
