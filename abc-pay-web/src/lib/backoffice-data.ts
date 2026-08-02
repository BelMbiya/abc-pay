/**
 * Données mock du back-office établissement (remplacées à terme par l'API :
 * GET /establishments/{id}/dashboard, /unpaid…). Montants en USD.
 */

export const establishment = {
  name: "Institut Supérieur de Commerce (ISC)",
  short: "ISC",
  level: "Enseignement supérieur",
  year: "2026-2027",
};

export const kpis = {
  expected: 248500, // attendu sur l'année
  collected: 162300, // encaissé
  pendingPayout: 18450, // en attente de reversement
};

export const recoveryRate = Math.round((kpis.collected / kpis.expected) * 100); // %

/** Encaissements par semaine (8 dernières semaines), en milliers de $. */
export const weekly = [8, 14, 22, 19, 27, 31, 24, 18];

/** Répartition des encaissements par moyen de paiement. */
export const byMethod = [
  { label: "M-Pesa", pct: 42, color: "#1BA672" },
  { label: "Airtel Money", pct: 24, color: "#E5484D" },
  { label: "Orange Money", pct: 18, color: "#F5A623" },
  { label: "Africell Money", pct: 6, color: "#2D74D6" },
  { label: "Espèces", pct: 7, color: "#6B7484" },
  { label: "Carte", pct: 3, color: "#0F3E8A" },
];

export interface UnpaidRow {
  name: string;
  group: string;
  amount: number;
  daysLate: number;
}

export const unpaid: UnpaidRow[] = [
  { name: "Ilunga Mbuyi Grace", group: "Bac 2 · Informatique de Gestion", amount: 250, daysLate: 12 },
  { name: "Kabongo Tshala Divine", group: "Bac 1 · Sciences Économiques", amount: 150, daysLate: 8 },
  { name: "Mwamba Kalala Josué", group: "Bac 3 · Comptabilité", amount: 320, daysLate: 21 },
  { name: "Nsimba Lelo Merveille", group: "Bac 2 · Informatique de Gestion", amount: 100, daysLate: 3 },
  { name: "Kasongo Ngoy Emmanuel", group: "Master 1 · Management", amount: 480, daysLate: 34 },
];

// ── Frais & barèmes ────────────────────────────────────────────────────
export interface FeeType {
  name: string;
  frequency: "unique" | "mensuel" | "trimestriel" | "semestriel" | "par crédit";
  optional: boolean;
}

export const feeTypes: FeeType[] = [
  { name: "Frais d'inscription", frequency: "unique", optional: false },
  { name: "Minerval", frequency: "semestriel", optional: false },
  { name: "Frais académiques", frequency: "par crédit", optional: false },
  { name: "Frais de laboratoire", frequency: "semestriel", optional: true },
  { name: "Frais d'examen", frequency: "semestriel", optional: false },
  { name: "Pénalité de retard", frequency: "unique", optional: true },
];

export interface FeeScheduleRow {
  feeType: string;
  group: string;
  amount: number;
  frequency: string;
  currency: "USD" | "CDF";
}

export const feeSchedule: FeeScheduleRow[] = [
  { feeType: "Frais d'inscription", group: "Toutes promotions", amount: 50, frequency: "Unique", currency: "USD" },
  { feeType: "Minerval", group: "Bac 1 · Sciences Économiques", amount: 300, frequency: "Semestriel", currency: "USD" },
  { feeType: "Minerval", group: "Bac 2 · Informatique de Gestion", amount: 350, frequency: "Semestriel", currency: "USD" },
  { feeType: "Minerval", group: "Master 1 · Management", amount: 500, frequency: "Semestriel", currency: "USD" },
  { feeType: "Frais de laboratoire", group: "Informatique de Gestion", amount: 40, frequency: "Semestriel", currency: "USD" },
  { feeType: "Frais d'examen", group: "Toutes promotions", amount: 25, frequency: "Semestriel", currency: "USD" },
];

// ── Reversements ───────────────────────────────────────────────────────
export type SettlementStatus = "paid" | "pending";

export interface Settlement {
  period: string;
  gross: number;
  commission: number;
  net: number;
  status: SettlementStatus;
  date: string;
}

export const settlements: Settlement[] = [
  { period: "23–29 juil. 2026", gross: 18450, commission: 369, net: 18081, status: "pending", date: "Prévu 31 juil." },
  { period: "16–22 juil. 2026", gross: 22300, commission: 446, net: 21854, status: "paid", date: "24 juil. 2026" },
  { period: "9–15 juil. 2026", gross: 15720, commission: 314, net: 15406, status: "paid", date: "17 juil. 2026" },
  { period: "2–8 juil. 2026", gross: 27600, commission: 552, net: 27048, status: "paid", date: "10 juil. 2026" },
];
