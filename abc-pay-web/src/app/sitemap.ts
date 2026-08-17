import type { MetadataRoute } from "next";

const SITE = "https://abcpay.cd";

/** Pages publiques indexables (les espaces authentifiés sont exclus). */
export default function sitemap(): MetadataRoute.Sitemap {
  const routes: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/bienvenue", priority: 1.0, freq: "weekly" },
    { path: "/comment-ca-marche", priority: 0.7, freq: "monthly" },
    { path: "/pourquoi", priority: 0.6, freq: "monthly" },
    { path: "/tarification", priority: 0.7, freq: "monthly" },
    { path: "/faq", priority: 0.6, freq: "monthly" },
    { path: "/conditions", priority: 0.3, freq: "yearly" },
    { path: "/remboursement", priority: 0.3, freq: "yearly" },
    { path: "/confidentialite", priority: 0.3, freq: "yearly" },
    { path: "/connexion", priority: 0.5, freq: "yearly" },
    { path: "/inscription", priority: 0.5, freq: "yearly" },
    { path: "/etablissement-connexion", priority: 0.5, freq: "yearly" },
  ];

  return routes.map((r) => ({
    url: `${SITE}${r.path}`,
    changeFrequency: r.freq,
    priority: r.priority,
  }));
}
