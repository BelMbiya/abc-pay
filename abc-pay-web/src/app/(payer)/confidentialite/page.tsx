import { InfoHeader, LegalArticle } from "@/components/payer/InfoHeader";

export default function ConfidentialitePage() {
  return (
    <div className="mx-auto w-full max-w-[640px] flex-1 px-5 py-6 md:py-8">
      <InfoHeader title="Confidentialité" />
      <p className="mb-4 text-[11px] text-gray-500">Dernière mise à jour : 30 juillet 2026</p>

      <LegalArticle heading="Données que nous collectons">
        Les informations nécessaires au service : identité, numéro de téléphone, moyens de paiement
        reliés et historique des transactions. Nous ne collectons pas plus que nécessaire.
      </LegalArticle>
      <LegalArticle heading="Utilisation des données">
        Exécuter tes paiements, générer tes reçus, prévenir la fraude et respecter nos obligations
        légales et comptables. Jamais pour te profiler à des fins publicitaires.
      </LegalArticle>
      <LegalArticle heading="Partage des données">
        Tes données ne sont jamais vendues. Elles ne sont partagées qu&apos;avec l&apos;opérateur mobile
        money ou la banque nécessaire à l&apos;exécution d&apos;un paiement, ou si la loi l&apos;exige.
      </LegalArticle>
      <LegalArticle heading="Sécurité & conservation">
        Les données sensibles sont chiffrées et conservées uniquement le temps nécessaire au service
        ou à nos obligations. Toute opération financière est journalisée de façon immuable.
      </LegalArticle>
      <LegalArticle heading="Protection des mineurs">
        Les données d&apos;un élève mineur sont strictement réservées à ses parents ou tuteurs déclarés
        et à l&apos;établissement concerné. abc pay n&apos;est pas destiné aux moins de 18 ans.
      </LegalArticle>
      <LegalArticle heading="Tes droits">
        Tu peux à tout moment accéder à tes données, les corriger, en demander la suppression ou
        t&apos;opposer à leur usage, en nous contactant.
      </LegalArticle>
      <LegalArticle heading="Cookies">
        Nous utilisons des cookies strictement nécessaires au fonctionnement du service. Tu gères tes
        préférences depuis ton navigateur à tout moment.
      </LegalArticle>

      <div className="mt-4 rounded-2xl bg-gray-100 p-4 text-[12.5px] leading-relaxed text-gray-700">
        <b className="text-ink">Une question sur tes données ?</b><br />
        Écris-nous à hello@abcpay.cd · Urgence sécurité : emergency@abcpay.cd
      </div>
    </div>
  );
}
