import { api } from "@/lib/api";
import { isJwtExpired } from "@/lib/jwt";

/**
 * Authentification du personnel d'établissement (back-office).
 * Jeton conservé séparément du payeur (surface distincte), en localStorage.
 * NB prod : durcir avec refresh token + cookie httpOnly.
 */
const STORAGE_KEY = "abcpay_staff_token";
const STORAGE_REFRESH = "abcpay_staff_refresh";
const STORAGE_USER = "abcpay_staff_user";

export interface StaffUser {
  id: string;
  name?: string | null;
  email: string;
  role: string;
  establishment_id: string;
}

export function getStaffToken(): string | null {
  try {
    const access = localStorage.getItem(STORAGE_KEY);
    const refresh = localStorage.getItem(STORAGE_REFRESH);
    // Accès valide → on l'utilise.
    if (access && !isJwtExpired(access)) return access;
    // Accès périmé mais refresh encore bon → on renvoie l'accès : api.ts le renouvellera au 401.
    if (refresh && !isJwtExpired(refresh)) return access;
    // Session morte → purge (StaffGate renverra vers la connexion établissement).
    clearStaffToken();
    return null;
  } catch {
    return null;
  }
}

export function getStaffUser(): StaffUser | null {
  try {
    const u = localStorage.getItem(STORAGE_USER);
    return u ? (JSON.parse(u) as StaffUser) : null;
  } catch {
    return null;
  }
}

export function getStaffRole(): string | null {
  return getStaffUser()?.role ?? null;
}

export function setStaffSession(token: string, user: StaffUser, refresh?: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, token);
    if (refresh) localStorage.setItem(STORAGE_REFRESH, refresh);
    localStorage.setItem(STORAGE_USER, JSON.stringify(user));
  } catch {
    /* ignore */
  }
}

export function clearStaffToken(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_REFRESH);
    localStorage.removeItem(STORAGE_USER);
  } catch {
    /* ignore */
  }
}

/** Connexion staff → renvoie les JWT (accès + refresh) + le profil. */
export async function staffLogin(email: string, password: string): Promise<{ token: string; refresh?: string; user: StaffUser }> {
  const data = await api.post<{ access_token: string; refresh_token?: string; user: StaffUser }>("/api/v1/auth/staff/login", { email, password });
  return { token: data.access_token, refresh: data.refresh_token, user: data.user };
}
