import { InfoHeader } from "@/components/payer/InfoHeader";

const RATES = [
  { label: "Envoi d'argent", value: "1,5 %" },
  { label: "Paiement marchand", value: "2,5 %" },
  { label: "Tuition — primaire & secondaire", value: "2 %" },
  { label: "Tuition — enseignement supérieur", value: "3 %" },
];

export default function TarificationPage() {
  return (
    <div className="mx-auto w-full max-w-[640px] flex-1 px-5 py-6 md:py-8">
      <InfoHeader title="Tarification" subtitle="Des frais simples et transparents." />

      <div className="bg-grad-navy rounded-3xl p-5 text-white">
        <h2 className="text-[14.5px] font-bold">Frais de service</h2>
        <p className="text-[12px] leading-relaxed text-white/60">
          Le montant exact des frais est toujours affiché avant confirmation. Aucun frais caché.
        </p>
        <div className="mt-3.5">
          {RATES.map((r) => (
            <div key={r.label} className="flex justify-between border-t border-white/10 py-2.5 text-[12px]">
              <span className="text-white/80">{r.label}</span>
              <span className="font-bold text-gold-400">{r.value}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-4 text-[12px] leading-relaxed text-gray-500">
        Selon l&apos;accord avec chaque établissement, les frais peuvent être absorbés par
        l&apos;établissement (tu paies exactement le montant de la facture) ou ajoutés au montant
        au moment du paiement — dans tous les cas, affichés clairement avant que tu confirmes.
      </p>
    </div>
  );
}
