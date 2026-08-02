import { Smartphone, FileCheck2, ShieldCheck, Activity, Coins, BellRing } from "lucide-react";
import { InfoHeader } from "@/components/payer/InfoHeader";

const REASONS = [
  { icon: Smartphone, title: "Tous les opérateurs", text: "Airtel Money, Orange Money, M-Pesa, Africell Money, carte et virement — un seul endroit." },
  { icon: FileCheck2, title: "Reçu numérique instantané", text: "Chaque paiement génère un reçu PDF numéroté, vérifiable par QR code." },
  { icon: ShieldCheck, title: "100 % sécurisé", text: "Paiements chiffrés. abc pay ne conserve pas tes fonds : ils vont directement au bénéficiaire." },
  { icon: Activity, title: "Suivi en temps réel", text: "Historique complet, soldes à jour et vue consolidée pour plusieurs enfants." },
  { icon: Coins, title: "Paiement échelonné", text: "Règle une partie du montant quand tu veux, de façon tracée, sans reçu perdu." },
  { icon: BellRing, title: "Rappels d'échéance", text: "Un rappel avant la date limite — fini les pénalités de retard découvertes trop tard." },
];

export default function PourquoiPage() {
  return (
    <div className="mx-auto w-full max-w-[640px] flex-1 px-5 py-6 md:py-8">
      <InfoHeader title="Pourquoi abc pay" subtitle="La façon la plus simple de payer en RDC." />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {REASONS.map((r) => {
          const Icon = r.icon;
          return (
            <div key={r.title} className="rounded-2xl bg-gray-100 p-4">
              <span className="mb-2.5 flex size-[34px] items-center justify-center rounded-xl bg-white text-blue-600">
                <Icon className="size-[17px]" strokeWidth={2} />
              </span>
              <h3 className="mb-1 text-[13px] font-bold text-ink">{r.title}</h3>
              <p className="text-[11.5px] leading-relaxed text-gray-500">{r.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
