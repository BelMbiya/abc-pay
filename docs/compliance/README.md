# abc pay — Documentation de conformité

> Dossier destiné aux partenaires (agrégateurs, opérateurs mobile money, banques) et aux
> autorités. Il décrit **honnêtement** les politiques et procédures de conformité d'abc pay,
> en distinguant systématiquement ce qui est **en place** de ce qui est **en cours** ou **prévu**.

## Statut du produit (à lire en premier — cadre honnête)

abc pay est aujourd'hui en **phase pilote / pré-production**. Concrètement :

- Le parcours de paiement de scolarité (« Tuition ») est fonctionnel côté application, mais la
  **confirmation opérateur est encore simulée** : l'intégration réelle des webhooks signés des
  opérateurs mobile money / banques est en cours d'intégration.
- L'authentification des payeurs repose sur l'**OTP téléphone (Firebase)**.
- Un **moteur de détection de fraude/AML réel** tourne à chaque transaction (voir doc 17), mais il
  **signale pour revue humaine** — il ne bloque pas automatiquement.
- Certaines briques (remboursement automatisé, vérification documentaire d'identité, reporting
  réglementaire automatisé) sont **spécifiées mais pas encore implémentées** : elles figurent
  explicitement dans les feuilles de route ci-dessous.

Nous préférons documenter cet état réel plutôt que de survendre des capacités inexistantes. Les
politiques ci-dessous engagent l'entreprise ; les mentions « prévu / feuille de route » indiquent
ce qui sera livré et vérifié avant la mise en production commerciale à grande échelle.

## Documents

| # | Document | Objet |
|---|----------|-------|
| 15 | [Politique de remboursement](15-politique-remboursement.md) | Quand, comment, sous quel délai, qui décide |
| 16 | [Procédure KYC](16-procedure-kyc.md) | Vérification de l'identité des utilisateurs |
| 17 | [Procédure AML (LBC/FT)](17-procedure-aml.md) | Lutte contre le blanchiment et le financement du terrorisme |
| 18 | [Politique anti-corruption](18-politique-anti-corruption.md) | Corruption, pots-de-vin, conflits d'intérêts |
| 19 | [Accord de confidentialité (NDA)](19-accord-de-confidentialite-nda.md) | Modèle de NDA mutuel |

## Cadre réglementaire de référence (RDC)

- **BCC** — Banque Centrale du Congo (autorité monétaire et de supervision).
- **CENAREF** — Cellule Nationale des Renseignements Financiers (cellule de renseignement financier
  destinataire des déclarations de soupçon).
- Législation nationale relative à la lutte contre le blanchiment de capitaux et le financement du
  terrorisme (LBC/FT), et protection des données personnelles.

abc pay n'affirme **aucun agrément bancaire** à ce jour et se positionne comme **facilitateur
technique de paiement**. La qualification réglementaire exacte et les enregistrements requis auprès
des autorités compétentes font l'objet d'un accompagnement juridique dédié.

---

*Contact conformité : partenariats@abcpay.cd · Bureau : Gombe, Kinshasa — RDC*
*Dernière mise à jour : 6 août 2026. Ces documents sont fournis de bonne foi et doivent être revus
par un conseil juridique avant tout usage contractuel ou réglementaire.*
