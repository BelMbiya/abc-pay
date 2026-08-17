/** Avis (témoignages) — dépôt authentifié + lecture publique (landing). */
import { api } from "@/lib/api";

export interface PublicReview {
  author_name: string;
  author_role: string | null;
  context: string | null;
  rating: number;
  message: string;
  created_at: string | null;
}

export interface ReviewInput {
  rating: number;
  message: string;
  author_role?: string;
  context?: string;
}

/** Dépose un avis. `base` = "/api/v1/staff" côté établissement (avec son token). */
export async function submitReview(input: ReviewInput, opts?: { token?: string; base?: string }): Promise<void> {
  await api.post(`${opts?.base ?? "/api/v1"}/reviews`, input, opts?.token ? { token: opts.token } : undefined);
}

/** Avis approuvés, affichés publiquement sur la landing. */
export async function fetchPublicReviews(): Promise<PublicReview[]> {
  return api.get<PublicReview[]>("/api/v1/reviews/public");
}

/* --------------------------- Modération (super-admin) --------------------- */
import { getAdminToken } from "@/lib/admin-auth";

export interface AdminReview extends PublicReview {
  id: string;
  author_type: string; // user | staff
  status: string; // pending | approved | rejected
}

export async function fetchAdminReviews(): Promise<AdminReview[]> {
  return api.get<AdminReview[]>("/api/v1/admin/reviews", { token: getAdminToken() ?? undefined });
}

export async function moderateReview(id: string, action: "approve" | "reject"): Promise<void> {
  await api.post(`/api/v1/admin/reviews/${id}/${action}`, {}, { token: getAdminToken() ?? undefined });
}
