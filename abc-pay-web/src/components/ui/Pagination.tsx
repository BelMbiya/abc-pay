"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Pagination réutilisable (40 lignes/page par défaut) pour tous les tableaux de l'app.
 * `usePagination` gère l'état + le découpage ; `<Pagination>` rend les contrôles.
 */
export function usePagination<T>(items: T[], pageSize = 40) {
  const [page, setPage] = useState(1);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Toujours garder une page valide quand la liste change (filtre / recherche / rechargement).
  // eslint-disable-next-line react-hooks/set-state-in-effect -- clamp dérivé de totalPages
  useEffect(() => setPage((p) => Math.min(Math.max(1, p), totalPages)), [totalPages]);

  const pageItems = useMemo(() => items.slice((page - 1) * pageSize, page * pageSize), [items, page, pageSize]);

  return { page, setPage, pageItems, total, totalPages, pageSize };
}

/** Fenêtre de numéros de page autour de la page courante (avec ellipses). */
function windowed(page: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  if (start > 2) out.push("…");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < totalPages - 1) out.push("…");
  out.push(totalPages);
  return out;
}

const btn =
  "flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-[12.5px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-40 disabled:pointer-events-none";

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPage,
  className = "",
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
  className?: string;
}) {
  if (totalPages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className={`mt-4 flex flex-wrap items-center justify-between gap-3 ${className}`}>
      <p className="text-[12px] text-gray-500">
        <span className="font-bold text-ink">{from.toLocaleString("fr-FR")}–{to.toLocaleString("fr-FR")}</span> sur {total.toLocaleString("fr-FR")}
      </p>
      <div className="flex items-center gap-1">
        <button type="button" aria-label="Page précédente" className={`${btn} bg-white text-ink hover:bg-gray-300/40`} disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft className="size-4" strokeWidth={2.4} />
        </button>
        {windowed(page, totalPages).map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} className="px-1.5 text-[12.5px] text-gray-500">…</span>
          ) : (
            <button
              key={p}
              type="button"
              aria-label={`Page ${p}`}
              aria-current={p === page ? "page" : undefined}
              onClick={() => onPage(p)}
              className={`${btn} ${p === page ? "bg-grad-primary text-white" : "bg-white text-ink hover:bg-gray-300/40"}`}
            >
              {p}
            </button>
          ),
        )}
        <button type="button" aria-label="Page suivante" className={`${btn} bg-white text-ink hover:bg-gray-300/40`} disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          <ChevronRight className="size-4" strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}
