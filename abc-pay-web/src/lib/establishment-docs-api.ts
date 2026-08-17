import { api } from "@/lib/api";
import { getStaffToken } from "@/lib/staff-auth";

/** Une pièce KYB du point de vue de l'établissement. */
export interface DocItem {
  type: string;
  label: string;
  hint: string;
  required: boolean;
  needs_number: boolean;
  provided: boolean;
  number: string | null;
  status: "missing" | "pending" | "approved" | "rejected";
  note: string | null;
}

export interface DocsOverview {
  items: DocItem[];
  completeness: { required: number; approved: number; complete: boolean; missing: string[] };
}

const auth = () => ({ token: getStaffToken() ?? undefined });

/** État des pièces KYB exigées / fournies pour l'établissement du staff connecté. */
export async function fetchEstablishmentDocs(): Promise<DocsOverview> {
  return api.get<DocsOverview>("/api/v1/staff/documents", auth());
}

/** Dépose (ou remplace) une pièce : numéro et/ou fichier. */
export async function uploadEstablishmentDoc(input: { type: string; number?: string; file?: File | null }): Promise<{ type: string; status: string; has_file: boolean; completeness: DocsOverview["completeness"] }> {
  const form = new FormData();
  form.append("type", input.type);
  if (input.number) form.append("number", input.number);
  if (input.file) form.append("file", input.file);
  return api.post("/api/v1/staff/documents", form, auth());
}
