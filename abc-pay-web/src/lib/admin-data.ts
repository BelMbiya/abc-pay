/**
 * Données mock du back-office super-admin abc pay (cf. cahier §8.4).
 * Remplacées à terme par l'API : GET /admin/overview, /admin/establishments…
 * Montants en USD.
 */

export const globalKpis = {
  volume: 1284500, // volume total traité
  commission: 28900, // commission générée par abc pay
  establishments: 12, // établissements actifs
  transactions: 8640, // nombre de transactions
};

/** Volume par opérateur / moyen de paiement. */
export const volumeByOperator = [
  { label: "M-Pesa", pct: 38, color: "#1BA672" },
  { label: "Airtel Money", pct: 27, color: "#E5484D" },
  { label: "Orange Money", pct: 20, color: "#F5A623" },
  { label: "Africell Money", pct: 8, color: "#2D74D6" },
  { label: "Carte", pct: 4, color: "#0F3E8A" },
  { label: "Virement", pct: 3, color: "#6B7484" },
];

export type OperatorStatus = "healthy" | "degraded" | "down";

export interface OperatorIntegration {
  name: string;
  status: OperatorStatus;
  env: "production" | "sandbox";
  latency: string;
  lastChecked: string;
}

export const operators: OperatorIntegration[] = [
  { name: "Airtel Money", status: "healthy", env: "production", latency: "310 ms", lastChecked: "il y a 2 min" },
  { name: "Orange Money", status: "healthy", env: "production", latency: "420 ms", lastChecked: "il y a 2 min" },
  { name: "M-Pesa (Vodacom)", status: "degraded", env: "production", latency: "1 8 s", lastChecked: "il y a 1 min" },
  { name: "Africell Money", status: "healthy", env: "sandbox", latency: "540 ms", lastChecked: "il y a 3 min" },
  { name: "Agrégateur (passerelle)", status: "healthy", env: "production", latency: "260 ms", lastChecked: "il y a 1 min" },
];

export type EstablishmentStatus = "active" | "pending" | "suspended";

export interface AdminEstablishment {
  name: string;
  type: string;
  city: string;
  status: EstablishmentStatus;
  volume: number;
  commissionRate: number; // en %
}

export const establishments: AdminEstablishment[] = [
  { name: "Université de Kinshasa (UNIKIN)", type: "Université", city: "Kinshasa", status: "active", volume: 320000, commissionRate: 1.5 },
  { name: "Institut Supérieur de Commerce (ISC)", type: "Institut supérieur", city: "Kinshasa", status: "active", volume: 162300, commissionRate: 2 },
  { name: "Institut Bonsomi", type: "École secondaire", city: "Kinshasa", status: "active", volume: 74800, commissionRate: 2.5 },
  { name: "Complexe Scolaire La Sagesse", type: "École primaire", city: "Kinshasa", status: "pending", volume: 0, commissionRate: 2.5 },
  { name: "École Maternelle Les Petits Génies", type: "École maternelle", city: "Kinshasa", status: "active", volume: 31200, commissionRate: 2.5 },
  { name: "Collège Saint-Georges", type: "École secondaire", city: "Lubumbashi", status: "suspended", volume: 12400, commissionRate: 2.5 },
];

export interface FraudAlert {
  title: string;
  detail: string;
  level: "high" | "medium";
}

export const fraudAlerts: FraudAlert[] = [
  { title: "Tentatives d'échec répétées", detail: "Numéro +243 82 •• •• 214 · 7 échecs en 5 min", level: "high" },
  { title: "Montant atypique", detail: "Paiement de 4 800 $ · Institut Bonsomi", level: "medium" },
  { title: "Multi-comptes suspects", detail: "3 comptes, même appareil · UNIKIN", level: "medium" },
];
