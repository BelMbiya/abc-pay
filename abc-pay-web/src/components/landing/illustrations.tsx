/**
 * Illustrations SVG « maison » — style flat, personnages stylisés, aux couleurs
 * de la charte abc pay (cf. globals.css @theme). Composants SERVEUR (aucun JS
 * envoyé au client) : légers, uniques, libres de droits, cohérents avec le design.
 *
 * Les couleurs sont volontairement écrites en dur ICI : un dessin vectoriel a
 * besoin de valeurs de remplissage. Elles reprennent À L'IDENTIQUE les tokens
 * de la charte — ne pas diverger de globals.css.
 */

const C = {
  navy: "#0F1B30",
  navy2: "#16233C",
  blue700: "#0F3E8A",
  blue600: "#1857B8",
  blue500: "#2D74D6",
  blue100: "#DCEAFB",
  gold500: "#F5A623",
  gold400: "#FFC24B",
  gold600: "#E08E00",
  green: "#1BA672",
  successBg: "#E6F5EE",
  gray300: "#C6CDD6",
  ink: "#101826",
  white: "#FFFFFF",
  skin: "#E8B58C",
  skin2: "#C88B62",
} as const;

/* ---------- Bustes humains réutilisables (use-cases / étapes) ------------- */

/** Parent/payeuse — buste stylisé, foulard bleu. */
export function PayerAvatar({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label="Utilisatrice abc pay" fill="none">
      <circle cx="60" cy="60" r="60" fill={C.blue100} />
      <path d="M22 120a38 38 0 0 1 76 0Z" fill={C.blue600} />
      <path d="M40 74c0 14 40 14 40 0v-8H40Z" fill={C.skin} />
      <path d="M35 48a25 25 0 0 1 50 0v10a25 25 0 0 1-50 0Z" fill={C.skin2} />
      <path d="M35 50a25 25 0 0 1 50 0c-6 2-14-4-25-4s-19 6-25 4Z" fill={C.navy} />
      <circle cx="50" cy="55" r="3" fill={C.navy} />
      <circle cx="70" cy="55" r="3" fill={C.navy} />
      <path d="M54 66c4 3 8 3 12 0" stroke={C.navy} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M30 96c6-9 16-14 30-14s24 5 30 14" fill={C.gold400} />
    </svg>
  );
}

/** Étudiant·e — toque de diplômé (Tuition). */
export function StudentAvatar({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label="Étudiant abc pay" fill="none">
      <circle cx="60" cy="60" r="60" fill={C.blue100} />
      <path d="M22 120a38 38 0 0 1 76 0Z" fill={C.blue500} />
      <path d="M42 78c0 12 36 12 36 0v-10H42Z" fill={C.skin} />
      <path d="M38 52a22 22 0 0 1 44 0v8a22 22 0 0 1-44 0Z" fill={C.skin2} />
      <circle cx="51" cy="57" r="3" fill={C.navy} />
      <circle cx="69" cy="57" r="3" fill={C.navy} />
      <path d="M55 67c3 2.5 7 2.5 10 0" stroke={C.navy} strokeWidth="2.4" strokeLinecap="round" />
      {/* toque */}
      <path d="M60 30 34 42l26 12 26-12Z" fill={C.navy} />
      <path d="M48 50v9c0 6 24 6 24 0v-9l-12 6Z" fill={C.navy2} />
      <path d="M86 42v14" stroke={C.gold500} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="86" cy="58" r="3" fill={C.gold400} />
    </svg>
  );
}

