import { NextRequest, NextResponse } from "next/server";

/**
 * abc pay — Proxy (ex-"middleware" avant Next 16).
 * Pose une Content-Security-Policy STRICTE avec un nonce unique par requête.
 * Next.js propage automatiquement ce nonce à ses propres scripts.
 * Réf : docs/SECURITY.md §2/§5.2 + doc Next 16 "Content Security Policy".
 */
// Domaines Google/Firebase requis pour l'OTP téléphone (Phone Auth + reCAPTCHA).
// Réf : Firebase "Phone Auth + CSP" et doc reCAPTCHA. Portée volontairement étroite.
const FIREBASE_SCRIPT = "https://www.google.com https://www.gstatic.com https://apis.google.com";
const FIREBASE_FRAME = "https://www.google.com https://apis.google.com https://abc-pay-70f11.firebaseapp.com";
const FIREBASE_CONNECT =
  "https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com";
const FIREBASE_IMG = "https://www.google.com https://www.gstatic.com";

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";

  const csp = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${FIREBASE_SCRIPT}${isDev ? " 'unsafe-eval'" : ""};
    style-src 'self' 'nonce-${nonce}';
    img-src 'self' blob: data: ${FIREBASE_IMG};
    font-src 'self';
    connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL ?? ""} ${FIREBASE_CONNECT};
    frame-src ${FIREBASE_FRAME};
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // On ignore les assets statiques et les préchargements (pas besoin de CSP).
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
