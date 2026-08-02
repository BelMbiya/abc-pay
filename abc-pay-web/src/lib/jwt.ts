/**
 * Utilitaires JWT côté client (lecture seule, non sécuritaire).
 * Sert uniquement à l'UX : éviter l'état « connecté zombie » quand un access
 * token a expiré (tous les appels API échoueraient alors en 401 silencieux).
 * La sécurité réelle reste la vérification serveur (signature RS256).
 */

/** Décode la charge utile (payload) d'un JWT, ou null si illisible. */
export function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Vrai si le JWT est expiré, sans date d'expiration, ou illisible. */
export function isJwtExpired(token: string): boolean {
  const payload = decodeJwt(token);
  const exp = payload?.exp;
  return typeof exp !== "number" || exp * 1000 <= Date.now();
}
