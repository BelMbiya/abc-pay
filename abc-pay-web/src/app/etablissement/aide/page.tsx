"use client";

import { useState } from "react";
import { ChevronDown, Mail, Phone, MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/backoffice/StatCard";

const FAQ = [
  // — Mise en route —
  { q: "Pourquoi mon établissement n'apparaît-il pas encore dans la liste des écoles à payer ?", a: "Deux conditions sont requises pour être encaissable : (1) votre identité (responsable) doit être vérifiée, et (2) vous devez avoir défini au moins une ligne de barème. Tant que l'un des deux manque, votre établissement reste masqué de la liste des écoles côté parents." },
  { q: "Comment configurer mes types de frais et mon barème ?", a: "Dans « Frais & barèmes » : créez vos types de frais (Minerval, inscription, TP…) puis ajoutez un barème (montant) par type, éventuellement par promotion. C'est ce barème qui pilote les paiements : sans lui, aucun encaissement n'est possible." },
  { q: "Comment faire vérifier mon établissement pour activer les encaissements ?", a: "Le responsable doit soumettre sa pièce d'identité depuis l'espace (mur de vérification à la connexion). Une fois l'identité approuvée par abc pay, votre établissement devient visible et peut recevoir des paiements." },

  // — Paiements & barème —
  { q: "Un parent peut-il payer un montant différent de mon barème ?", a: "Non. Le montant est plafonné, côté serveur, au frais choisi dans votre barème : un parent ne peut jamais payer au-delà. Il peut en revanche régler partiellement s'il le souhaite." },
  { q: "J'ai ajouté une ligne de barème mais elle n'apparaissait pas au paiement.", a: "C'est corrigé : les frais proposés au parent proviennent désormais directement de votre barème « Frais & barèmes ». Toute ligne que vous ajoutez (ou modifiez) apparaît au paiement, à la place des anciens libellés par défaut." },
  { q: "Le parent paie-t-il des frais en plus, et quelle commission prenez-vous ?", a: "Le parent paie exactement le montant — aucun frais à sa charge. La commission abc pay est prélevée de votre côté, sur le net qui vous est reversé. Votre taux figure dans « Paramètres » et le net dans « Reversements »." },
  { q: "Comment partager notre QR de paiement ?", a: "Dans « Paiements », téléchargez le QR de l'établissement. Scanné par un parent, il ouvre le paiement Tuition avec votre établissement déjà rempli." },
  { q: "Comment obtenir le reçu / justificatif d'un paiement ?", a: "Chaque paiement confirmé génère un reçu (numéro RC-…) consultable dans « Paiements ». Le parent reçoit le sien immédiatement ; vous pouvez le retrouver et le partager depuis la transaction." },

  // — Apprenants & réconciliation —
  { q: "Comment les paiements sont-ils rattachés à mes apprenants ?", a: "Chaque paiement est rattaché à l'apprenant via son matricule. Importez votre liste (page « Réconciliation », via le gabarit) pour que les soldes d'abc pay s'alignent automatiquement sur votre registre." },
  { q: "Comment relancer un parent en retard de paiement ?", a: "Ouvrez la fiche de l'apprenant (« Apprenants ») puis « Relancer » : une notification est envoyée au parent. Vous pouvez relancer autant que nécessaire." },
  { q: "Un parent affirme avoir payé mais je ne vois rien — que faire ?", a: "Vérifiez d'abord le matricule utilisé (une faute crée un apprenant « tracé » distinct) dans « Réconciliation ». Si le paiement reste introuvable, contactez le support en indiquant l'heure et, si le parent l'a, le numéro de reçu (RC-…)." },

  // — Reversements & rapports —
  { q: "Quand et comment suis-je payé ?", a: "Le net encaissé (après commission) s'accumule dans « Reversements » : vous y voyez le montant en attente, la période, et l'historique des reversements effectués par abc pay. La cadence est celle convenue avec abc pay." },
  { q: "Dans « Rapports », quelle différence entre « à recouvrer » et « encaissé » ?", a: "« À recouvrer / attendu » = ce qui est dû par vos apprenants d'après votre barème et vos effectifs. « Encaissé / confirmé » = ce qui a réellement été payé via abc pay. L'écart entre les deux, c'est ce qu'il vous reste à percevoir." },
  { q: "Dans quelle devise suis-je encaissé et reversé ?", a: "Dans la devise configurée pour votre établissement (USD ou CDF), visible dans « Paramètres ». Les montants affichés aux parents et vos reversements suivent cette devise." },

  // — Remboursements & compte —
  { q: "Comment fonctionne un remboursement, et qui l'exécute ?", a: "Vous pouvez initier ou valider une demande de remboursement, mais l'exécution est réalisée par abc pay (traçabilité et sécurité). Une fois exécuté, la transaction passe au statut « remboursée » et le parent est notifié." },
  { q: "Un paiement confirmé peut-il être annulé ?", a: "Pas directement : il passe par une demande de remboursement (voir ci-dessus). Cela garantit une piste d'audit propre et évite toute annulation silencieuse." },
  { q: "Comment sécuriser mon compte (mot de passe, accès) ?", a: "Changez votre mot de passe provisoire dès la première connexion, puis à tout moment dans « Paramètres ». Gardez vos identifiants de direction confidentiels : ils donnent accès aux encaissements et reversements." },
  { q: "Une erreur s'affiche avec une « référence » — à quoi sert-elle ?", a: "Si un incident technique survient, le message affiche une référence courte. Communiquez-la au support : elle nous permet de retrouver instantanément l'origine du problème sans exposer d'informations sensibles." },
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
