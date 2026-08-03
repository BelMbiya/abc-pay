"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

/**
 * Reveal — apparition au scroll (IntersectionObserver, 0 dépendance).
 * Bascule `.is-visible` une seule fois puis se désabonne. Le style de base
 * (.reveal) et prefers-reduced-motion vivent dans globals.css.
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  /** Décalage en ms pour un effet d'escalier (stagger). */
  delay?: number;
  as?: ElementType;
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            el.classList.add("is-visible");
            io.unobserve(el);
          }
        }
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}

/**
 * Counter — compteur animé qui démarre quand il entre dans le viewport.
 * requestAnimationFrame + easing ; respecte prefers-reduced-motion (valeur finale directe).
 */
export function Counter({
  to,
  duration = 1600,
  decimals = 0,
  prefix = "",
  suffix = "",
  className = "",
}: {
  to: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  // Valeur initiale = cible : rendu SSR correct + dégradation sans JS (jamais 0 affiché).
  const [val, setVal] = useState(to);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Sous prefers-reduced-motion : on garde la valeur finale, sans animation.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let started = false;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !started) {
          started = true;
          io.disconnect();
          const t0 = performance.now();
          const tick = (now: number) => {
            const p = Math.min(1, (now - t0) / duration);
            const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
            setVal(to * eased);
            if (p < 1) raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 },
    );
    // Démarre l'animation à 0 seulement quand la section entre dans le viewport.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- point de départ de l'animation
    setVal(0);
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, duration]);

  const formatted = val.toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

/**
 * RedirectIfAuthed — un payeur déjà connecté n'a rien à faire sur la landing :
 * on le renvoie vers son espace. Ne rend rien (garde côté client uniquement).
 */
export function RedirectIfAuthed() {
  const router = useRouter();
  const { ready, token } = useAuth();

  useEffect(() => {
    if (ready && token) router.replace("/");
  }, [ready, token, router]);

  return null;
}
