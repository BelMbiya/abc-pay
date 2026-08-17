"use client";

import { useEffect, useRef } from "react";
import { LANDING_HTML } from "./landing-markup";
import { initLanding } from "./landing-logic";
import "./bienvenue.css";

/**
 * Landing marketing publique (/bienvenue).
 *
 * Le design d'origine est une page 100 % inline-style ; on la rend fidèlement
 * via `dangerouslySetInnerHTML` (contenu de confiance, généré depuis l'export
 * du design) et on rebranche tous les comportements dans `initLanding`.
 *
 * Anti-flash : le conteneur démarre à `opacity:0` (la responsivité est pilotée
 * par JS). `initLanding` le révèle en inline après la première passe de
 * disposition. Le composant n'a AUCUN état → il ne se re-rend jamais, donc la
 * révélation impérative ne peut pas détacher les écouteurs. Un filet de sécurité
 * révèle malgré tout si l'init échouait.
 */
export default function BienvenueLanding() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const failSafe = window.setTimeout(() => {
      el.style.opacity = "1";
    }, 800);
    const cleanup = initLanding(el);
    return () => {
      window.clearTimeout(failSafe);
      cleanup();
    };
  }, []);

  return (
    <div ref={ref} style={{ opacity: 0 }} dangerouslySetInnerHTML={{ __html: LANDING_HTML }} />
  );
}
