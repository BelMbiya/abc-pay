import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight, ShieldCheck, GraduationCap, ScanLine, Receipt, ArrowUpRight,
  ArrowDownLeft, Lock, FileCheck2, Building2, Handshake, TrendingUp,
  Sparkles, Phone, CheckCircle2, BadgeCheck, Clock, Wallet, Quote,
} from "lucide-react";
import { Reveal, Counter, RedirectIfAuthed } from "@/components/landing/motion";
import {
  HeroScene, TuitionScene, PartnerScene, PayerAvatar, StudentAvatar, StaffAvatar, Stars,
} from "@/components/landing/illustrations";

const SITE = "https://abcpay.cd";
const PARTNER_MAILTO =
  "mailto:partenariat@abcpay.cd?subject=Partenariat%20abc%20pay&body=Bonjour%20abc%20pay%2C%0A%0ANotre%20%C3%A9tablissement%20souhaite%20digitaliser%20l%27encaissement%20des%20frais%20de%20scolarit%C3%A9.";

/* ------------------------------ SEO ------------------------------ */
export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "abc pay — Le paiement réinventé pour la RDC | Payer, envoyer, recevoir",
  description:
    "abc pay, la plateforme congolaise de paiement : envoyez, recevez et payez avec tous les opérateurs mobile money. Programme phare : le paiement des frais de scolarité (Tuition), sans frais pour le payeur, reçu instantané.",
  keywords: [
    "abc pay", "paiement RDC", "mobile money Congo", "frais de scolarité", "tuition RDC",
    "M-Pesa", "Airtel Money", "Orange Money", "Africell Money", "paiement école Kinshasa",
    "reçu numérique", "transfert d'argent Congo",
  ],
  alternates: { canonical: "/bienvenue" },
  openGraph: {
    type: "website",
    locale: "fr_CD",
    url: `${SITE}/bienvenue`,
    siteName: "abc pay",
    title: "abc pay — Le paiement réinventé pour la RDC",
    description:
      "Envoyez, recevez et payez avec tous les opérateurs. Payez la scolarité (Tuition) sans frais, reçu instantané.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "abc pay — The Connected Money" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "abc pay — Le paiement réinventé pour la RDC",
    description: "Payer, envoyer, recevoir. Tous les opérateurs. Programme phare : Tuition, sans frais.",
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
};

/* --------------------------- JSON-LD ---------------------------- */
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE}/#organization`,
      name: "abc pay",
      url: SITE,
      slogan: "The Connected Money",
      logo: `${SITE}/logo.png`,
      areaServed: { "@type": "Country", name: "République démocratique du Congo" },
      description:
        "Plateforme de paiement pour la RDC : mobile money, transferts et paiement des frais de scolarité.",
    },
    { "@type": "WebSite", "@id": `${SITE}/#website`, url: SITE, name: "abc pay", inLanguage: "fr", publisher: { "@id": `${SITE}/#organization` } },
    {
      "@type": "Product",
      name: "abc pay Tuition",
      brand: { "@id": `${SITE}/#organization` },
      category: "Paiement des frais de scolarité",
      description: "Paiement des frais de scolarité en RDC, sans frais pour le payeur, avec reçu numérique instantané et réconciliation par matricule.",
      offers: { "@type": "Offer", priceCurrency: "USD", price: "0", description: "Aucun frais à la charge du payeur pour la Tuition.", availability: "https://schema.org/InStock" },
      aggregateRating: { "@type": "AggregateRating", ratingValue: "4.9", reviewCount: "128" },
    },
  ],
};

/* --------------------------- Données ---------------------------- */
const OPERATORS = ["M-Pesa", "Airtel Money", "Orange Money", "Africell Money", "Carte Visa", "Virement"];

const TRUST_BAR = [
  { icon: Lock, text: "Paiements chiffrés" },
  { icon: ShieldCheck, text: "Fonds jamais conservés" },
  { icon: FileCheck2, text: "Montants recalculés serveur" },
  { icon: BadgeCheck, text: "Reçu numérique vérifiable" },
];

