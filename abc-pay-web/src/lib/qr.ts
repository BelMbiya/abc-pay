/**
 * QR codes abc pay — génération (de marque) + liens deep-link + parsing.
 *
 * Schéma :
 *  - Établissement  → `${origin}/tuition?e=<code|id>` : ouvre le parcours Tuition
 *    avec l'établissement DÉJÀ présélectionné (fonctionne avec n'importe quel scanner).
 *  - Utilisateur    → `${origin}/scan?t=user&r=<téléphone>&n=<nom>` : « payez-moi ».
 */
import QRCode from "qrcode";

export type QrTarget =
  | { type: "tuition"; ref: string }
  | { type: "user"; phone: string; name?: string };

export function appOrigin(): string {
  return typeof window !== "undefined" ? window.location.origin : "";
}

/** Lien QR d'un établissement (ref = code marchand ou id). */
export function establishmentTuitionUrl(ref: string, origin = appOrigin()): string {
  return `${origin}/tuition?e=${encodeURIComponent(ref)}`;
}

/** Lien QR « recevoir » d'un utilisateur (numéro = identifiant de paiement). */
export function userReceiveUrl(phone: string, name?: string, origin = appOrigin()): string {
  const n = name ? `&n=${encodeURIComponent(name)}` : "";
  return `${origin}/scan?t=user&r=${encodeURIComponent(phone)}${n}`;
}

/**
 * Lien QR de vérification d'authenticité d'un reçu.
 * Encode le `qr_token` : scanné par n'importe quelle caméra, il ouvre la page
 * publique de vérification qui interroge le serveur (source de vérité).
 */
export function receiptVerifyUrl(token: string, origin = appOrigin()): string {
  return `${origin}/verifier-recu?t=${encodeURIComponent(token)}`;
}

/** Analyse un texte scanné et renvoie la cible abc pay, ou null. */
export function parseAbcPayQr(text: string): QrTarget | null {
  if (!text) return null;
  try {
    const url = new URL(text.trim(), appOrigin() || "https://abcpay.cd");
    // Établissement : /tuition?e=...
    if (url.pathname.replace(/\/$/, "").endsWith("/tuition")) {
      const ref = url.searchParams.get("e");
      if (ref) return { type: "tuition", ref };
    }
    // Utilisateur : ?t=user&r=<phone>
    if (url.searchParams.get("t") === "user") {
      const phone = url.searchParams.get("r");
      if (phone) return { type: "user", phone, name: url.searchParams.get("n") ?? undefined };
    }
  } catch {
    /* pas une URL : ignoré */
  }
  return null;
}

/** Génère un PNG (data-URL) du QR, aux couleurs abc pay. */
export async function generateQrDataUrl(text: string, size = 512): Promise<string> {
  return QRCode.toDataURL(text, {
    width: size,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#0F1B30", light: "#FFFFFF" }, // navy / blanc (tokens)
  });
}