/** Agent d'établissement — buste avec cravate (back-office). */
export function StaffAvatar({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label="Établissement partenaire" fill="none">
      <circle cx="60" cy="60" r="60" fill={C.blue100} />
      <path d="M22 120a38 38 0 0 1 76 0Z" fill={C.navy} />
      <path d="M52 118l8-16 8 16Z" fill={C.gold400} />
      <path d="M42 76c0 12 36 12 36 0v-10H42Z" fill={C.skin} />
      <path d="M39 50a21 21 0 0 1 42 0v9a21 21 0 0 1-42 0Z" fill={C.skin2} />
      <path d="M39 50a21 21 0 0 1 42 0c-5-8-14-10-21-10s-16 2-21 10Z" fill={C.navy2} />
      <circle cx="51" cy="56" r="3" fill={C.navy} />
      <circle cx="69" cy="56" r="3" fill={C.navy} />
      <path d="M55 66c3 2.5 7 2.5 10 0" stroke={C.navy} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- Scène héro : téléphone + paiement réussi + argent qui vole ---- */

export function HeroScene({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 420 460" className={className} role="img" aria-label="Un paiement abc pay réussi sur mobile" fill="none">
      <defs>
        <linearGradient id="hg-phone" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={C.white} />
          <stop offset="1" stopColor="#EAF1FB" />
        </linearGradient>
        <linearGradient id="hg-screen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.blue500} />
          <stop offset="1" stopColor={C.blue700} />
        </linearGradient>
        <linearGradient id="hg-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={C.gold400} />
          <stop offset="1" stopColor={C.gold600} />
        </linearGradient>
        <filter id="hg-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="24" floodColor="#06122B" floodOpacity="0.45" />
        </filter>
      </defs>

      {/* halos */}
      <circle cx="330" cy="90" r="70" fill={C.gold500} opacity="0.16" className="animate-glow" />
      <circle cx="70" cy="360" r="80" fill={C.blue500} opacity="0.22" className="animate-glow" />

      {/* personnage derrière le téléphone (parent qui paie) */}
      <g className="animate-float-sm">
        <path d="M300 300c0-40 70-40 70 0v70h-70Z" fill={C.blue600} />
        <circle cx="335" cy="270" r="26" fill={C.skin2} />
        <path d="M312 262a23 23 0 0 1 46 0c-6 2-15-3-23-3s-17 5-23 3Z" fill={C.navy} />
        <circle cx="328" cy="270" r="2.6" fill={C.navy} />
        <circle cx="344" cy="270" r="2.6" fill={C.navy} />
        <path d="M330 279c3 2 7 2 10 0" stroke={C.navy} strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* téléphone */}
      <g filter="url(#hg-shadow)" className="animate-float">
        <rect x="120" y="70" width="190" height="330" rx="34" fill="url(#hg-phone)" />
        <rect x="132" y="82" width="166" height="306" rx="26" fill="url(#hg-screen)" />
        {/* encoche */}
        <rect x="188" y="92" width="54" height="10" rx="5" fill={C.navy} opacity="0.35" />

        {/* pastille succès */}
        <circle cx="215" cy="170" r="40" fill={C.white} opacity="0.14" />
        <circle cx="215" cy="170" r="30" fill={C.green} />
        <path d="M202 170l9 9 18-19" stroke={C.white} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />

        <text x="215" y="238" textAnchor="middle" fill={C.white} fontFamily="Sora, sans-serif" fontSize="15" fontWeight="700">
          Paiement réussi
        </text>
        <text x="215" y="272" textAnchor="middle" fill={C.gold400} fontFamily="Sora, sans-serif" fontSize="30" fontWeight="800">
          250,00 $
        </text>

        {/* reçu / lignes */}
        <rect x="156" y="298" width="118" height="12" rx="6" fill={C.white} opacity="0.22" />
        <rect x="156" y="320" width="86" height="12" rx="6" fill={C.white} opacity="0.16" />
        <rect x="156" y="352" width="118" height="26" rx="13" fill="url(#hg-gold)" />
      </g>

      {/* argent / jetons opérateurs qui flottent */}
      <g className="animate-float-sm">
        <circle cx="96" cy="140" r="26" fill="url(#hg-gold)" />
        <text x="96" y="147" textAnchor="middle" fill={C.gold600} fontFamily="Sora, sans-serif" fontSize="16" fontWeight="800">$</text>
      </g>
      <g className="animate-float">
        <circle cx="340" cy="200" r="22" fill={C.white} />
        <text x="340" y="206" textAnchor="middle" fill={C.blue600} fontFamily="Sora, sans-serif" fontSize="12" fontWeight="800">FC</text>
      </g>
      <g className="animate-float-sm">
        <rect x="70" y="230" width="70" height="30" rx="15" fill={C.white} />
        <circle cx="88" cy="245" r="8" fill={C.green} />
        <rect x="102" y="240" width="28" height="4" rx="2" fill={C.gray300} />
        <rect x="102" y="248" width="20" height="4" rx="2" fill="#C6CDD6" />
      </g>
    </svg>
  );
}

/* ---------- Scène Tuition : étudiant + école + reçu -----------------------*/

export function TuitionScene({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 420 340" className={className} role="img" aria-label="Paiement des frais de scolarité" fill="none">
      <defs>
        <linearGradient id="tg-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6ED0FF" />
          <stop offset="1" stopColor="#0E86D4" />
        </linearGradient>
        <filter id="tg-sh" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="12" stdDeviation="16" floodColor="#06122B" floodOpacity="0.25" />
        </filter>
      </defs>

      <circle cx="210" cy="150" r="140" fill="url(#tg-sky)" opacity="0.18" />

      {/* école */}
      <g filter="url(#tg-sh)">
        <rect x="120" y="120" width="180" height="120" rx="12" fill={C.white} />
        <path d="M110 122 210 74l100 48Z" fill={C.blue600} />
        <rect x="196" y="180" width="28" height="60" rx="4" fill={C.blue500} />
        <rect x="140" y="150" width="26" height="26" rx="4" fill={C.blue100} />
        <rect x="254" y="150" width="26" height="26" rx="4" fill={C.blue100} />
        <path d="M210 84v-18" stroke={C.gold500} strokeWidth="3" strokeLinecap="round" />
        <path d="M210 66h16v10h-16Z" fill={C.gold400} />
      </g>

      {/* étudiant */}
      <g transform="translate(38 138)">
        <path d="M0 150c0-34 60-34 60 0v20H0Z" fill={C.blue700} />
        <circle cx="30" cy="96" r="24" fill={C.skin} />
        <path d="M30 74 8 84l22 10 22-10Z" fill={C.navy} />
        <path d="M18 90v8c0 5 24 5 24 0v-8l-12 6Z" fill={C.navy2} />
        <circle cx="23" cy="98" r="2.4" fill={C.navy} />
        <circle cx="37" cy="98" r="2.4" fill={C.navy} />
        <path d="M25 106c3 2 7 2 10 0" stroke={C.navy} strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* reçu numérique */}
      <g filter="url(#tg-sh)" className="animate-float-sm">
        <rect x="300" y="150" width="86" height="118" rx="12" fill={C.white} />
        <circle cx="343" cy="182" r="16" fill={C.successBg} />
        <path d="M336 182l5 5 9-10" stroke={C.green} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="316" y="210" width="54" height="7" rx="3.5" fill="#E4E9F0" />
        <rect x="316" y="224" width="40" height="7" rx="3.5" fill="#E4E9F0" />
        <rect x="316" y="244" width="54" height="14" rx="7" fill={C.gold400} />
      </g>
    </svg>
  );
}