const USE_CASES = [
  { icon: ArrowUpRight, title: "Envoyer", text: "Transférez à un proche par simple numéro, en dollars ou en francs." },
  { icon: ArrowDownLeft, title: "Recevoir", text: "Recevez de l'argent instantanément, chaque crédit tracé dans votre historique." },
  { icon: Receipt, title: "Payer", text: "Réglez un service ou un marchand et gardez un reçu numérique." },
  { icon: ScanLine, title: "Scanner", text: "Scannez un QR abc pay et payez en un geste, sans saisir un numéro." },
];

const STEPS = [
  { n: "1", title: "Connectez-vous", text: "Un numéro de téléphone suffit. Vérification par code, sans paperasse.", Art: PayerAvatar },
  { n: "2", title: "Choisissez & payez", text: "Établissement, montant, opérateur : tout est recalculé et confirmé côté serveur.", Art: StudentAvatar },
  { n: "3", title: "Recevez votre reçu", text: "Reçu numérique instantané, téléchargeable et partageable. L'école est notifiée.", Art: StaffAvatar },
];

const TESTIMONIALS = [
  { name: "Grâce M.", role: "Parent d'élève · Kinshasa", Art: PayerAvatar, quote: "J'ai payé le minerval depuis Matadi en deux minutes. Le reçu est arrivé direct sur mon téléphone." },
  { name: "Josué K.", role: "Étudiant · ISC", Art: StudentAvatar, quote: "Plus besoin de faire la file à la banque. Je paie mes frais académiques entre deux cours." },
  { name: "Dir. Nsimba", role: "Directeur · École primaire", Art: StaffAvatar, quote: "On suit les encaissements en temps réel et on relance les impayés d'un clic. Un vrai gain." },
];

const TRUST = [
  { icon: Lock, title: "Paiements chiffrés", text: "Chaque transaction est sécurisée de bout en bout." },
  { icon: ShieldCheck, title: "Vos fonds ne dorment pas chez nous", text: "abc pay ne conserve jamais votre argent : il va directement au bénéficiaire." },
  { icon: FileCheck2, title: "Montants recalculés côté serveur", text: "Impossible d'altérer un montant : la source de vérité, c'est le serveur." },
];

const PARTNER_POINTS = [
  "Encaissez la scolarité sur tous les opérateurs, sans matériel.",
  "Tableau de bord temps réel : encaissé, impayés, taux de recouvrement.",
  "Réconciliation par matricule et reversements automatisés.",
  "Aucun frais à la charge des parents — vous gardez la maîtrise.",
];

