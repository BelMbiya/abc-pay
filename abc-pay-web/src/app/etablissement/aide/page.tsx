"use client";

import { useState } from "react";
import { ChevronDown, Mail, Phone, MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/backoffice/StatCard";

const FAQ = [
  { q: "Comment configurer mes types de frais et mon barème ?", a: "Rendez-vous dans « Frais & barèmes » : ajoutez vos types de frais (Minerval, inscription…) puis un barème par promotion. Les soldes des apprenants se calculent automatiquement." },
  { q: "Comment les paiements sont-ils réconciliés ?", a: "Chaque paiement est rattaché à l'apprenant via son matricule. Importez le gabarit Excel (page « Frais ») pour aligner vos soldes avec ceux d'abc pay." },
  { q: "Quand suis-je payé ?", a: "Le net encaissé (après commission abc pay) apparaît dans « Reversements ». Le reversement suit la fréquence convenue avec abc pay." },
  { q: "Comment relancer un apprenant en retard ?", a: "Dans « Impayés & relances », cliquez sur « Relancer » en face de l'apprenant : une relance est tracée (SMS/email à venir)." },
  { q: "Comment partager notre QR de paiement ?", a: "Dans « Paiements », téléchargez le QR de l'établissement. Une fois scanné, il ouvre le paiement Tuition avec votre établissement déjà rempli." },
];

function Item({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl bg-gray-100">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left">
        <span className="text-[13px] font-bold text-ink">{q}</span>
        <ChevronDown className={`size-4 shrink-0 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2.4} />
      </button>
      {open ? <p className="px-4 pb-4 text-[12.5px] leading-relaxed text-gray-700">{a}</p> : null}
    </div>
  );
}

export default function AidePage() {
  return (
    <div className="mx-auto w-full max-w-[720px] px-5 py-6 md:px-8 md:py-8">
      <PageHeader title="Aide" subtitle="Questions fréquentes et support abc pay" />

      <div className="mb-6 flex flex-col gap-2.5">
        {FAQ.map((f) => <Item key={f.q} {...f} />)}
      </div>

      <h2 className="mb-3 font-display text-[14px] font-bold text-ink">Contacter le support</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <a href="mailto:support@abcpay.cd" className="flex flex-col items-center gap-2 rounded-2xl bg-gray-100 p-4 text-center hover:bg-gray-300/30">
          <span className="flex size-10 items-center justify-center rounded-xl bg-white text-blue-600"><Mail className="size-5" strokeWidth={2} /></span>
          <span className="text-[12.5px] font-bold text-ink">Email</span>
          <span className="text-[11px] text-gray-500">support@abcpay.cd</span>
        </a>
        <a href="tel:+243800000000" className="flex flex-col items-center gap-2 rounded-2xl bg-gray-100 p-4 text-center hover:bg-gray-300/30">
          <span className="flex size-10 items-center justify-center rounded-xl bg-white text-blue-600"><Phone className="size-5" strokeWidth={2} /></span>
          <span className="text-[12.5px] font-bold text-ink">Téléphone</span>
          <span className="text-[11px] text-gray-500">+243 800 000 000</span>
        </a>
        <a href="https://wa.me/243800000000" target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 rounded-2xl bg-gray-100 p-4 text-center hover:bg-gray-300/30">
          <span className="flex size-10 items-center justify-center rounded-xl bg-white text-green"><MessageCircle className="size-5" strokeWidth={2} /></span>
          <span className="text-[12.5px] font-bold text-ink">WhatsApp</span>
          <span className="text-[11px] text-gray-500">Chat direct</span>
        </a>
      </div>
    </div>
  );
}
