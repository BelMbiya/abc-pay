# 15 · Politique de remboursement

*abc pay — Dernière mise à jour : 6 août 2026*

abc pay est un **facilitateur de paiement** : il initie des paiements entre un payeur et un
bénéficiaire (établissement, marchand, particulier) et ne conserve pas les fonds. Cette politique
décrit comment sont traitées les demandes de remboursement.

## 1. Quand rembourse-t-on ?

Un remboursement peut être accordé dans les cas suivants :

- **Double paiement** — un même dû payé deux fois (même référence / même bénéficiaire).
- **Erreur de montant** — montant saisi manifestement erroné.
- **Erreur de bénéficiaire** — paiement dirigé vers le mauvais établissement/destinataire.
- **Échec technique avec débit** — le compte du payeur est débité alors que la transaction n'a pas
  abouti côté bénéficiaire.
- **Service non rendu** — lorsque le bénéficiaire reconnaît que la prestation payée n'a pas été
  fournie (dans ce cas, la décision associe le bénéficiaire).

**Ne sont pas remboursables** : un paiement correctement exécuté et reçu par le bon bénéficiaire pour
le bon montant (le litige commercial relève alors de la relation payeur ↔ établissement), ni les
demandes frauduleuses.

## 2. Comment demande-t-on un remboursement ?

1. Le payeur contacte le support : **hello@abcpay.cd** (ou le canal support de l'application), en
   indiquant le **numéro de reçu** et la **référence** de la transaction.
2. Chaque paiement confirmé génère un **reçu numérique numéroté et vérifiable** (page « Vérifier un
   reçu ») : c'est la preuve opposable qui sert d'appui à l'instruction.
3. Le support ouvre un dossier, rapproche la transaction et, si nécessaire, sollicite le bénéficiaire.
4. Après décision (voir §4), le remboursement est exécuté **vers la source du paiement** (le compte
   mobile money ou bancaire ayant servi au règlement), jamais vers un autre compte.

## 3. Sous combien de temps ?

- **Accusé de réception** de la demande : sous **1 jour ouvré**.
- **Décision** (accord ou refus motivé) : cible **2 à 5 jours ouvrés** après réception des pièces.
- **Exécution du remboursement** une fois la décision prise : dépend du canal de l'opérateur mobile
  money / de la banque ; cible **jusqu'à 7 jours ouvrés**.

Ces délais sont des engagements de service cibles pour la phase pilote ; ils seront affinés et
contractualisés avec les opérateurs partenaires.

## 4. Qui prend la décision ?

- Le **support** instruit le dossier et **propose** une décision.
- La décision de remboursement est **validée selon le principe des quatre yeux (double validation)** :
  un second acteur habilité (responsable finance / administrateur abc pay) valide avant exécution.
- Toute décision et toute exécution sont **journalisées de façon traçable** (piste d'audit).
- Lorsqu'un établissement est concerné (service non rendu), sa reconnaissance est requise avant tout
  remboursement à sa charge.

## 5. Traçabilité

Chaque demande, décision et exécution est horodatée et conservée. Le statut d'une transaction reflète
son cycle de vie (`confirmée`, `échouée`, `annulée`, `remboursée`).

---

## État d'implémentation (transparence)

- **En place (implémenté)** : module de remboursement complet côté plateforme — création d'une
  demande depuis une transaction confirmée, **double validation « 4 yeux » imposée par le système**
  (l'initiateur ne peut pas valider sa propre demande), et **exécution** qui bascule la transaction
  en statut `remboursée`. Écran d'administration dédié (« Remboursements ») pour approuver/rejeter.
  Reçus numériques numérotés et vérifiables ; piste de traçabilité (initiateur, validateur, date, motif).
- **Dépendance externe restante** : le **reversement effectif des fonds** au payeur s'appuiera sur la
  passerelle de l'opérateur mobile money / banque, dont l'intégration est en cours ; en phase pilote,
  ce mouvement de fonds est confirmé manuellement une fois la demande approuvée.

La décision et sa gouvernance sont donc **outillées et effectives** ; seule l'exécution du virement
côté opérateur dépend de l'intégration de paiement en cours.
