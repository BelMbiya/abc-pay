/**
 * Formatage monétaire adaptable à la devise plateforme (USD / CDF).
 * La devise courante est posée au démarrage (via /settings) puis utilisée par money().
 */
import { fmt } from "@/lib/api";

const SYMBOLS: Record<string, string> = { USD: "$", CDF: "FC" };

let currentCurrency = "USD";
let usdCdfRate = 2800; // CDF pour 1 USD

export function setCurrencyCode(code: string): void {
  currentCurrency = code || "USD";
}

export function setRate(rate: number): void {
  if (rate > 0) usdCdfRate = rate;
}

export function currencyCode(): string {
  return currentCurrency;
}

/** Convertit un montant d'une devise vers une autre (USD/CDF). */
export function convert(amount: number, from: string, to: string): number {
  if (from === to) return amount;
  if (from === "USD" && to === "CDF") return amount * usdCdfRate;
  if (from === "CDF" && to === "USD") return amount / usdCdfRate;
  return amount;
}

/** Convertit vers la devise plateforme courante (pour agréger). */
export function toBase(amount: number, from: string): number {
  return convert(amount, from, currentCurrency);
}

export function currencySymbol(code = currentCurrency): string {
  return SYMBOLS[code] ?? code;
}

/** Montant formaté avec le symbole de devise. Ex. : 1500 → "1 500 $" ou "1 500 FC". */
export function money(n: number, code = currentCurrency): string {
  return `${fmt(n)} ${currencySymbol(code)}`;
}
