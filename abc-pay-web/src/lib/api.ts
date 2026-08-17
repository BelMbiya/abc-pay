/**
 * abc pay — Client API sécurisé (front → Laravel).
 * Réf : docs/SECURITY.md §3/§6/§7.
 *
 * Principes :
 *  - Base URL depuis l'env (jamais en dur), HTTPS en prod.
 *  - Jeton d'ACCÈS (court) gardé en mémoire ici (`authToken`).
 *    ⚠️ PROD : les refresh tokens sont aujourd'hui persistés en localStorage
 *    (voir lib/refresh.ts) — à migrer vers un cookie HttpOnly+Secure+SameSite
 *    avant la mise en production (anti-vol par XSS). Cf. docs/SECURITY-AUDIT.md.
 *  - JSON strict, timeout (AbortController), erreurs structurées.
 *  - Idempotency-Key auto sur les mutations sensibles (anti double paiement).
 *  - Aucune donnée sensible en query string.
 */

import { refreshScope, scopeOfToken } from "@/lib/refresh";

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
const DEFAULT_TIMEOUT = 20_000;

/** Token d'accès conservé en mémoire (effacé au rechargement). */
let authToken: string | null = null;
export function setAuthToken(token: string | null): void {
  authToken = token;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  /** Ajoute une Idempotency-Key (recommandé pour tout POST de paiement). */
  idempotent?: boolean;
  signal?: AbortSignal;
  /** Jeton Bearer explicite pour cet appel (ex. token staff), sinon le token global. */
  token?: string;
  /** Interne : Idempotency-Key stable conservée entre un appel et son retry. */
  _idemKey?: string;
  /** Interne : empêche une boucle de refresh (un seul retry après 401). */
  _retried?: boolean;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts: RequestOptions = {},
): Promise<T> {
  if (!BASE_URL) throw new ApiError(0, "config", "NEXT_PUBLIC_API_URL manquant.");

  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  };
  // Multipart (upload de fichier) : on laisse le navigateur poser le Content-Type
  // avec sa boundary. Sinon, corps JSON.
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";
  const bearer = opts.token ?? authToken;
  if (bearer) headers["Authorization"] = `Bearer ${bearer}`;
  // Idempotency-Key stable sur le retry (pas de double traitement).
  const idemKey = opts.idempotent ? (opts._idemKey ?? crypto.randomUUID()) : undefined;
  if (idemKey) headers["Idempotency-Key"] = idemKey;

  // Timeout via AbortController (combiné à un éventuel signal externe).
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);
  if (opts.signal) opts.signal.addEventListener("abort", () => controller.abort());

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
      credentials: "omit", // token-based : pas de cookies ambiants
      cache: "no-store",
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timer);
    throw new ApiError(0, "network", "Connexion impossible. Réessaie.");
  }
  clearTimeout(timer);

  // 401 → tente UN renouvellement via le refresh token, puis rejoue la requête.
  if (res.status === 401 && bearer && !opts._retried) {
    const scope = scopeOfToken(bearer);
    if (scope) {
      const fresh = await refreshScope(scope);
      if (fresh) {
        if (scope === "payer") setAuthToken(fresh); // met à jour le token global en mémoire
        return request<T>(method, path, body, {
          ...opts,
          token: scope === "payer" ? undefined : fresh,
          _idemKey: idemKey,
          _retried: true,
        });
      }
    }
  }

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const err = (payload as { error?: { code?: string; message?: string; fields?: Record<string, string[]> } })?.error;
    throw new ApiError(
      res.status,
      err?.code ?? "error",
      err?.message ?? "Une erreur est survenue.",
      err?.fields,
    );
  }
  return (payload as { data?: T })?.data ?? (payload as T);
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>("GET", path, undefined, opts),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("POST", path, body, opts),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("PUT", path, body, opts),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("PATCH", path, body, opts),
  delete: <T>(path: string, opts?: RequestOptions) => request<T>("DELETE", path, undefined, opts),
};

/**
 * Formatage monétaire FR : espace fin pour les milliers, virgule pour les décimales.
 * ⚠️ En fr-FR la virgule est le séparateur DÉCIMAL (pas les milliers) : on ne la
 * remplace donc PAS (l'ancien code le faisait → « 51,5 » devenait « 51 5 » ≈ « 515 »).
 * On normalise juste les espaces insécables (U+202F / U+00A0) en espace normal.
 * Ex. : 51.5 → "51,5" · 1500 → "1 500" · 200 → "200".
 */
export function fmt(n: number): string {
  return Number(n)
    .toLocaleString("fr-FR", { maximumFractionDigits: 2 })
    .replace(/[  ]/g, " ");
}
