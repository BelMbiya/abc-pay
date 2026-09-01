"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronUp, type LucideIcon } from "lucide-react";
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
 * jusqu'à l'item actif. La nav DÉFILE si les items dépassent la hauteur (fenêtre courte /
 * beaucoup d'entrées), le footer reste figé en bas. Les tooltips sont rendus dans un
 * PORTAIL (position fixe) → jamais coupés par le défilement. Utilisé par les 3 espaces.
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
  const [tip, setTip] = useState<{ label: string; top: number; left: number } | null>(null);

  // Affordance de défilement : y a-t-il des items cachés au-dessus / en dessous ?
  const navRef = useRef<HTMLElement>(null);
  const [scroll, setScroll] = useState<{ up: boolean; down: boolean }>({ up: false, down: false });
  const updateScroll = useCallback(() => {
    const el = navRef.current;
    if (!el) return;
    const up = el.scrollTop > 4;
    const down = el.scrollTop + el.clientHeight < el.scrollHeight - 4;
    setScroll((s) => (s.up === up && s.down === down ? s : { up, down }));
  }, []);
  useEffect(() => {
    updateScroll();
    const el = navRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(updateScroll);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateScroll, items.length]);

  const showTip = (label: string) => (e: React.SyntheticEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ label, top: r.top + r.height / 2, left: r.right + 12 });
  };
  const hideTip = () => setTip(null);

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
        "sticky top-0 flex h-dvh w-[76px] flex-col items-center border-r border-gray-100 bg-white",
        className,
      )}
    >
      <Link href={brandHref} aria-label="Accueil" className="mb-6 mt-5 shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element -- logo statique */}
        <img src="/logo.png" alt="abc pay" width={34} height={34} className="size-[34px] rounded-[10px] object-contain" />
      </Link>

      {/* Zone défilante + fondus d'affordance (haut/bas) quand des items sont cachés. */}
      <div className="relative flex min-h-0 w-full flex-1 flex-col items-center">
        {/* Fondu HAUT + chevron : des items sont cachés au-dessus. */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 z-20 flex h-7 items-start justify-center bg-gradient-to-b from-white to-transparent transition-opacity duration-200",
            scroll.up ? "opacity-100" : "opacity-0",
          )}
        >
          <ChevronUp className="mt-0.5 size-4 text-gray-400" strokeWidth={2.4} />
        </div>

        {/* Nav DÉFILANTE (scrollbar masquée) : atteint tous les items même en fenêtre courte. */}
        <nav
          ref={navRef}
          onScroll={updateScroll}
          className="relative flex min-h-0 flex-1 flex-col items-center gap-1.5 overflow-y-auto py-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
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
              onMouseEnter={showTip(item.label)}
              onMouseLeave={hideTip}
              onFocus={showTip(item.label)}
              onBlur={hideTip}
              className={cn(
                "relative z-10 flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                active ? "text-gold-ink" : "text-gray-500 hover:bg-gray-100 hover:text-ink",
              )}
            >
              <Icon className="size-5" strokeWidth={2.1} />
            </Link>
          );
        })}
        </nav>

        {/* Fondu BAS + chevron : des items sont cachés en dessous → « scrolle pour voir plus ». */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 z-20 flex h-8 items-end justify-center bg-gradient-to-t from-white via-white/90 to-transparent transition-opacity duration-200",
            scroll.down ? "opacity-100" : "opacity-0",
          )}
        >
          <ChevronDown className="mb-0.5 size-4 animate-bounce text-gray-500" strokeWidth={2.4} />
        </div>
      </div>

      {footer ? <div className="flex shrink-0 flex-col items-center gap-2 pb-5 pt-2">{footer}</div> : null}

      {/* Tooltip en PORTAIL → au-dessus de tout, jamais coupé par le défilement du rail. */}
      {tip && typeof document !== "undefined"
        ? createPortal(
            <span
              style={{ top: tip.top, left: tip.left }}
              className="pointer-events-none fixed z-[200] -translate-y-1/2 whitespace-nowrap rounded-lg bg-navy px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-lg"
            >
              {tip.label}
            </span>,
            document.body,
          )
        : null}
    </aside>
  );
}
