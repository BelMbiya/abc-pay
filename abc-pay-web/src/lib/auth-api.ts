import { api } from "@/lib/api";
import type { AuthUser } from "@/lib/auth-context";
import { firebaseEnabled, getFirebaseAuth } from "@/lib/firebase";
import type { ConfirmationResult, RecaptchaVerifier } from "firebase/auth";

/**
 * Authentification par téléphone (OTP).
 *
 * - PROD (NEXT_PUBLIC_FIREBASE_* présents) : le SDK Firebase envoie le SMS
 *   (via reCAPTCHA invisible), l'utilisateur saisit le code, Firebase renvoie un
 *   ID token que le backend vérifie (FirebasePhoneTokenVerifier) avant d'émettre
 *   le JWT applicatif.
 * - DEV (clés absentes) : aucun SMS ; on envoie un jeton `fake:+243…` accepté par
 *   le FakePhoneTokenVerifier. Le code saisi n'est pas vérifié.
 *
 * Firebase (auth) est chargé en import dynamique : hors du bundle initial et
 * uniquement côté client (le SDK référence `window`).
 */

export { firebaseEnabled };

// État de la session OTP en cours (module-scope : un seul login à la fois).
let confirmation: ConfirmationResult | null = null;
let verifier: RecaptchaVerifier | null = null;

/** (Ré)initialise le vérificateur reCAPTCHA invisible attaché au conteneur donné. */
async function ensureVerifier(containerId: string): Promise<RecaptchaVerifier> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase non configuré.");
  if (!verifier) {
    const { RecaptchaVerifier } = await import("firebase/auth");
    verifier = new RecaptchaVerifier(auth, containerId, { size: "invisible" });
  }
  return verifier;
}

/** Libère le reCAPTCHA (à appeler en cas d'échec pour permettre un nouvel essai). */
export function resetOtp(): void {
  try {
    verifier?.clear();
  } catch {
    /* déjà libéré */
  }
  verifier = null;
  confirmation = null;
}

/**
 * Demande l'envoi du code par SMS.
 * En dev (Firebase absent) : no-op — l'écran passe directement à la saisie du code.
 */
export async function requestOtp(phone: string, containerId = "recaptcha-container"): Promise<void> {
  if (!firebaseEnabled) return;
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase non configuré.");
  const { signInWithPhoneNumber } = await import("firebase/auth");
  try {
    const rc = await ensureVerifier(containerId);
    confirmation = await signInWithPhoneNumber(auth, phone, rc);
  } catch (e) {
    resetOtp(); // reCAPTCHA doit être recréé après un échec
    throw e;
  }
}

/** Identité fournie à l'INSCRIPTION (le compte n'est créé qu'avec, au minimum, le nom). */
export interface SignupProfile {
  name: string;
  email?: string;
  birth_date?: string;
  gender?: string;
  address?: string;
  city?: string;
  id_doc_type?: string;
  id_doc_number?: string;
}

/**
 * Vérifie le code et ouvre la session ; renvoie les JWT (accès + refresh) + le profil.
 * - `intent="login"`  : le compte DOIT déjà exister (sinon `account_not_found`).
 * - `intent="signup"` : INSCRIPTION délibérée → `profile` (nom obligatoire) crée le compte.
 */
export async function verifyOtp(
  phone: string,
  code: string,
  intent: "login" | "signup" = "login",
  profile?: SignupProfile,
): Promise<{ token: string; refresh?: string; user: AuthUser }> {
  const idToken = firebaseEnabled ? await confirmFirebaseCode(code) : `fake:${phone}`;

  const data = await api.post<{ access_token: string; refresh_token?: string; user: AuthUser }>(
    "/api/v1/auth/firebase",
    { firebase_id_token: idToken, intent, ...(intent === "signup" && profile ? { profile } : {}) },
    { idempotent: false },
  );

  resetOtp();
  return { token: data.access_token, refresh: data.refresh_token, user: data.user };
}

/** Confirme le code SMS auprès de Firebase et renvoie l'ID token signé par Google. */
async function confirmFirebaseCode(code: string): Promise<string> {
  if (!confirmation) throw new Error("Demande d'abord un code (SMS non initié).");
  const credential = await confirmation.confirm(code);
  return credential.user.getIdToken();
}
