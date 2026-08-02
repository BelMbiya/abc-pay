/**
 * Profil & KYC (« infos seulement ») du payeur connecté (front → Laravel).
 * Endpoints JWT : GET /me · PATCH /me.
 */
import { api } from "@/lib/api";

export interface Profile {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  birth_date: string | null; // YYYY-MM-DD
  gender: string | null; // M | F | autre
  address: string | null;
  city: string | null;
  id_doc_type: string | null; // carte_electeur | passeport | permis
  id_doc_number: string | null;
  kyc_complete: boolean;
  is_blocked: boolean;
  member_since: string | null;
}

export type ProfileInput = Partial<
  Pick<Profile, "name" | "email" | "birth_date" | "gender" | "address" | "city" | "id_doc_type" | "id_doc_number">
>;

export const GENDERS = [
  { id: "M", label: "Masculin" },
  { id: "F", label: "Féminin" },
  { id: "autre", label: "Autre" },
] as const;

export const ID_DOC_TYPES = [
  { id: "carte_electeur", label: "Carte d'électeur" },
  { id: "passeport", label: "Passeport" },
  { id: "permis", label: "Permis de conduire" },
] as const;

export function idDocLabel(type: string | null): string {
  return ID_DOC_TYPES.find((t) => t.id === type)?.label ?? "—";
}

export function genderLabel(g: string | null): string {
  return GENDERS.find((x) => x.id === g)?.label ?? "—";
}

/** Initiales pour l'avatar (2 lettres). */
export function initials(name: string | null, phone: string): string {
  const n = (name ?? "").trim();
  if (!n) return phone.replace(/\D/g, "").slice(-2) || "?";
  const parts = n.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "")).toUpperCase();
}

export async function fetchMe(): Promise<Profile> {
  return api.get<Profile>("/api/v1/me");
}

export async function updateProfile(input: ProfileInput): Promise<Profile> {
  return api.patch<Profile>("/api/v1/me", input);
}