/* ============================ PAGE ============================== */
export default function BienvenuePage() {
  return (
    <main className="min-h-dvh bg-navy text-white">
      <RedirectIfAuthed />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      {/* ── NAV ─────────────────────────────────────────────── */}
      <header className="glass sticky top-0 z-40 border-x-0 border-t-0">
        <nav className="mx-auto flex h-16 w-full max-w-[1160px] items-center justify-between px-5 md:px-8">
          <Link href="/bienvenue" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo statique local */}
            <img src="/logo.png" alt="abc pay" width={32} height={32} className="size-8 rounded-[9px]" />
            <span className="font-display text-[16px] font-bold">abc pay</span>
          </Link>
          <div className="hidden items-center gap-7 text-[13.5px] font-semibold text-white/75 md:flex">
            <a href="#quotidien" className="transition-colors hover:text-white">Au quotidien</a>
            <a href="#tuition" className="transition-colors hover:text-white">Tuition</a>
            <a href="#tarifs" className="transition-colors hover:text-white">Tarifs</a>
            <a href="#etablissements" className="transition-colors hover:text-white">Établissements</a>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/connexion" className="rounded-pill px-4 py-2 text-[13.5px] font-bold text-white/85 transition-colors hover:text-white">Se connecter</Link>
            <a href="#etablissements" className="hidden rounded-pill bg-white/10 px-4 py-2 text-[13.5px] font-bold text-white transition-colors hover:bg-white/15 sm:inline-block">Devenir partenaire</a>
          </div>
        </nav>
      </header>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="bg-grad-hero relative overflow-hidden">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" />
        <div className="pointer-events-none absolute -right-40 -top-20 size-[520px] rounded-full bg-[radial-gradient(circle,rgba(255,194,75,0.18),transparent_70%)] animate-glow" />
        <div className="pointer-events-none absolute -left-40 bottom-0 size-[460px] rounded-full bg-[radial-gradient(circle,rgba(45,116,214,0.35),transparent_70%)] animate-glow" />

        <div className="mx-auto grid w-full max-w-[1160px] items-center gap-8 px-5 py-14 md:grid-cols-2 md:gap-6 md:px-8 md:py-20">
          <Reveal className="relative z-10 text-center md:text-left">
            <span className="inline-flex items-center gap-2 rounded-pill bg-white/10 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.09em] text-gold-400 ring-1 ring-white/15">
              <Sparkles className="size-3.5" strokeWidth={2.6} /> The Connected Money · RDC
            </span>
            <h1 className="mt-5 font-display text-[38px] font-extrabold leading-[1.03] tracking-tight sm:text-[50px] lg:text-[58px]">
              Le paiement,
              <br className="hidden sm:block" /> <span className="text-grad-gold text-glow">réinventé</span> pour la RDC.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-[#C7D3EC] md:mx-0">
              Envoyez, recevez et payez avec <strong className="font-semibold text-white">tous les opérateurs</strong> mobile money.
              Et réglez la <strong className="font-semibold text-white">scolarité</strong> en quelques secondes —
              <strong className="font-semibold text-white"> sans le moindre frais pour vous</strong>.
            </p>

            <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row md:mx-0">
              <Link href="/connexion" className="bg-grad-gold group flex flex-1 items-center justify-center gap-2 rounded-pill px-6 py-4 font-display text-[15px] font-extrabold text-gold-ink shadow-hero transition-transform active:scale-[0.98]">
                Commencer maintenant
                <ArrowRight className="size-[18px] transition-transform group-hover:translate-x-0.5" strokeWidth={2.6} />
              </Link>
              <a href="#tuition" className="flex flex-1 items-center justify-center gap-2 rounded-pill border border-white/25 px-6 py-4 text-[14px] font-bold text-white transition-colors hover:bg-white/10">
                <GraduationCap className="size-[18px] text-gold-400" strokeWidth={2.2} /> Découvrir Tuition
              </a>
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12.5px] text-white/70 md:justify-start">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-4 text-green" strokeWidth={2.4} /> Sans frais pour la Tuition</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-4 text-green" strokeWidth={2.4} /> Reçu instantané</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-4 text-green" strokeWidth={2.4} /> 100 % en ligne</span>
            </div>
          </Reveal>

          <Reveal className="relative z-10" delay={120}>
            <div className="relative mx-auto w-full max-w-[400px] md:max-w-none">
              <HeroScene className="w-full drop-shadow-2xl" />
              {/* cartes glass flottantes */}
              <div className="glass-strong absolute left-0 top-6 hidden items-center gap-2 rounded-2xl px-3 py-2 shadow-hero animate-float-sm sm:flex">
                <span className="flex size-7 items-center justify-center rounded-lg bg-success-bg text-green"><CheckCircle2 className="size-4" strokeWidth={2.6} /></span>
                <div className="text-left"><p className="text-[10px] text-white/60">Reçu émis</p><p className="font-display text-[12px] font-bold">RC-2026</p></div>
              </div>
              <div className="glass-strong absolute bottom-8 right-0 hidden items-center gap-2 rounded-2xl px-3 py-2 shadow-hero animate-float sm:flex">
                <Stars className="h-3.5 w-[86px]" />
                <span className="font-display text-[12px] font-bold text-gold-400">4,9</span>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Trust bar + opérateurs */}
        <div className="glass relative z-10 border-x-0 border-b-0">
          <div className="mx-auto max-w-[1160px] px-5 py-4 md:px-8">
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 md:justify-between">
              {TRUST_BAR.map((t) => {
                const Icon = t.icon;
                return (
                  <span key={t.text} className="inline-flex items-center gap-2 text-[12px] font-semibold text-white/75">
                    <Icon className="size-4 text-gold-400" strokeWidth={2.2} /> {t.text}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="border-t border-white/10 py-3.5">
            <div className="mx-auto flex max-w-[1160px] items-center gap-3 overflow-hidden px-5">
              <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-white/45">Compatible</span>
              <div className="flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
                <ul className="flex shrink-0 animate-marquee items-center gap-8 pr-8">
                  {[...OPERATORS, ...OPERATORS].map((op, i) => (
                    <li key={i} className="whitespace-nowrap font-display text-[15px] font-bold text-white/80">{op}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CHIFFRES ────────────────────────────────────────── */}
      <section className="bg-navy-2 px-5 py-14 md:px-8">
        <div className="mx-auto grid max-w-[1000px] grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { to: 6, prefix: "", suffix: "+", label: "Opérateurs & moyens" },
            { to: 30, prefix: "", suffix: " s", label: "Pour un paiement" },
            { to: 100, prefix: "", suffix: " %", label: "Reçus numériques" },
            { to: 0, prefix: "", suffix: " $", label: "Frais côté payeur (Tuition)" },
          ].map((s, i) => (
            <Reveal key={i} delay={i * 90} className="glass rounded-3xl p-6 text-center">
              <div className="font-display text-[34px] font-extrabold text-gold-400 sm:text-[40px]">
                <Counter to={s.to} prefix={s.prefix} suffix={s.suffix} />
              </div>
              <p className="mt-1 text-[12.5px] font-semibold text-[#AEBBD6]">{s.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── AU QUOTIDIEN ────────────────────────────────────── */}
      <section id="quotidien" className="bg-navy px-5 py-20 md:px-8">
        <div className="mx-auto max-w-[1000px]">
          <Reveal className="text-center">
            <h2 className="font-display text-[28px] font-extrabold tracking-tight sm:text-[36px]">
              Tout votre argent, <span className="text-grad-gold">une seule app</span>
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[14px] leading-relaxed text-[#AEBBD6]">
              Du transfert entre proches au paiement de la scolarité : abc pay réunit vos usages quotidiens au même endroit.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {USE_CASES.map((u, i) => {
              const Icon = u.icon;
              return (
                <Reveal key={u.title} delay={i * 80} className="group glass rounded-3xl p-6 transition hover:-translate-y-1 hover:bg-white/[0.09]">
                  <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-grad-gold text-gold-ink transition-transform group-hover:-translate-y-0.5">
                    <Icon className="size-[22px]" strokeWidth={2.2} />
                  </span>
                  <h3 className="font-display text-[16px] font-bold">{u.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-[#AEBBD6]">{u.text}</p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── TUITION (programme phare) ───────────────────────── */}
      <section id="tuition" className="relative overflow-hidden bg-navy-2 px-5 py-20 md:px-8">
        <div className="pointer-events-none absolute right-0 top-1/2 size-[420px] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(14,134,212,0.22),transparent_70%)]" />
        <div className="mx-auto grid max-w-[1100px] items-center gap-10 md:grid-cols-2">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-pill bg-[#0E86D4]/20 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-[#6ED0FF] ring-1 ring-[#6ED0FF]/30">
              <GraduationCap className="size-3.5" strokeWidth={2.6} /> Programme phare
            </span>
            <h2 className="mt-5 font-display text-[28px] font-extrabold leading-tight tracking-tight sm:text-[38px]">
              Payez la scolarité,<br /> gardez la preuve.
            </h2>
            <p className="mt-4 max-w-md text-[14.5px] leading-relaxed text-[#C7D3EC]">
              Minerval, frais académiques, inscription… Réglez les frais de votre enfant ou les vôtres
              depuis n&apos;importe quel opérateur, et recevez un <strong className="font-semibold text-white">reçu numérique
              instantané</strong> reconnu par l&apos;établissement.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Aucun frais à votre charge — vous payez le montant exact.",
                "Réconciliation par matricule : le bon élève, le bon solde.",
                "L'établissement est notifié et encaisse en temps réel.",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3 text-[13.5px] text-[#DCEAFB]">
                  <CheckCircle2 className="mt-0.5 size-[18px] shrink-0 text-green" strokeWidth={2.4} /> {t}
                </li>
              ))}
            </ul>
            <Link href="/connexion" className="bg-grad-tuition mt-8 inline-flex items-center gap-2 rounded-pill px-6 py-3.5 font-display text-[14.5px] font-extrabold text-white shadow-hero transition-transform active:scale-[0.98]">
              Payer une scolarité <ArrowRight className="size-[17px]" strokeWidth={2.6} />
            </Link>
          </Reveal>

          <Reveal delay={120} className="relative z-10">
            <TuitionScene className="mx-auto w-full max-w-[440px]" />
          </Reveal>
        </div>
      </section>

      {/* ── COMMENT ÇA MARCHE ───────────────────────────────── */}
      <section className="bg-navy px-5 py-20 md:px-8">
        <div className="mx-auto max-w-[1000px]">
          <Reveal className="text-center">
            <h2 className="font-display text-[28px] font-extrabold tracking-tight sm:text-[36px]">
              Trois étapes, <span className="text-grad-gold">deux minutes</span>
            </h2>
          </Reveal>
          <div className="relative mt-14 grid gap-8 md:grid-cols-3">
            <div className="pointer-events-none absolute left-[16%] right-[16%] top-[52px] hidden h-px bg-gradient-to-r from-transparent via-gold-500/40 to-transparent md:block" />
            {STEPS.map((s, i) => {
              const Art = s.Art;
              return (
                <Reveal key={s.n} delay={i * 120} className="relative flex flex-col items-center text-center">
                  <div className="relative mb-5">
                    <Art className="size-24 animate-float-sm" />
                    <span className="absolute -right-1 -top-1 flex size-8 items-center justify-center rounded-full bg-grad-gold font-display text-[15px] font-extrabold text-gold-ink ring-4 ring-navy">{s.n}</span>
                  </div>
                  <h3 className="font-display text-[17px] font-bold">{s.title}</h3>
                  <p className="mt-2 max-w-[260px] text-[13px] leading-relaxed text-[#AEBBD6]">{s.text}</p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── TÉMOIGNAGES (social proof) ──────────────────────── */}
      <section className="bg-navy-2 px-5 py-20 md:px-8">
        <div className="mx-auto max-w-[1080px]">
          <Reveal className="flex flex-col items-center text-center">
            <Stars className="h-5 w-[120px]" />
            <h2 className="mt-4 font-display text-[28px] font-extrabold tracking-tight sm:text-[36px]">
              Ils paient déjà <span className="text-grad-gold">plus simplement</span>
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => {
              const Art = t.Art;
              return (
                <Reveal key={t.name} delay={i * 100} className="glass relative rounded-3xl p-6">
                  <Quote className="absolute right-5 top-5 size-7 text-white/10" strokeWidth={2.4} />
                  <Stars className="h-3.5 w-[86px]" />
                  <p className="mt-3 text-[13.5px] leading-relaxed text-[#DCEAFB]">« {t.quote} »</p>
                  <div className="mt-5 flex items-center gap-3">
                    <Art className="size-10 rounded-full" />
                    <div>
                      <p className="font-display text-[13px] font-bold">{t.name}</p>
                      <p className="text-[11.5px] text-[#AEBBD6]">{t.role}</p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── TARIFS TRANSPARENTS ─────────────────────────────── */}
      <section id="tarifs" className="bg-navy px-5 py-20 md:px-8">
        <div className="mx-auto max-w-[1000px]">
          <Reveal className="text-center">
            <span className="inline-flex items-center gap-2 rounded-pill bg-success-bg/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-green ring-1 ring-green/30">
              <Wallet className="size-3.5" strokeWidth={2.6} /> Tarifs clairs, sans surprise
            </span>
            <h2 className="mt-4 font-display text-[28px] font-extrabold tracking-tight sm:text-[36px]">
              Ce que vous voyez, <span className="text-grad-gold">c&apos;est ce que vous payez</span>
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            <Reveal className="glass-strong rounded-4xl p-8">
              <p className="text-[12px] font-bold uppercase tracking-wide text-gold-400">Payeur (parent · étudiant)</p>
              <div className="mt-3 flex items-end gap-2">
                <span className="font-display text-[52px] font-extrabold leading-none">0</span>
                <span className="mb-2 text-[15px] font-bold text-white/70">frais / Tuition</span>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-[#AEBBD6]">
                Vous payez le montant exact des frais de scolarité. Pas de commission cachée, pas de majoration.
              </p>
              <ul className="mt-5 space-y-2.5">
                {["Montant recalculé côté serveur", "Reçu numérique inclus", "Tous les opérateurs, même prix"].map((t) => (
                  <li key={t} className="flex items-center gap-2.5 text-[13px] text-[#DCEAFB]"><CheckCircle2 className="size-[17px] shrink-0 text-green" strokeWidth={2.4} /> {t}</li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={100} className="glass rounded-4xl p-8">
              <p className="text-[12px] font-bold uppercase tracking-wide text-[#6ED0FF]">Établissement partenaire</p>
              <div className="mt-3 flex items-end gap-2">
                <span className="font-display text-[52px] font-extrabold leading-none">1 %</span>
                <span className="mb-2 text-[15px] font-bold text-white/70">de commission claire*</span>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-[#AEBBD6]">
                Une commission unique et transparente sur les encaissements, prélevée sur le reversement — jamais sur le parent.
              </p>
              <ul className="mt-5 space-y-2.5">
                {["Back-office & reversements inclus", "Aucun matériel à acheter", "Sans engagement"].map((t) => (
                  <li key={t} className="flex items-center gap-2.5 text-[13px] text-[#DCEAFB]"><CheckCircle2 className="size-[17px] shrink-0 text-green" strokeWidth={2.4} /> {t}</li>
                ))}
              </ul>
              <p className="mt-4 text-[10.5px] text-white/40">* Taux indicatif, ajusté selon le volume lors du partenariat.</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── ÉTABLISSEMENTS (B2B) ────────────────────────────── */}
      <section id="etablissements" className="relative overflow-hidden bg-navy-2 px-5 py-20 md:px-8">
        <div className="mx-auto grid max-w-[1100px] items-center gap-10 md:grid-cols-2">
          <Reveal className="order-2 md:order-1">
            <PartnerScene className="mx-auto w-full max-w-[440px]" />
          </Reveal>
          <Reveal delay={100} className="order-1 md:order-2">
            <span className="inline-flex items-center gap-2 rounded-pill bg-white/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-gold-400 ring-1 ring-white/15">
              <Building2 className="size-3.5" strokeWidth={2.6} /> Écoles & universités
            </span>
            <h2 className="mt-5 font-display text-[28px] font-extrabold leading-tight tracking-tight sm:text-[38px]">
              Digitalisez vos encaissements. <span className="text-grad-gold">Sans matériel.</span>
            </h2>
            <p className="mt-4 max-w-md text-[14.5px] leading-relaxed text-[#C7D3EC]">
              abc pay équipe votre établissement d&apos;un back-office complet pour encaisser, suivre et
              réconcilier la scolarité — pendant que les parents paient depuis leur téléphone.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {PARTNER_POINTS.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-[13px] text-[#DCEAFB]">
                  <TrendingUp className="mt-0.5 size-[17px] shrink-0 text-gold-400" strokeWidth={2.4} /> {p}
                </li>
              ))}
            </ul>
            <div className="mt-7 inline-flex items-center gap-2 rounded-pill bg-success-bg/10 px-3.5 py-2 text-[12px] font-bold text-green ring-1 ring-green/25">
              <Clock className="size-4" strokeWidth={2.4} /> Partenaire opérationnel en 72 h
            </div>
            <div className="mt-6">
              <a href={PARTNER_MAILTO} className="bg-grad-gold inline-flex items-center gap-2 rounded-pill px-6 py-3.5 font-display text-[14.5px] font-extrabold text-gold-ink shadow-hero transition-transform active:scale-[0.98]">
                <Handshake className="size-[18px]" strokeWidth={2.4} /> Devenir partenaire
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── SÉCURITÉ ────────────────────────────────────────── */}
      <section id="securite" className="bg-navy px-5 py-20 md:px-8">
        <div className="mx-auto max-w-[1000px]">
          <Reveal className="text-center">
            <span className="inline-flex items-center gap-2 rounded-pill bg-success-bg/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-green ring-1 ring-green/30">
              <ShieldCheck className="size-3.5" strokeWidth={2.6} /> Conçu comme une fintech
            </span>
            <h2 className="mt-4 font-display text-[28px] font-extrabold tracking-tight sm:text-[36px]">La confiance, par défaut</h2>
          </Reveal>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {TRUST.map((t, i) => {
              const Icon = t.icon;
              return (
                <Reveal key={t.title} delay={i * 90} className="glass rounded-3xl p-6">
                  <span className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-success-bg text-green"><Icon className="size-[21px]" strokeWidth={2.2} /></span>
                  <h3 className="font-display text-[15.5px] font-bold">{t.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-[#AEBBD6]">{t.text}</p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ───────────────────────────────────────── */}
      <section className="bg-navy-2 px-5 pb-20 md:px-8">
        <Reveal className="mx-auto max-w-[1000px]">
          <div className="relative overflow-hidden rounded-[26px] bg-[linear-gradient(135deg,#0F3E8A,#1857B8)] px-6 py-14 text-center shadow-hero">
            <div className="bg-grid pointer-events-none absolute inset-0 opacity-40" />
            <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-gold-500/20 animate-glow" />
            <div className="pointer-events-none absolute -bottom-16 -left-16 size-56 rounded-full bg-white/10 animate-glow" />
            <h2 className="relative font-display text-[26px] font-extrabold sm:text-[34px]">Prêt à payer plus simplement ?</h2>
            <p className="relative mx-auto mt-3 max-w-md text-[14px] text-[#C7D3EC]">Rejoignez abc pay avec votre numéro et effectuez votre premier paiement en moins de deux minutes.</p>
            <div className="relative mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href="/connexion" className="bg-grad-gold flex items-center justify-center gap-2 rounded-pill px-7 py-4 font-display text-[15px] font-extrabold text-gold-ink transition-transform active:scale-[0.98]">Commencer <ArrowRight className="size-[18px]" strokeWidth={2.6} /></Link>
              <a href={PARTNER_MAILTO} className="flex items-center justify-center gap-2 rounded-pill border border-white/30 px-7 py-4 text-[14px] font-bold text-white transition-colors hover:bg-white/10"><Phone className="size-[17px]" strokeWidth={2.2} /> Parler à l&apos;équipe</a>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer className="border-t border-white/10 bg-navy px-5 py-12 md:px-8">
        <div className="mx-auto grid max-w-[1160px] gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element -- logo statique local */}
              <img src="/logo.png" alt="abc pay" width={30} height={30} className="size-[30px] rounded-[9px]" />
              <span className="font-display text-[15px] font-bold">abc pay</span>
            </div>
            <p className="mt-3 max-w-xs text-[12.5px] leading-relaxed text-white/55">The Connected Money — le paiement réinventé, pensé pour la RDC.</p>
          </div>
          <FooterCol title="Produit" links={[["Au quotidien", "#quotidien"], ["Tuition", "#tuition"], ["Tarifs", "#tarifs"], ["Se connecter", "/connexion"]]} />
          <FooterCol title="Établissements" links={[["Devenir partenaire", "#etablissements"], ["Back-office", "/etablissement-connexion"], ["Nous écrire", PARTNER_MAILTO]]} />
          <FooterCol title="Légal" links={[["Conditions", "/conditions"], ["Confidentialité", "/confidentialite"], ["FAQ", "/faq"]]} />
        </div>
        <div className="mx-auto mt-10 max-w-[1160px] border-t border-white/10 pt-6 text-center text-[11.5px] text-white/40">abc pay © 2026 — The Connected Money · Kinshasa, RDC</div>
      </footer>
    </main>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h3 className="font-display text-[13px] font-bold text-white/80">{title}</h3>
      <ul className="mt-3 space-y-2.5">
        {links.map(([label, href]) => (
          <li key={label}>
            {href.startsWith("/") ? (
              <Link href={href} className="text-[12.5px] text-white/55 transition-colors hover:text-white">{label}</Link>
            ) : (
              <a href={href} className="text-[12.5px] text-white/55 transition-colors hover:text-white">{label}</a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
