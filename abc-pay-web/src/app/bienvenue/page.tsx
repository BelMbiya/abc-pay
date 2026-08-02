"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Smartphone, ShieldCheck, GraduationCap, ScanLine, Receipt, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const FEATURES = [
  { icon: Smartphone, title: "Tous les opérateurs", text: "M-Pesa, Airtel, Orange, Africell + carte et virement, au même endroit." },
  { icon: GraduationCap, title: "Frais scolaires", text: "Paie la tuition en quelques secondes, avec reçu numérique instantané." },
  { icon: ShieldCheck, title: "100 % sécurisé", text: "Paiements chiffrés. abc pay ne conserve jamais tes fonds." },
];

const ACTIONS = [
  { icon: ArrowUpRight, label: "Envoyer" },
  { icon: Receipt, label: "Payer" },
  { icon: GraduationCap, label: "Tuitionner" },
  { icon: ScanLine, label: "Scanner" },
];

export default function BienvenuePage() {
  const router = useRouter();
  const { ready, token } = useAuth();

  useEffect(() => {
    if (ready && token) router.replace("/");
  }, [ready, token, router]);

  return (
    <main className="min-h-dvh bg-navy text-white">
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative flex min-h-dvh flex-col overflow-hidden bg-[linear-gradient(165deg,#0F1B30_0%,#0F3E8A_60%,#1857B8_100%)] px-6 pb-10 pt-6">
        <div className="pointer-events-none absolute -right-24 top-10 size-[420px] rounded-full bg-[radial-gradient(circle,rgba(255,194,75,0.22),transparent_70%)]" />
        <div className="pointer-events-none absolute -left-32 bottom-0 size-[360px] rounded-full bg-[radial-gradient(circle,rgba(45,116,214,0.35),transparent_70%)]" />

        {/* top bar */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo statique */}
            <img src="/logo.png" alt="abc pay" width={34} height={34} className="size-[34px] rounded-[10px]" />
            <span className="font-display text-[16px] font-bold">abc pay</span>
          </div>
          <button type="button" onClick={() => router.push("/connexion")} className="text-[13px] font-bold text-white/80 hover:text-white">
            Se connecter
          </button>
        </div>

        {/* center */}
        <div className="relative z-10 mx-auto flex w-full max-w-[560px] flex-1 flex-col justify-center py-10 text-center">
          <span className="mx-auto mb-4 rounded-pill bg-white/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.09em] text-gold-400">
            The Connected Money
          </span>
          <h1 className="font-display text-[34px] font-extrabold leading-[1.1] tracking-tight sm:text-[42px]">
            Payez, envoyez, recevez.
            <br />
            <span className="text-gold-400">Simplement.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-[14px] leading-relaxed text-[#C7D3EC]">
            La plateforme de paiement pensée pour la RDC — frais scolaires, factures et transferts,
            avec tous les opérateurs mobile money.
          </p>

          <div className="mx-auto mt-8 flex w-full max-w-xs flex-col gap-3">
            <button
              type="button"
              onClick={() => router.push("/connexion")}
              className="bg-grad-gold flex items-center justify-center gap-2 rounded-pill px-5 py-4 font-display text-[15px] font-extrabold text-gold-ink transition-transform active:scale-[0.98]"
            >
              Se connecter <ArrowRight className="size-[18px]" strokeWidth={2.6} />
            </button>
            <a href="#decouvrir" className="rounded-pill border border-white/25 px-5 py-4 text-center text-[14px] font-bold text-white hover:bg-white/10">
              Découvrir abc pay
            </a>
          </div>
        </div>

        {/* actions strip */}
        <div className="relative z-10 mx-auto flex w-full max-w-[560px] flex-wrap justify-center gap-2">
          {ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <span key={a.label} className="inline-flex items-center gap-2 rounded-pill bg-white/10 px-3.5 py-2 text-[12px] font-bold text-white/90">
                <Icon className="size-[15px] text-gold-400" strokeWidth={2.2} /> {a.label}
              </span>
            );
          })}
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────── */}
      <section id="decouvrir" className="bg-navy-2 px-6 py-16">
        <div className="mx-auto max-w-[880px]">
          <h2 className="text-center font-display text-[24px] font-extrabold tracking-tight sm:text-[28px]">
            Une seule app pour tous tes paiements
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="rounded-3xl bg-white/[0.06] p-6">
                  <span className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-gold-400 text-gold-ink">
                    <Icon className="size-[22px]" strokeWidth={2.1} />
                  </span>
                  <h3 className="font-display text-[16px] font-bold">{f.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-[#AEBBD6]">{f.text}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-12 flex flex-col items-center rounded-4xl bg-[linear-gradient(135deg,#0F3E8A,#1857B8)] px-6 py-12 text-center">
            <h3 className="font-display text-[22px] font-extrabold">Prêt à commencer ?</h3>
            <p className="mt-2 max-w-sm text-[13.5px] text-[#C7D3EC]">Connecte-toi avec ton numéro et effectue ton premier paiement en moins de deux minutes.</p>
            <button
              type="button"
              onClick={() => router.push("/connexion")}
              className="bg-grad-gold mt-6 flex items-center justify-center gap-2 rounded-pill px-6 py-4 font-display text-[15px] font-extrabold text-gold-ink transition-transform active:scale-[0.98]"
            >
              Se connecter <ArrowRight className="size-[18px]" strokeWidth={2.6} />
            </button>
          </div>

          <p className="mt-10 text-center text-[11px] text-white/40">abc pay © 2026 — The Connected Money · RDC</p>
        </div>
      </section>
    </main>
  );
}
