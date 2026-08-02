/** Filtre par période (côté client) — les vues s'adaptent à la date sélectionnée. */
export type Period = "today" | "7d" | "30d" | "month" | "all";

/** Période sélectionnée par défaut dans toutes les vues (aujourd'hui). */
export const DEFAULT_PERIOD: Period = "today";

export const PERIODS: { id: Period; label: string }[] = [
  { id: "today", label: "Aujourd'hui" },
  { id: "7d", label: "7 derniers jours" },
  { id: "30d", label: "30 derniers jours" },
  { id: "month", label: "Ce mois-ci" },
  { id: "all", label: "Toute la période" },
];

const DAY = 86_400_000;

/** Vrai si la date ISO tombe dans la période choisie. */
export function inPeriod(iso: string | null | undefined, period: Period): boolean {
  if (period === "all" || !iso) return true;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return true;
  const now = new Date();
  // "today" : même jour calendaire que maintenant.
  if (period === "today") {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  }
  if (period === "7d") return d.getTime() >= now.getTime() - 7 * DAY;
  if (period === "30d") return d.getTime() >= now.getTime() - 30 * DAY;
  // "month" : mois calendaire courant
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}
