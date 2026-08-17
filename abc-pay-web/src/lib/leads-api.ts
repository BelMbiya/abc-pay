/** Demandes de démo / partenariat — dépôt public (landing) + gestion super-admin. */
import { api } from "@/lib/api";
import { getAdminToken } from "@/lib/admin-auth";

/** Étapes du pipeline de traitement (doit rester aligné sur LeadUpdateRequest côté API). */
export type LeadStatus = "nouveau" | "contacte" | "qualifie" | "clos";

export const LEAD_STATUSES: LeadStatus[] = ["nouveau", "contacte", "qualifie", "clos"];

/** Canal de reprise de contact souhaité par le prospect. */
export type LeadChannel = "whatsapp" | "email" | "appel";

export interface AdminLead {
  id: string;
  establishment_name: string;
  contact_name: string;
  phone: string;
  email: string | null;
  contact_channel: LeadChannel;
  profile: string | null;
  message: string | null;
  status: LeadStatus;
  created_at: string | null;
}

const auth = () => ({ token: getAdminToken() ?? undefined });

export async function fetchAdminLeads(): Promise<AdminLead[]> {
  return api.get<AdminLead[]>("/api/v1/admin/leads", auth());
}

export async function updateLeadStatus(id: string, status: LeadStatus): Promise<AdminLead> {
  return api.patch<AdminLead>(`/api/v1/admin/leads/${id}`, { status }, auth());
}

export async function deleteLead(id: string): Promise<void> {
  await api.delete(`/api/v1/admin/leads/${id}`, auth());
}
