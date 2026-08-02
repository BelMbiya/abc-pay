/**
 * Renouvellement des jetons d'accès (refresh token) — 3 surfaces : payeur, staff, admin.
 * Source unique de la logique de refresh + du stockage des jetons (localStorage).
 *
 * N'IMPORTE PAS api.ts (évite un cycle) : utilise un fetch brut vers /auth/refresh.
 */
import { decodeJwt, isJwtExpired } from "@/lib/jwt";

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

export type Scope = "payer" | "staff" | "admin";

const KEYS: Record<Scope, { access: string; refresh: string; user: string }> = {
  payer: { access: "abcpay_token", refresh: "abcpay_refresh", user: "abcpay_user" },
  staff: { access: "abcpay_staff_token", refresh: "abcpay_staff_refresh", user: "abcpay_staff_user" },
  admin: { access: "abcpay_admin_token", refresh: "abcpay_admin_refresh", user: "abcpay_admin_user" },
};

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}
function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function getAccess(scope: Scope): string | null {
  return read(KEYS[scope].access);
}
export function getRefresh(scope: Scope): string | null {
  return read(KEYS[scope].refresh);
}

/** Enregistre les jetons d'une session (à la connexion). */
export function setSessionTokens(scope: Scope, access: string, refresh?: string): void {
  write(KEYS[scope].access, access);
  if (refresh) write(KEYS[scope].refresh, refresh);
}

/** Efface toute la session (déconnexion / refresh expiré). */
export function clearSession(scope: Scope): void {
  remove(KEYS[scope].access);
  remove(KEYS[scope].refresh);
  remove(KEYS[scope].user);
}

/** Session considérée active si l'accès OU le refresh est encore valide. */
export function hasSession(scope: Scope): boolean {
  const access = getAccess(scope);
  if (access && !isJwtExpired(access)) return true;
  const refresh = getRefresh(scope);
  return Boolean(refresh && !isJwtExpired(refresh));
}

export function scopeOfToken(token: string): Scope | null {
  const s = decodeJwt(token)?.scope;
  return s === "payer" || s === "staff" || s === "admin" ? s : null;
}

/** Jeton « périmé bientôt » : expiré ou à moins de 30 s de l'expiration. */
function isStale(token: string): boolean {
  const exp = decodeJwt(token)?.exp;
  return typeof exp !== "number" || exp * 1000 <= Date.now() + 30_000;
}

// Dédup : un seul appel /auth/refresh en vol par scope.
const inflight: Partial<Record<Scope, Promise<string | null>>> = {};

/** Force un renouvellement immédiat via le refresh token. */
export function refreshScope(scope: Scope): Promise<string | null> {
  if (inflight[scope]) return inflight[scope]!;

  inflight[scope] = (async () => {
    const refresh = getRefresh(scope);
    if (!refresh || isJwtExpired(refresh)) {
      clearSession(scope);
      return null;
    }
    try {
      const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
        cache: "no-store",
      });
      if (!res.ok) {
        clearSession(scope);
        return null;
      }
      const data = (await res.json())?.data as { access_token?: string; refresh_token?: string } | undefined;
      if (!data?.access_token) {
        clearSession(scope);
        return null;
      }
      setSessionTokens(scope, data.access_token, data.refresh_token);
      return data.access_token;
    } catch {
      return null; // réseau : on ne purge pas (peut être temporaire)
    } finally {
      delete inflight[scope];
    }
  })();

  return inflight[scope]!;
}

/** Renvoie un jeton d'accès frais : renouvelle si l'actuel est périmé bientôt. */
export async function ensureFreshAccess(scope: Scope): Promise<string | null> {
  const access = getAccess(scope);
  if (access && !isStale(access)) return access;
  return refreshScope(scope);
}
