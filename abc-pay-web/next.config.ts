import type { NextConfig } from "next";

/**
 * En-têtes de sécurité appliqués à TOUTES les réponses (défense en profondeur).
 * La Content-Security-Policy (avec nonce par requête) est gérée dans proxy.ts.
 * Réf : docs/SECURITY.md §2.
 */
const securityHeaders = [
  // Force HTTPS pendant 2 ans, sous-domaines inclus (activer en prod derrière TLS).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Empêche le MIME-sniffing.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Anti-clickjacking (redondant avec frame-ancestors 'none').
  { key: "X-Frame-Options", value: "DENY" },
  // Ne fuite jamais l'URL de référence.
  { key: "Referrer-Policy", value: "no-referrer" },
  // Désactive les API sensibles du navigateur par défaut.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // Isolation cross-origin.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false, // ne pas divulguer "X-Powered-By: Next.js"
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