/* ---------- Scène établissement : croissance + partenariat ---------------- */

export function PartnerScene({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 420 320" className={className} role="img" aria-label="Devenez établissement partenaire" fill="none">
      <defs>
        <linearGradient id="pg-bar" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={C.blue700} />
          <stop offset="1" stopColor={C.blue500} />
        </linearGradient>
      </defs>

      <circle cx="210" cy="150" r="150" fill={C.blue500} opacity="0.12" />

      {/* carte dashboard */}
      <g>
        <rect x="70" y="70" width="280" height="180" rx="18" fill={C.white} />
        <rect x="70" y="70" width="280" height="44" rx="18" fill={C.navy} />
        <rect x="70" y="96" width="280" height="18" fill={C.navy} />
        <circle cx="92" cy="92" r="5" fill={C.gold400} />
        <circle cx="110" cy="92" r="5" fill={C.blue500} />
        <rect x="128" y="88" width="70" height="8" rx="4" fill={C.white} opacity="0.5" />

        {/* barres croissantes */}
        <rect x="100" y="188" width="26" height="42" rx="6" fill="url(#pg-bar)" />
        <rect x="140" y="170" width="26" height="60" rx="6" fill="url(#pg-bar)" />
        <rect x="180" y="150" width="26" height="80" rx="6" fill="url(#pg-bar)" />
        <rect x="220" y="128" width="26" height="102" rx="6" fill="url(#pg-bar)" />
        {/* courbe */}
        <path d="M108 176 152 158 196 138 236 112" stroke={C.gold500} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="animate-dash" fill="none" />
        <circle cx="236" cy="112" r="7" fill={C.gold400} />
        {/* flèche montante */}
        <path d="M300 150l16-16m0 0h-12m12 0v12" stroke={C.green} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* pastille reversement */}
      <g className="animate-float-sm">
        <rect x="250" y="196" width="110" height="60" rx="14" fill={C.navy} />
        <text x="268" y="222" fill={C.gray300} fontFamily="Inter, sans-serif" fontSize="10">Net à reverser</text>
        <text x="268" y="244" fill={C.gold400} fontFamily="Sora, sans-serif" fontSize="18" fontWeight="800">+ 24 %</text>
      </g>
    </svg>
  );
}

/* ---------- Étoiles de notation (social proof) --------------------------- */

export function Stars({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 20" className={className} role="img" aria-label="Noté 5 sur 5" fill="none">
      {[0, 1, 2, 3, 4].map((i) => (
        <path
          key={i}
          d={`M${10 + i * 24} 2 l2.35 4.76 5.25.76-3.8 3.7.9 5.23L${10 + i * 24} 14.7l-4.7 2.47.9-5.23-3.8-3.7 5.25-.76Z`}
          fill={C.gold400}
        />
      ))}
    </svg>
  );
}
