# abc pay — Règles de détection de fraude (LBC/FT)

> Moteur : `app/Services/Fraud/FraudService.php`. Chaque transaction est évaluée à
> sa création (`flag()` appelé par `TuitionPaymentService` et `TransferService`).
> Le **signal le plus fort** est retenu et persisté en `FraudFlag` (statut `open`),
> visible en super-admin (`/admin/fraude`). Si **plusieurs signaux se cumulent**,
> le score est relevé (+8, plafonné à 99), la gravité peut passer à `high`, et les
> autres règles sont **tracées dans la raison** (risque composé — logique d'audit).
>
> Actions admin : **écarter** (faux positif) ou **bloquer le compte** (gèle toutes
> ses opérations dès le middleware — défense en profondeur).

## Barème de gravité / score

| Gravité | Score | Sens |
|---|---|---|
| `high` | 70–99 | À traiter en priorité (blocage probable) |
| `medium` | 45–69 | À revoir (contexte / vélocité) |
| `low` | 0–44 | Bas bruit, surveillance |

---

## 1. Identité & compte

### `blocked` — score 90 (high)
Opération tentée depuis un compte **déjà bloqué**. Défense en profondeur : le middleware refuse déjà, mais on trace toute tentative.
*Pourquoi :* un compte gelé qui « pousse » encore = tentative d'abus / compte compromis.

### `duplicate_id` — score 82 (high)
La **même pièce d'identité** (`id_doc_number`) est rattachée à **plusieurs comptes**.
*Pourquoi :* **identité synthétique / usurpation** — un fraudeur multiplie les comptes avec un même document pour contourner les plafonds et le KYC.

### `new_account_high` — score 50 (medium)
Compte **créé il y a < 24 h** qui effectue une opération **≥ 300 $**.
*Pourquoi :* profil de **mule fraîche** — les comptes jetables encaissent vite puis disparaissent.

### `no_kyc` — score 50 (medium)
Compte **non vérifié (KYC incomplet)** au-dessus de **100 $**.
*Pourquoi :* obligation réglementaire (BCC/LBC) — au-delà d'un seuil, l'identité doit être connue.

## 2. Montant & blanchiment

### `large_amount` — 55 (medium) / 75 (high)
Montant **≥ 500 $** (élevé) ou **≥ 2 000 $** (très élevé), converti en USD.
*Pourquoi :* les gros flux méritent une revue ; seuil calibré RDC.

### `structuring` — score 68 (medium)
**Fractionnement (smurfing)** : ≥ 3 paiements **chacun sous le seuil** qui, **cumulés sur 24 h**, dépassent 500 $.
*Pourquoi :* technique classique de blanchiment pour **rester sous le radar** des seuils — d'où la détection sur l'agrégat, pas sur la transaction seule.

### `fee_mismatch` — score 52 (medium) *(Tuition)*
Montant **≥ 4× le barème le plus élevé** de l'établissement.
*Pourquoi :* payer 5 000 $ là où les frais sont ~250 $ = **blanchiment via une école** (canal a priori légitime).

## 3. Comportement du compte

### `velocity` — score 60 (medium)
**≥ 5 opérations en 10 min** pour un même compte.
*Pourquoi :* rythme non-humain = automatisation / test de fraude.

### `repeated_failures` — score 58 (medium)
**≥ 3 échecs en 60 min**.
*Pourquoi :* **card/wallet testing** — le fraudeur essaie des identifiants volés jusqu'à en trouver un valide.

### `channel_switching` — score 52 (medium)
**≥ 3 canaux différents** (M-Pesa, Airtel, Orange…) en 30 min.
*Pourquoi :* essai de **plusieurs wallets compromis** à la suite.

### `dormant` — score 48 (medium)
Compte **inactif > 60 j** qui se **réactive** brusquement.
*Pourquoi :* signal fort de **prise de contrôle de compte** (ATO) — le vrai titulaire n'était plus là.

### `refund_abuse` — score 50 (medium)
**≥ 3 annulations/remboursements en 30 j**.
*Pourquoi :* **abus de remboursement** / friendly fraud.

### `cross_currency` — score 40 (low)
Allers-retours **USD/CDF rapprochés** (< 30 min).
*Pourquoi :* possible **arbitrage de change** aux dépens du taux plateforme.

### `off_hours` — score 35 (low)
Opération **00 h–05 h (Kinshasa)** sur un montant ≥ 100 $.
*Pourquoi :* signal faible mais utile en corrélation (ATO nocturne).

## 4. Réseau / mule (envoi P2P)

### `fan_in` — score 70 (high)
**≥ 5 payeurs distincts** envoient vers **le même numéro** en 60 min.
*Pourquoi :* **compte collecteur (mule)** — point de convergence d'argent d'origines multiples.

### `fan_out` — score 64 (medium)
Un payeur envoie à **≥ 4 bénéficiaires distincts** en 30 min.
*Pourquoi :* **dispersion (layering)** — éclatement des fonds pour brouiller la piste.

### `new_beneficiary` — score 56 (medium)
**Gros transfert (≥ 500 $)** vers un bénéficiaire **jamais utilisé**.
*Pourquoi :* **fraude au virement (APP fraud) / ingénierie sociale** — la victime paie un « nouveau » destinataire sous pression.

## 5. Tuition (fraude scolaire)

### `matricule_fanout` — score 62 (medium)
Un compte paie **≥ 4 matricules différents** en 30 min.
*Pourquoi :* **données volées testées en masse** (listes de matricules).

### `matricule_fanin` — score 54 (medium)
**≥ 3 payeurs distincts** sur **le même matricule** en 60 min.
*Pourquoi :* **matricule volé/partagé** exploité par plusieurs fraudeurs.

## 6. Bas bruit

### `failed` — score 25 (low)
Transaction en échec isolée — surveillée si répétée (voir `repeated_failures`).

---

## Phase 2 — règles nécessitant un nouveau signal à capturer

Non branchées à ce jour, faute de collecter la donnée. Elles s'ajouteront avec le
**middleware d'audit** (capture IP/appareil/tentatives), partagé avec le suivi des
exceptions.

| Règle | Donnée requise | Détecte |
|---|---|---|
| `impossible_travel` | IP + géoloc par transaction/connexion | Même compte depuis 2 lieux distants en peu de temps (compte partagé/volé) |
| `device_change` | Empreinte d'appareil (device id) | Opération depuis un appareil inconnu juste après un changement de profil (ATO) |
| `otp_bruteforce` | Journal des tentatives OTP | Multiples essais de code avant succès (attaque d'authentification) |
| `concurrent_sessions` | Suivi des sessions actives | Plusieurs sessions simultanées incohérentes |

---

## Réglage des seuils

Toutes les constantes (`LARGE_USD`, `VELOCITY_*`, `FANIN_*`, …) sont en tête de
`FraudService`. **À calibrer avec les données réelles du pilote** pour équilibrer
faux positifs / détection. En montée en charge, l'évaluation passera en **file
asynchrone (queue)** avec index dédiés (`user_id+created_at`, `counterparty_phone`,
`student_matricule`).
