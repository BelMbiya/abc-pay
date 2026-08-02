import { InfoHeader, LegalArticle } from "@/components/payer/InfoHeader";

export default function ConditionsPage() {
  return (
    <div className="mx-auto w-full max-w-[640px] flex-1 px-5 py-6 md:py-8">
      <InfoHeader title="Conditions d'utilisation" />
      <p className="mb-4 text-[11px] text-gray-500">Dernière mise à jour : 30 juillet 2026</p>

      <LegalArticle heading="1. Objet">
        Les présentes conditions régissent l&apos;utilisation de la plateforme abc pay, service de
        facilitation de paiements en République Démocratique du Congo.
      </LegalArticle>
      <LegalArticle heading="2. Compte & éligibilité">
        Tu dois avoir au moins 18 ans et fournir des informations exactes. Tu es responsable de la
        confidentialité de tes identifiants et des opérations effectuées depuis ton compte.
      </LegalArticle>
      <LegalArticle heading="3. Utilisation du service">
        abc pay facilite l&apos;initiation de paiements entre toi et un bénéficiaire, un marchand ou un
        établissement. abc pay ne conserve pas tes fonds et n&apos;est pas partie au contrat sous-jacent.
      </LegalArticle>
      <LegalArticle heading="4. Paiements & frais">
        Le montant et les frais de service applicables sont affichés avant chaque confirmation. En
        confirmant, tu autorises l&apos;opérateur mobile money ou la banque à exécuter le paiement.
      </LegalArticle>
      <LegalArticle heading="5. Reçus & preuves">
        Chaque paiement confirmé génère un reçu numérique numéroté et vérifiable, conservé dans ton
        espace et opposable en cas de litige.
      </LegalArticle>
      <LegalArticle heading="6. Responsabilités">
        abc pay met en œuvre les moyens raisonnables pour assurer la disponibilité et la sécurité du
        service, sans pouvoir garantir une absence totale d&apos;interruption liée aux opérateurs tiers.
      </LegalArticle>
      <LegalArticle heading="7. Litiges & remboursements">
        Les demandes de remboursement (double paiement, erreur de montant ou de bénéficiaire) sont
        traitées de façon encadrée, avec validation et traçabilité complète.
      </LegalArticle>
      <LegalArticle heading="8. Modification des conditions">
        Ces conditions peuvent évoluer. Toute mise à jour est publiée ici et prend effet à sa publication.
      </LegalArticle>

      <div className="mt-4 rounded-2xl bg-gray-100 p-4 text-[12.5px] leading-relaxed text-gray-700">
        Une question sur ces conditions ? Écris-nous à <b className="text-ink">hello@abcpay.cd</b>.
      </div>
    </div>
  );
}
