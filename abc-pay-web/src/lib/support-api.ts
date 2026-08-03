/**
 * Support & sécurité du compte.
 * Payeur (JWT) : ouvrir un ticket, lister les siens, geler son compte.
 * Admin : lister les tickets, répondre / résoudre.
 */
import { api } from "@/lib/api";
import { getAdminToken } from "@/lib/admin-auth";
import { getStaffToken } from "@/lib/staff-auth";

export interface Ticket {
  id: string;
  reference: string;
  category: string; // dispute | compromised | lost_device | access | other
  subject: string;
  message: string;
  tx_reference: string | null;
  priority: string; // low | normal | high | urgent
  status: string; // open | in_progress | resolved
  admin_response: string | null;
  resolved_by: string | null;
  created_at: string | null;
  user?: { id: number; name: string | null; phone: string } | null;
}

export interface OpenTicketInput {
  category: string;
  subject: string;
  message: string;
  tx_reference?: string;
  priority?: string;
}

export const TICKET_CATEGORIES = [
  { id: "dispute", label: "Litige sur une transaction" },
  { id: "compromised", label: "Compte piraté / usurpé" },
  { id: "lost_device", label: "Téléphone perdu ou volé" },
  { id: "access", label: "Problème d'accès / connexion" },
  { id: "other", label: "Autre" },
] as const;

/** Catégories qui gèlent le compte à l'ouverture (avertissement UI). */
export const FREEZE_CATEGORIES = ["compromised", "lost_device"];

export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(TICKET_CATEGORIES.map((c) => [c.id, c.label]));

export const TICKET_STATUS: Record<string, string> = { open: "Ouvert", in_progress: "En cours", resolved: "Résolu" };
export const PRIORITY_LABEL: Record<string, string> = { low: "Faible", normal: "Normale", high: "Haute", urgent: "Urgente" };

// ── Payeur ──
export async function fetchMyTickets(): Promise<Ticket[]> {
  return api.get<Ticket[]>("/api/v1/support/tickets");
}

export async function openTicket(input: OpenTicketInput): Promise<Ticket> {
  return api.post<Ticket>("/api/v1/support/tickets", input);
}

/** « Bloquer mon compte » : gel immédiat + ticket urgent. Le compte est ensuite verrouillé. */
export async function lockMyAccount(): Promise<Ticket> {
  return api.post<Ticket>("/api/v1/me/lock", {});
}

// ── Établissement (token staff) ──
const staffAuth = () => ({ token: getStaffToken() ?? undefined });

export async function fetchStaffTickets(): Promise<Ticket[]> {
  return api.get<Ticket[]>("/api/v1/staff/support/tickets", staffAuth());
}

export async function openStaffTicket(input: OpenTicketInput): Promise<Ticket> {
  return api.post<Ticket>("/api/v1/staff/support/tickets", input, staffAuth());
}

// ── Admin ──
const auth = () => ({ token: getAdminToken() ?? undefined });

export async function fetchTickets(status?: string): Promise<{ tickets: Ticket[]; open: number }> {
  return api.get(`/api/v1/admin/support${status && status !== "all" ? `?status=${status}` : ""}`, auth());
}

export async function respondTicket(id: string, response: string, status: string): Promise<Ticket> {
  return api.post<Ticket>(`/api/v1/admin/support/${id}/respond`, { response, status }, auth());
}
