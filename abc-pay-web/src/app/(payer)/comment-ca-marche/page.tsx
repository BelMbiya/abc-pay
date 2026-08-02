import { InfoHeader } from "@/components/payer/InfoHeader";

const STEPS = [
  { title: "Choisis une action", text: "Envoyer, Recevoir, Payer un service ou Tuitionner des frais scolaires." },
  { title: "Sélectionne et saisis le montant", text: "Le destinataire, le marchand ou l'établissement, puis le montant à régler." },
  { title: "Choisis ton moyen de paiement", text: "Airtel Money, Orange Money, M-Pesa, Africell Money ou carte bancaire." },
  { title: "Confirme sur ton téléphone", text: "Valide la demande avec ton code secret mobile money." },
  { title: "Reçois ton reçu numérique", text: "Un reçu instantané, téléchargeable et vérifiable, dès la confirmation." },
];

export default function CommentCaMarchePage() {
  return (
    <div className="mx-auto w-full max-w-[640px] flex-1 px-5 py-6 md:py-8">
      <InfoHeader title="Comment ça marche" subtitle="Un paiement en moins de deux minutes." />
      <ol className="flex flex-col gap-4">
        {STEPS.map((s, i) => (
          <li key={i} className="flex gap-3.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-[9px] bg-blue-100 font-display text-[12.5px] font-extrabold text-blue-700">
              {i + 1}
            </span>
            <div>
              <h3 className="text-[13.5px] font-bold text-ink">{s.title}</h3>
              <p className="mt-0.5 text-[12px] leading-relaxed text-gray-500">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
