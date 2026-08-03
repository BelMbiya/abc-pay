import type { MetadataRoute } from "next";

const SITE = "https://abcpay.cd";

/**
 * robots — indexation des pages publiques ; les espaces authentifiés
 * (payeur connecté, back-office établissement, super-admin) sont exclus.
 * Le guide IA (llms.txt) est servi depuis /public.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin-connexion", "/etablissement", "/profil", "/activite", "/paiements", "/scan"],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
