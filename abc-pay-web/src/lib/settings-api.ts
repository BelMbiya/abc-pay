/** Réglages plateforme (devise). Lecture publique, écriture super-admin. */
import { api } from "@/lib/api";
import { getAdminToken } from "@/lib/admin-auth";

export interface PlatformSettings {
  currency: string;
  usd_cdf_rate: number;
  transfer_cap: number;
  landing_faq_limit: number;
  landing_reviews_limit: number;
}

export const CURRENCIES: { id: string; label: string }[] = [
  { id: "USD", label: "Dollar américain (USD $)" },
  { id: "CDF", label: "Franc congolais (CDF FC)" },
];

export async function fetchSettings(): Promise<PlatformSettings> {
  return api.get<PlatformSettings>("/api/v1/settings");
}

export async function updateCurrency(currency: string): Promise<PlatformSettings> {
  return api.patch<PlatformSettings>("/api/v1/admin/settings", { currency }, { token: getAdminToken() ?? undefined });
}

export async function updateRate(usd_cdf_rate: number): Promise<PlatformSettings> {
  return api.patch<PlatformSettings>("/api/v1/admin/settings", { usd_cdf_rate }, { token: getAdminToken() ?? undefined });
}

export async function updateTransferCap(transfer_cap: number): Promise<PlatformSettings> {
  return api.patch<PlatformSettings>("/api/v1/admin/settings", { transfer_cap }, { token: getAdminToken() ?? undefined });
}

/** Limites d'affichage public (landing) : nb de questions FAQ et de témoignages. */
export async function updateLandingLimits(
  limits: { landing_faq_limit?: number; landing_reviews_limit?: number },
): Promise<PlatformSettings> {
  return api.patch<PlatformSettings>("/api/v1/admin/settings", limits, { token: getAdminToken() ?? undefined });
}
