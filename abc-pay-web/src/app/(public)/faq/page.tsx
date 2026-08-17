"use client";

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { InfoHeader } from "@/components/payer/InfoHeader";
import { cn } from "@/lib/cn";
import { fetchPublicFaqs } from "@/lib/faq-api";

interface QA { q: string; a: string; }
const STATIC_GROUPS: { label: string; items: QA[] }[] = [
  {
    label: "Général",
    items: [
      { q: "Qu'est-ce qu'abc pay ?", a: "abc pay est une plateforme web qui te permet de payer, envoyer et recevoir de l'argent en RDC, et de régler les frais scolaires et académiques via tous les opérateurs mobile money." },
      { q: "Ai-je besoin d'installer une application ?", a: "Non. abc pay fonctionne depuis n'importe quel navigateur, sur téléphone comme sur ordinateur." },
      { q: "Quels opérateurs sont acceptés ?", a: "Airtel Money, Orange Money, M-Pesa (Vodacom) et Africell Money, ainsi que les cartes Visa/Mastercard et le virement bancaire." },
    ],
  },
  {
    label: "Paiements",
    items: [
      { q: "Comment payer les frais scolaires ?", a: "Choisis « Tuitionner », sélectionne l'établissement, renseigne l'élève ou l'étudiant, le montant, puis paie avec ton opérateur. Tu reçois un reçu immédiatement." },
      { q: "Puis-je payer en plusieurs fois ?", a: "Oui, si l'établissement l'autorise : tu peux régler une partie du montant, de façon tracée, et suivre ton solde restant." },
      { q: "Le paiement est-il instantané ?", a: "Oui. Dès que tu confirmes sur ton téléphone, le solde est mis à jour et le reçu généré, généralement en moins de 30 secondes." },
      { q: "Que se passe-t-il en cas d'échec ?", a: "Aucun double débit : la transaction est marquée comme expirée et tu peux réessayer ou changer de moyen de paiement." },
    ],
  },
  {
    label: "Sécurité & confidentialité",
    items: [
      { q: "Mes paiements sont-ils sécurisés ?", a: "Oui. Les données sensibles sont chiffrées et chaque opération financière est journalisée. Tu ne saisis jamais ton code secret mobile money sur abc pay : il reste chez ton opérateur." },
      { q: "abc pay conserve-t-il mon argent ?", a: "Non. abc pay n'est pas un portefeuille : les fonds vont directement au bénéficiaire ou à l'établissement." },
      { q: "Mes données sont-elles vendues ?", a: "Jamais. Tes données ne sont partagées qu'avec l'opérateur ou la banque nécessaire à l'exécution du paiement, ou si la loi l'exige." },
    ],
  },
];

/** Regroupe les entrées gérées par catégorie, en préservant l'ordre du serveur. */
function groupManaged(faqs: { category: string | null; question: string; answer: string }[]) {
  const groups: { label: string; items: QA[] }[] = [];
  for (const f of faqs) {
    const label = f.category?.trim() || "Questions fréquentes";
    let g = groups.find((x) => x.label === label);
    if (!g) { g = { label, items: [] }; groups.push(g); }
    g.items.push({ q: f.question, a: f.answer });
  }
  return groups;
}

export default function FaqPage() {
  const [groups, setGroups] = useState(STATIC_GROUPS);
  const [open, setOpen] = useState<string | null>(null);

  // FAQ gérée en admin : si des entrées sont publiées, elles remplacent la liste
  // statique (repli sur le contenu par défaut si l'API est vide/indisponible).
  useEffect(() => {
    let active = true;
    fetchPublicFaqs()
      .then((faqs) => {
        if (active && faqs.length > 0) setGroups(groupManaged(faqs));
      })
      .catch(() => { /* repli statique */ });
    return () => { active = false; };
  }, []);

  return (
    <div className="mx-auto w-full max-w-[640px] flex-1 px-5 py-6 md:py-8">
      <InfoHeader title="FAQ & Aide" subtitle="Les réponses aux questions les plus fréquentes." />
      {groups.map((g) => (
        <section key={g.label} className="mb-4">
          <h2 className="mb-1 text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-blue-600">{g.label}</h2>
          {g.items.map((it) => {
            const isOpen = open === it.q;
            return (
              <div key={it.q} className="border-b border-gray-100">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : it.q)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-2.5 py-4 text-left"
                >
                  <span className="text-[13.5px] font-bold text-ink">{it.q}</span>
                  <ChevronRight className={cn("ml-auto size-4 shrink-0 text-gray-500 transition-transform", isOpen && "rotate-90")} strokeWidth={2.2} />
                </button>
                <div className={cn("grid transition-all duration-200", isOpen ? "grid-rows-[1fr] pb-4" : "grid-rows-[0fr]")}>
                  <p className="overflow-hidden text-[12.5px] leading-relaxed text-gray-500">{it.a}</p>
                </div>
              </div>
            );
          })}
        </section>
      ))}
      <div className="mt-2 rounded-2xl bg-gray-100 p-4 text-[12.5px] leading-relaxed text-gray-700">
        <b className="text-ink">Une autre question ?</b><br />Écris-nous à hello@abcpay.cd
      </div>
    </div>
  );
}
