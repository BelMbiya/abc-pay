import { api } from "@/lib/api";
import { isJwtExpired } from "@/lib/jwt";

/**
 * Authentification super-admin abc pay (espace /admin).
 * Jeton conservé séparément (surface distincte des payeurs et du staff), en localStorage.
 * NB prod : durcir avec refresh token + cookie httpOnly.
 */
const STORAGE_KEY = "abcpay_admin_token";
const STORAGE_REFRESH = "abcpay_admin_refresh";
const STORAGE_USER = "abcpay_admin_user";

export interface AdminUser {
  id: number | string;
  name?: string | null;
  email: string;
  role: string;
  permissions?: string[];
  must_change_password?: boolean;
}

/**
 * L'admin connecté possède-t-il cette permission ?
 * Si les permissions ne sont pas (encore) connues — ancienne session, avant le fetch —
 * on NE MASQUE PAS (fail-open pour l'affichage ; l'API reste l'autorité qui bloque l'accès).
 */
export function adminCan(permission: string): boolean {
  const perms = getAdminUser()?.permissions;
  if (!Array.isArray(perms)) return true;
  return perms.includes(permission);
}

/** Récupère les permissions effectives de l'admin connecté et met à jour la session stockée. */
export async function refreshAdminPermissions(): Promise<void> {
  const data = await api.get<{ role: string; permissions: string[]; must_change_password: boolean }>(
    "/api/v1/admin/me/permissions",
    { token: getAdminToken() ?? undefined },
  );
  updateAdminUser({ role: data.role, permissions: data.permissions, must_change_password: data.must_change_password });
}

export function getAdminToken(): string | null {
  try {
    const access = localStorage.getItem(STORAGE_KEY);
    const refresh = localStorage.getItem(STORAGE_REFRESH);
    if (access && !isJwtExpired(access)) return access;
    if (refresh && !isJwtExpired(refresh)) return access; // api.ts renouvellera au 401
    clearAdminToken();
    return null;
  } catch {
    return null;
  }
}

export function getAdminUser(): AdminUser | null {
  try {
    const u = localStorage.getItem(STORAGE_USER);
    return u ? (JSON.parse(u) as AdminUser) : null;
  } catch {
    return null;
  }
}

export function setAdminSession(token: string, user: AdminUser, refresh?: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, token);
    if (refresh) localStorage.setItem(STORAGE_REFRESH, refresh);
    localStorage.setItem(STORAGE_USER, JSON.stringify(user));
  } catch {
    /* ignore */
  }
}

export function clearAdminToken(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_REFRESH);
    localStorage.removeItem(STORAGE_USER);
  } catch {
    /* ignore */
  }
}

/** Connexion super-admin → renvoie les JWT (accès + refresh) + le profil. */
export async function adminLogin(email: string, password: string): Promise<{ token: string; refresh?: string; user: AdminUser }> {
  const data = await api.post<{ access_token: string; refresh_token?: string; admin: AdminUser }>("/api/v1/auth/admin/login", { email, password });
  return { token: data.access_token, refresh: data.refresh_token, user: data.admin };
}

/** Met à jour le profil stocké (localStorage) sans toucher aux jetons. */
export function updateAdminUser(patch: Partial<AdminUser>): void {
  const u = getAdminUser();
  const token = localStorage.getItem(STORAGE_KEY);
  if (u && token) setAdminSession(token, { ...u, ...patch });
}

/** Change le mot de passe admin (obligatoire à la 1re connexion) puis lève le drapeau local. */
export async function changeAdminPassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.post("/api/v1/admin/password", { current_password: currentPassword, new_password: newPassword }, { token: getAdminToken() ?? undefined });
  updateAdminUser({ must_change_password: false });
}

/** Met à jour le profil de l'admin connecté (nom, email, mot de passe). */
export async function updateAdminProfile(input: { name?: string; email?: string; password?: string }): Promise<AdminUser> {
  const admin = await api.patch<AdminUser>("/api/v1/admin/me", input, { token: getAdminToken() ?? undefined });
  // Rafraîchit le profil stocké (sans toucher aux jetons).
  const token = localStorage.getItem(STORAGE_KEY);
  if (token) setAdminSession(token, admin);
  return admin;
}
