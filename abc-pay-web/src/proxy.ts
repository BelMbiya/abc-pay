import { NextRequest, NextResponse } from "next/server";

const FIREBASE_SCRIPT = "https://www.google.com https://www.gstatic.com https://apis.google.com";
const FIREBASE_FRAME = "https://www.google.com https://apis.google.com https://abc-pay-70f11.firebaseapp.com";
const FIREBASE_CONNECT =
  "https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com";
const FIREBASE_IMG = "https://www.google.com https://www.gstatic.com";

// Landing marketing (/bienvenue) : design 100 % inline (d'où 'unsafe-inline'),
// mais page Next réelle qui parle à l'API (chiffres publics + demandes de démo)
// → l'API doit figurer dans connect-src.
const LANDING_PATHS = new Set(["/bienvenue", "/bienvenue.html"]);
const LANDING_CSP = `
    default-src 'self' blob: data:;
    script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: https://unpkg.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' data: blob: https:;
    font-src 'self' data: https://fonts.gstatic.com;
    connect-src 'self' data: blob: ${process.env.NEXT_PUBLIC_API_URL ?? ""} https://unpkg.com https://fonts.googleapis.com https://fonts.gstatic.com;
    frame-src 'self' blob: data:;
    worker-src 'self' blob:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
  `
  .replace(/\s{2,}/g, " ")
  .trim();

export function proxy(request: NextRequest) {
  if (LANDING_PATHS.has(request.nextUrl.pathname)) {
    const response = NextResponse.next();
    response.headers.set("Content-Security-Policy", LANDING_CSP);
    return response;
  }

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
