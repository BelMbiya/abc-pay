# 17 · Procédure AML — Lutte contre le blanchiment et le financement du terrorisme (LBC/FT)

*abc pay — Dernière mise à jour : 6 août 2026*

abc pay met en œuvre un dispositif de **surveillance des transactions** visant à détecter les
comportements associés à la fraude, au blanchiment de capitaux et au financement du terrorisme, et à
permettre une réaction humaine encadrée.

## 1. Principes

- **Surveillance à la source** : chaque transaction est évaluée par un **moteur de règles** au moment
  de sa création.
- **Approche par les risques** : des seuils et des scénarios ciblent les schémas typiques de
  blanchiment (fractionnement, collecte, dispersion, montants atypiques…).
- **Traçabilité** : toute alerte est **persistée** (règle, sévérité, score, motif, statut) pour revue
  et audit.

## 2. Comment détectons-nous les comportements suspects ?

Le moteur de risque applique, à chaque opération, un ensemble de règles dont les principales :

**Montants**
- Transaction **importante** (≥ 500 USD) et **très importante** (≥ 2 000 USD).
- Montant significatif sur un **compte au KYC incomplet** (≥ 100 USD).
- **Incohérence de frais** de scolarité (montant très supérieur au barème de l'établissement).

**Vélocité & fractionnement (structuring)**
- **Rafale** : plusieurs opérations rapprochées (≥ 5 en 10 minutes).
- **Fractionnement** : plusieurs opérations sur 24 h dont le cumul dépasse un seuil, apparemment
  découpées pour rester sous les radars.

**Réseaux (collecte / dispersion)**
- **Fan-in** : plusieurs payeurs convergent vers un même numéro bénéficiaire sur une courte période.
- **Fan-out** : un même compte disperse vers de nombreux bénéficiaires.
- Variantes appliquées aux **matricules** élèves (collecte/dispersion anormale).

**Signaux de compte**
- **Doublon d'identité** : même numéro de pièce sur plusieurs comptes.
- **Compte récent** effectuant d'emblée une opération élevée ; **compte dormant** se réactivant.
- **Heures atypiques** (00 h–05 h, heure de Kinshasa).

Plusieurs signaux simultanés **augmentent le score de risque** et peuvent élever la sévérité
(moyenne → élevée). Les seuils sont des paramètres de départ, à **calibrer avec les données réelles**
du pilote.

## 3. Plafonds de transaction

- **Transferts de personne à personne / services** : plafond par opération (référence : **10 000 USD**,
  paramétrable), au-delà duquel l'opération est refusée.
- **Paiements de scolarité** : plafonnés au **montant du frais sélectionné** de l'établissement (on peut
  payer ce montant ou moins, jamais plus).

## 4. Réaction : blocage et escalade

- **Blocage de compte** : un compte peut être bloqué. Un compte bloqué ne peut plus initier d'opération
  (contrôle appliqué à l'authentification et à l'initiation de paiement). Le blocage peut être :
  - **manuel** par un administrateur (revue d'alerte ou décision de gestion) ;
  - **auto-déclenché par l'utilisateur** (fonction « bloquer mon compte » en cas de compromission, qui
    gèle le compte et révoque les sessions).
- **Revue des alertes** : les administrateurs disposent d'un écran de revue des signalements (traiter,
  écarter, bloquer).
- **Signalement aux autorités** : lorsque la loi l'exige, une **déclaration de soupçon** est adressée à
  la cellule de renseignement financier compétente (**CENAREF** en RDC). *Voir l'état ci-dessous.*

## 5. Conservation & audit

Les alertes, décisions et blocages sont horodatés et conservés pour permettre l'audit et répondre aux
demandes légitimes des autorités.

---

## État d'implémentation (transparence)

- **En place et opérationnel** : le **moteur de règles de détection tourne réellement à chaque
  transaction**, persiste des alertes (règle/sévérité/score/motif), et un écran d'administration permet
  la revue. Le **plafond de transfert** et le **plafond scolarité** sont appliqués. Le **blocage de
  compte** (manuel et auto-gel utilisateur) est effectif, avec révocation de sessions.
- **Renforcé (implémenté depuis)** :
  - **Blocage automatique du compte sur risque critique** (score élevé) : au-delà du seuil, le compte
    à l'origine de l'opération est **gelé immédiatement** et ne peut plus initier d'opération jusqu'à
    revue/déblocage par un administrateur.
  - **Plafond cumulé journalier** des transferts (en plus du plafond par opération) : au-delà du cumul
    du jour, l'opération est refusée.
- **Limites assumées, importantes** :
  - Le moteur évalue **après création** de la transaction : le blocage automatique protège les
    opérations **suivantes** du compte, il n'annule pas rétroactivement l'opération déjà passée.
  - **Aucun reporting réglementaire automatisé** : la déclaration de soupçon à la CENAREF reste un
    **processus manuel à formaliser** ; il n'existe pas encore d'export/transmission outillée.
  - Certaines règles avancées (changement d'appareil, voyage impossible, brute-force OTP, sessions
    concurrentes) sont **spécifiées mais non branchées**, faute de collecter encore la donnée.
- **Feuille de route (avant production)** : mise en attente/refus automatique sur score élevé,
  plafonds cumulés journaliers, procédure et outillage de déclaration de soupçon (CENAREF), et
  calibrage des seuils sur données réelles.

La référence technique détaillée des règles est maintenue dans `abc-pay-api/docs/FRAUD-RULES.md`.
