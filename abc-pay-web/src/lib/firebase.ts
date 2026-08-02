/**
 * Initialisation Firebase (Auth téléphone / OTP) — côté client uniquement.
 *
 * La sécurité ne repose PAS sur le secret de ces clés (publiques par design) mais sur :
 *  - les « Authorized domains » configurés dans la console Firebase,
 *  - reCAPTCHA (anti-abus sur l'envoi de SMS),
 *  - la vérification SERVEUR du jeton signé par Google (voir FirebasePhoneTokenVerifier),
 *    qui seule autorise l'émission du JWT applicatif.
 *
 * Si les variables NEXT_PUBLIC_FIREBASE_* sont absentes, le module reste inerte
 * et l'app retombe sur le mode démo (jeton `fake:` accepté par le backend en dev).
 */
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * OTP Firebase réel actif SI la config est complète ET l'interrupteur explicite
 * `NEXT_PUBLIC_FIREBASE_ENABLED=true` est posé. Par défaut (ou =false), on reste
 * en mode démo (jeton `fake:` accepté par le backend) — permet de développer sans
 * dépendre de la config console Firebase / des SMS.
 */
const hasConfig = Boolean(config.apiKey && config.authDomain && config.projectId);
export const firebaseEnabled = hasConfig && process.env.NEXT_PUBLIC_FIREBASE_ENABLED === "true";

let cachedAuth: Auth | null = null;

/** Renvoie l'instance Auth (initialisée à la demande), ou null si Firebase non configuré. */
export function getFirebaseAuth(): Auth | null {
  if (!firebaseEnabled) return null;
  if (cachedAuth) return cachedAuth;

  const app: FirebaseApp = getApps().length ? getApp() : initializeApp(config);
  cachedAuth = getAuth(app);
  // Aligne la langue des SMS/reCAPTCHA sur l'appareil (fr en RDC par défaut).
  cachedAuth.languageCode = "fr";
  return cachedAuth;
}
