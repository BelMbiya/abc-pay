import { InfoHeader, LegalArticle } from "@/components/payer/InfoHeader";

export default function RemboursementPage() {
  return (
    <div className="mx-auto w-full max-w-[640px] flex-1 px-5 py-6 md:py-8">
      <InfoHeader title="Politique de remboursement" />
      <p className="mb-4 text-[11px] text-gray-500">Dernière mise à jour : 6 août 2026</p>

      <LegalArticle heading="1. Quand un remboursement est-il possible ?">
        Un remboursement peut être accordé en cas de double paiement, d&apos;erreur de montant, d&apos;erreur de
        bénéficiaire, d&apos;échec technique avec débit, ou de service non rendu reconnu par le bénéficiaire.
        Un paiement correctement exécuté et reçu par le bon bénéficiaire n&apos;est pas remboursable : le
        litige relève alors de ta relation avec l&apos;établissement.
      </LegalArticle>
      <LegalArticle heading="2. Comment en faire la demande ?">
        Écris-nous à hello@abcpay.cd (ou via le support de l&apos;application) en indiquant le numéro de reçu
        et la référence de la transaction. Ton reçu numérique numéroté sert de preuve. Le remboursement
        est toujours effectué vers la source du paiement (ton compte mobile money ou bancaire d&apos;origine).
      </LegalArticle>
      <LegalArticle heading="3. Sous combien de temps ?">
        Accusé de réception sous 1 jour ouvré ; décision (accord ou refus motivé) sous 2 à 5 jours ouvrés
        après réception des pièces ; exécution jusqu&apos;à 7 jours ouvrés selon le canal de l&apos;opérateur ou
        de la banque. Ces délais cibles pourront évoluer avec nos partenaires opérateurs.
      </LegalArticle>
      <LegalArticle heading="4. Qui prend la décision ?">
        Le support instruit et propose la décision ; elle est validée selon le principe des quatre yeux
        (double validation par un responsable habilité) avant exécution. Chaque demande, décision et
        exécution est journalisée de façon traçable.
      </LegalArticle>
      <LegalArticle heading="5. Bon à savoir">
        abc pay est un facilitateur de paiement et ne conserve pas tes fonds. Pendant la phase pilote,
        les remboursements sont traités manuellement par notre équipe. Aucun remboursement n&apos;est effectué
        vers un compte autre que celui ayant servi au paiement d&apos;origine.
      </LegalArticle>

      <div className="mt-4 rounded-2xl bg-gray-100 p-4 text-[12.5px] leading-relaxed text-gray-700">
        Besoin d&apos;un remboursement ou une question ? Écris-nous à <b className="text-ink">hello@abcpay.cd</b>
        {" "}avec ton numéro de reçu.
      </div>
    </div>
  );
}
