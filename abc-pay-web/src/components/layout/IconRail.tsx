"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface RailItem {
  label: string;
  icon: LucideIcon;
  href: string;
}

// Géométrie du rail : icône 44px (size-11) + espacement 6px (gap-1.5) = pas de 50px.
const ITEM = 44;
const GAP = 6;
const STEP = ITEM + GAP;

/**
 * Rail d'icônes vertical avec **indicateur or coulissant** : le fond doré glisse
 * jusqu'à l'item actif (transition douce), plutôt qu'un simple changement de couleur.
 * Utilisé par les 3 espaces (payeur, établissement, admin).
 */
export function IconRail({
  items,
  rootHref,
  brandHref,
  footer,
  className,
}: {
  items: RailItem[];
  rootHref: string;
  brandHref: string;
  footer?: ReactNode;
  className?: string;
}) {
  const pathname = usePathname();

  // Index actif : correspondance exacte, sinon plus long préfixe (hors racine).
  const activeIndex = (() => {
    const exact = items.findIndex((i) => pathname === i.href);
    if (exact >= 0) return exact;
    let best = -1;
    let bestLen = -1;
    items.forEach((i, idx) => {
      if (i.href !== rootHref && pathname.startsWith(i.href + "/") && i.href.length > bestLen) {
        best = idx;
        bestLen = i.href.length;
      }
    });
    return best;
  })();

  return (
    <aside
      className={cn(
        "sticky top-0 h-dvh w-[76px] flex-col items-center border-r border-gray-100 bg-white py-5",
        className,
      )}
    >
      <Link href={brandHref} aria-label="Accueil" className="mb-6">
        {/* eslint-disable-next-line @next/next/no-img-element -- logo statique */}
        <img src="/logo.png" alt="abc pay" width={34} height={34} className="size-[34px] rounded-[10px] object-contain" />
      </Link>

      <nav className="relative flex flex-col items-center gap-1.5">
        {/* Indicateur or coulissant (derrière les icônes) */}
        {activeIndex >= 0 ? (
          <span
            aria-hidden
            className="bg-grad-gold pointer-events-none absolute left-0 top-0 size-11 rounded-xl shadow-[0_6px_16px_rgba(224,142,0,0.35)] transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)]"
            style={{ transform: `translateY(${activeIndex * STEP}px)` }}
          />
        ) : null}

        {items.map((item, idx) => {
          const Icon = item.icon;
          const active = idx === activeIndex;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative z-10 flex size-11 items-center justify-center rounded-xl transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                active ? "text-gold-ink" : "text-gray-500 hover:bg-gray-100 hover:text-ink",
              )}
            >
              <Icon className="size-5" strokeWidth={2.1} />
              <span className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-lg bg-navy px-2.5 py-1.5 text-[11px] font-semibold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {footer ? <div className="mt-auto flex flex-col items-center gap-2">{footer}</div> : null}
    </aside>
  );
}
