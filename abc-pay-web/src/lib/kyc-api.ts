/** KYC — dépôt des pièces (payeur) et revue (super-admin). Fichiers servis en privé. */
import { api, ApiError } from "@/lib/api";
import { getAdminToken } from "@/lib/admin-auth";
import { getStaffToken } from "@/lib/staff-auth";

export type KycStatusValue = "none" | "pending" | "approved" | "rejected";

export interface KycRecord {
  id: number | string;
  name: string | null;
  phone: string | null;
  id_doc_type: string | null;
  id_doc_number: string | null;
  kyc_status: KycStatusValue;
  kyc_submitted_at: string | null;
  has_front: boolean;
  has_back: boolean;
  has_selfie: boolean;
  reject_reason: string | null;
  ocr_match: boolean | null;   // null = OCR indisponible sur le serveur
  ocr_text: string | null;     // texte lu sur la pièce (aide à la revue admin)
  ocr_details?: {
    match: boolean | null;
    name_found: string[];
    name_missing: string[];
    doc_expected: string | null;
    doc_found: boolean | null;
    summary: string;
  };
}

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
const payerToken = (): string => { try { return localStorage.getItem("abcpay_token") ?? ""; } catch { return ""; } };

/* ------------------------------- Payeur ---------------------------------- */

export async function fetchMyKyc(): Promise<KycRecord> {
  return api.get<KycRecord>("/api/v1/kyc");
}

/** Dépôt des pièces (multipart). L'OCR et la décision auto sont faits CÔTÉ SERVEUR. */
export async function submitKyc(files: { front: File; selfie: File; back?: File | null }): Promise<KycRecord> {
  const fd = new FormData();
  fd.append("front", files.front);
  fd.append("selfie", files.selfie);
  if (files.back) fd.append("back", files.back);

  const res = await fetch(`${BASE}/api/v1/kyc`, {
    method: "POST",
    headers: { Authorization: `Bearer ${payerToken()}`, Accept: "application/json" },
    body: fd,
  });
  const j = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, j?.error?.code ?? "error", j?.error?.message ?? "Envoi impossible", j?.error?.fields);
  return (j?.data ?? j) as KycRecord;
}

/* ---------------------- Staff (back-office établissement) ----------------- */

export async function fetchStaffKyc(): Promise<KycRecord> {
  return api.get<KycRecord>("/api/v1/staff/kyc", { token: getStaffToken() ?? undefined });
}

/** Dépôt des pièces par un compte staff (mur de vérification). OCR/décision côté serveur. */
export async function submitStaffKyc(files: { front: File; selfie: File; back?: File | null }): Promise<KycRecord> {
  const fd = new FormData();
  fd.append("front", files.front);
  fd.append("selfie", files.selfie);
  if (files.back) fd.append("back", files.back);

  const res = await fetch(`${BASE}/api/v1/staff/kyc`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getStaffToken() ?? ""}`, Accept: "application/json" },
    body: fd,
  });
  const j = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, j?.error?.code ?? "error", j?.error?.message ?? "Envoi impossible", j?.error?.fields);
  return (j?.data ?? j) as KycRecord;
}

/* -------------------------------- Admin ---------------------------------- */

/** Dossiers KYC (admin). `status` = pending|approved|rejected|undefined (tous). */
export async function fetchKycRecords(status?: string): Promise<KycRecord[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return api.get<KycRecord[]>(`/api/v1/admin/kyc${qs}`, { token: getAdminToken() ?? undefined });
}

export async function decideKyc(userId: number | string, decision: "approve" | "reject", reason?: string): Promise<KycRecord> {
  return api.post<KycRecord>(`/api/v1/admin/kyc/${userId}/decide`, { decision, reason }, { token: getAdminToken() ?? undefined });
}

/** Récupère une pièce privée (flux authentifié admin) et renvoie une URL objet pour <img>. */
export async function fetchKycDocument(userId: number | string, type: "front" | "back" | "selfie"): Promise<string> {
  const res = await fetch(`${BASE}/api/v1/admin/kyc/${userId}/document/${type}`, {
    headers: { Authorization: `Bearer ${getAdminToken() ?? ""}` },
  });
  if (!res.ok) throw new Error(`document ${res.status}`);
  return URL.createObjectURL(await res.blob());
}
