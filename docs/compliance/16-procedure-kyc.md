# 16 · Procédure KYC (connaissance client)

*abc pay — Dernière mise à jour : 6 août 2026*

La procédure KYC vise à identifier les utilisateurs, à rattacher chaque opération à une identité et à
soutenir la lutte contre la fraude et le blanchiment (voir doc 17).

## 1. Données d'identité collectées

À l'inscription et dans le profil, abc pay collecte :

| Donnée | Statut | Vérification actuelle |
|--------|--------|-----------------------|
| **Nom** (et prénom) | Obligatoire | Déclaratif |
| **Numéro de téléphone** | Obligatoire | **Vérifié par OTP** (voir §2) |
| **Date de naissance** | Obligatoire (≥ 18 ans) | Déclaratif |
| **Genre** | Obligatoire | Déclaratif |
| **Adresse & ville** | Obligatoire | Déclaratif |
| **Type de pièce d'identité** (carte d'électeur, passeport, permis) | Obligatoire | Déclaratif |
| **Numéro de la pièce d'identité** | Obligatoire | Déclaratif (saisie) |
| **E-mail** | Optionnel | Non vérifié |

Un compte est considéré « **profil complet / vérifié** » lorsque l'ensemble de ces champs obligatoires
est renseigné. Cet état est visible côté utilisateur (badge) et côté administration.

## 2. Vérification du numéro de téléphone (OTP)

L'authentification des payeurs repose sur l'**OTP par SMS via Firebase** : l'utilisateur ne peut créer
et utiliser un compte qu'en prouvant le contrôle de son numéro (jeton signé par Google, vérifié côté
serveur — émetteur, audience et numéro contrôlés). Le numéro de téléphone est donc **réellement
vérifié** ; c'est le socle de l'identité du compte.

## 3. Contrôles associés au niveau de vérification

- Un **plafond de vigilance renforcée** s'applique : une opération d'un montant significatif effectuée
  par un compte au KYC incomplet est **signalée** au moteur de risque (seuil de référence : 100 USD).
- La **détection de doublons d'identité** signale l'usage d'un même numéro de pièce sur plusieurs
  comptes (indicateur de fraude, voir doc 17).
- Un compte peut être **bloqué** (manuellement ou en cas de comportement suspect) ; un compte bloqué
  ne peut plus initier d'opération.

## 4. Protection des données

Les données d'identité sont utilisées pour la fourniture du service, la prévention de la fraude et le
respect des obligations légales. Elles ne sont partagées qu'avec l'opérateur / la banque nécessaires à
l'exécution d'un paiement, ou l'autorité compétente lorsque la loi l'exige. L'utilisateur dispose de
droits d'accès, de rectification et de suppression (voir la politique de confidentialité).

---

## État d'implémentation (transparence)

- **En place** : collecte structurée des données d'identité ; **vérification réelle du téléphone par
  OTP** ; détection de doublons de numéro de pièce ; blocage de compte ; contrôle d'âge déclaratif.
- **Limite assumée** : le KYC est aujourd'hui **déclaratif** pour l'identité documentaire. Le
  **numéro de pièce est saisi**, **sans capture ni contrôle du document lui-même**.
- **Feuille de route (avant montée en charge)** :
  1. **Upload de la pièce d'identité** (recto/verso) + stockage chiffré.
  2. **Selfie / vérification de vivacité** et rapprochement visage ↔ pièce.
  3. **Lecture/contrôle du document** (OCR, cohérence des champs).
  4. **Vérification du nom du compte Mobile Money** (correspondance titulaire ↔ identité déclarée).
  5. **Workflow de revue** (statuts en attente / approuvé / rejeté) et niveaux KYC gradués selon les
     plafonds.

À ce jour, abc pay **ne réalise pas** de vérification biométrique ni de contrôle documentaire ; ces
étapes sont spécifiées et planifiées.
