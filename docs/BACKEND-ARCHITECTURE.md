# abc pay — Architecture backend complète (Laravel)

Document de référence **exhaustif** du backend : principes, découpage en modules,
fonctions par module, modules de gestion, machines à états, jobs, événements,
sécurité et infrastructure. Objectif : **aucune zone d'ombre**.
Compléments : `docs/SECURITY.md`, `docs/api-contract.md`, `db/schema.sql`.

---

## 1. Principes directeurs
1. **Monolithe modulaire** (modular monolith) Laravel 13 — un seul déploiement, découpé en **modules métier** (bounded contexts) faiblement couplés. Migration possible vers micro-services plus tard sans réécriture.
2. **Multi-tenant** : chaque donnée métier porte `establishment_id`, isolé par *global scope* + policies. Le super-admin abc pay voit tout.
3. **Event-driven en interne** : les effets de bord (reçu, notification, mise à jour de solde, audit) sont déclenchés par des **événements de domaine**, jamais en ligne dans le contrôleur.
4. **Security-first** : validation en allowlist, RBAC, principe des 4 yeux, idempotence paiement, webhooks signés, audit immuable (cf. `SECURITY.md`).
5. **Couche paiement abstraite** : les opérateurs sont derrière une interface `PaymentGateway` → on démarre avec un agrégateur, on ajoute/retire un opérateur sans toucher au cœur.
6. **Tout est traçable** : chaque opération financière produit une entrée `audit_logs`.

## 2. Architecture en couches

```
┌────────────────────────────────────────────────────────────┐
│ HTTP        Controllers · FormRequests · Middleware · Routes │  /api/v1
├────────────────────────────────────────────────────────────┤
│ Application Services (Use Cases) · DTO · Events · Jobs       │  orchestration
├────────────────────────────────────────────────────────────┤
│ Domain      Models · State Machines · Policies · Règles      │  logique métier
├────────────────────────────────────────────────────────────┤
│ Infrastructure  Eloquent · Gateways · SMS/Email · PDF · Queue│  I/O & tiers
└────────────────────────────────────────────────────────────┘
       PostgreSQL   ·   Redis (cache/queue)   ·   Storage (reçus)
```

## 3. Arborescence des dossiers (modular monolith)

```
app/
├─ Modules/
│  ├─ Identity/        # auth, comptes, rôles, OTP, 2FA, sessions
│  ├─ Tenancy/         # établissements, onboarding KYB, configuration
│  ├─ Academic/        # années, périodes, classes/filières, apprenants
│  ├─ Billing/         # types de frais, barèmes, postes de frais, remises
│  ├─ Scheduling/      # échéanciers, tranches, imputation
│  ├─ Payment/         # initiation, gateways, webhooks, états, idempotence
│  │  └─ Gateways/     # PaymentGateway + Aggregator/Airtel/Orange/MPesa/Africell/Card
│  ├─ Document/        # reçus PDF, QR, factures, attestations
│  ├─ Reconciliation/  # réconciliation, reversements, relevés
│  ├─ Notification/    # SMS/email/push, templates, relances
│  ├─ Commission/      # barèmes de commission abc pay, revenus
│  ├─ Risk/            # anti-fraude, règles, alertes, plafonds
│  ├─ Support/         # tickets, litiges, remboursements
│  ├─ Reporting/       # tableaux de bord, exports, KPIs
│  ├─ Audit/           # journal immuable, conformité
│  └─ Admin/           # opérations super-admin transverses
├─ Http/Middleware/    # SecurityHeaders, ForceJsonResponse, tenant scope…
└─ Providers/          # rate limiters, bindings gateways, events
```
Chaque module contient : `Models/`, `Http/` (Controllers, Requests, Resources),
`Services/` (use cases), `Events/`, `Listeners/`, `Jobs/`, `Policies/`, `routes.php`.

---

## 4. Les 16 modules — responsabilité & fonctions

### 4.1 Identity & Access (`Identity`)
Gère l'authentification et les autorisations.
- **Fonctions** : inscription payeur (OTP SMS), connexion établissement/admin (email+mot de passe+2FA), rafraîchissement/révocation de token (Sanctum), récupération de compte, gestion multi-profils (un parent ↔ plusieurs apprenants), gestion des rôles & permissions (RBAC), impersonation admin tracée.
- **Entités** : `users`, `establishment_staff`, `personal_access_tokens`, `roles`, `permissions`, `otp_codes`.
- **Événements** : `UserRegistered`, `LoginSucceeded/Failed`, `PasswordReset`.

### 4.2 Tenancy & Onboarding (`Tenancy`)
Cycle de vie des établissements.
- **Fonctions** : candidature partenaire, validation **KYC/KYB** (RCCM, agrément EPST/ESU), création/activation/suspension du tenant, configuration financière (compte de reversement, fréquence, devise, signataires), sous-domaine dédié, paramétrage du type d'établissement (école ↔ université).
- **Entités** : `establishments`, `establishment_settings`, `kyb_documents`.
- **États** : `pending → verified → active → suspended`.
- **Événements** : `EstablishmentOnboarded`, `EstablishmentSuspended`.

### 4.3 Academic (`Academic`)
Structure académique et apprenants.
- **Fonctions** : gestion des années académiques et périodes (trimestres/semestres), classes (école) et filières/promotions/facultés (supérieur), fiche apprenant, **import Excel/CSV** avec détection de doublons, génération d'un **identifiant abc pay stable**, rattachement parents/tuteurs, passage de niveau, transferts inter-établissements, archivage des diplômés.
- **Entités** : `academic_years`, `academic_terms`, `academic_groups`, `learners`, `learner_guardians`.
- **Événements** : `LearnerImported`, `LearnerPromoted`, `LearnerTransferred`.

### 4.4 Billing (`Billing`)
Structuration des frais.
- **Fonctions** : catalogue des types de frais (inscription, minerval, par crédit, annexes, examen, pénalité), barème par groupe/année, tarifs différenciés (fratrie, bourse), génération du **plan de facturation individuel**, remises/exonérations avec validation habilitée, double devise CDF/USD + taux de référence.
- **Entités** : `fee_types`, `fee_schedules`, `fee_items`, `discounts`.
- **Événements** : `BillingGenerated`, `DiscountApplied`.

### 4.5 Scheduling (`Scheduling`)
Échéanciers & paiements partiels.
- **Fonctions** : modèles d'échéancier (une fois, échelonné, libre plafonné, mensuel auto), calcul des tranches, **règle d'imputation** configurable (ex. inscription avant minerval), détection de retard partiel, application de **pénalité** après délai de grâce.
- **Entités** : `installment_plans`, `installments`.
- **Événements** : `InstallmentDue`, `PenaltyApplied`.

### 4.6 Payment (`Payment`) — cœur critique
Initiation et confirmation des paiements.
- **Fonctions** : **devis** (frais recalculés serveur), initiation (mobile money/carte/virement) avec **Idempotency-Key**, réception **webhook signé**, polling de secours, **machine à états** stricte, imputation sur les postes, encaissement manuel (espèces, hors commission), paiement par un tiers (sponsor), gestion des échecs/timeouts sans double débit.
- **Entités** : `transactions`, `payment_allocations`, `linked_accounts`.
- **Gateways** : interface `PaymentGateway` (`initiate`, `verifyWebhook`, `queryStatus`, `refund`) + drivers agrégateur/opérateurs/carte.
- **Événements** : `PaymentInitiated`, `PaymentConfirmed`, `PaymentFailed`, `PaymentRefunded`.

### 4.7 Document (`Document`)
Reçus, factures, attestations.
- **Fonctions** : génération **reçu PDF numéroté** (séquence non falsifiable), **QR de vérification** (page publique de contrôle), état de compte apprenant, **attestation de non-dette**, export PDF annuel des reçus.
- **Entités** : `receipts`, `document_sequences`.
- **Déclencheur** : listener sur `PaymentConfirmed`.

### 4.8 Reconciliation & Settlement (`Reconciliation`)
Rapprochement et reversement.
- **Fonctions** : consolidation nocturne par opérateur, **rapprochement** confirmations abc pay ↔ relevés opérateur (traitement des écarts et désynchronisations), calcul du **net à reverser** (encaissé − commission), déclenchement du reversement (quotidien/hebdo/à la demande), génération du **relevé de reversement**.
- **Entités** : `settlements`, `settlement_transactions`.
- **Événements** : `ReconciliationCompleted`, `SettlementPaid`.

### 4.9 Notification (`Notification`)
Communication multi-canal.
- **Fonctions** : envoi **SMS/email/push**, templates par établissement, scénarios automatisés (confirmation, rappel J-7/J-2, relance J0/J+3/J+7, récap quotidien comptable), personnalisation du ton, gestion des échecs d'envoi.
- **Entités** : `notifications`, `notification_templates`.

### 4.10 Commission (`Commission`)
Modèle économique abc pay.
- **Fonctions** : barème de commission par défaut / par établissement, mode « absorbée » vs « répercutée au payeur », calcul des revenus, frais de service carte.
- **Entités** : `commission_rules`.

### 4.11 Risk & Fraud (`Risk`)
Prévention.
- **Fonctions** : règles de vélocité, alertes montants atypiques, tentatives d'échec répétées, multi-comptes/appareil, plafonds par niveau KYC, blocage/mise en revue.
- **Entités** : `fraud_alerts`, `risk_rules`.

### 4.12 Support & Disputes (`Support`)
Litiges et remboursements.
- **Fonctions** : file de tickets (échecs, contestations), processus de **remboursement encadré** (double validation comptable + admin — **4 yeux**), suivi de la demande à l'exécution.
- **Entités** : `tickets`, `refunds`.

### 4.13 Reporting & Analytics (`Reporting`)
Pilotage.
- **Fonctions** : tableau de bord établissement (attendu/encaissé/recouvrement/en attente), supervision globale super-admin (volume par opérateur/établissement/période), listes d'impayés, exports Excel/CSV, KPIs.

### 4.14 Audit & Compliance (`Audit`)
Traçabilité & conformité.
- **Fonctions** : **journal immuable** (append-only) de toute opération financière (acteur, avant/après, horodatage), rétention réglementaire, support conformité **BCC**.
- **Entités** : `audit_logs`.

### 4.15 Integrations (`Payment/Gateways` + `Integration`)
Connexions tierces.
- **Fonctions** : gestion des clés d'API (coffre), environnements sandbox/prod, **health-check** périodique des opérateurs, fournisseur SMS/OTP, partenaire carte agréé.
- **Entités** : `operator_integrations`.

### 4.16 Admin / Platform (`Admin`)
Opérations transverses super-admin.
- **Fonctions** : gestion des établissements, commissions, supervision financière, surveillance fraude, gestion des intégrations, gestion de l'équipe abc pay.

---

## 5. Modules de gestion (« gestion au complet »)
Vue orientée **administration** — ce que chaque rôle pilote au quotidien.

| Module de gestion | Périmètre | Rôles habilités |
|---|---|---|
| Gestion des établissements | Onboarding, activation, suspension, config commerciale | Super-admin |
| Gestion des utilisateurs & rôles | Comptes, RBAC, 2FA, invitations internes | Super-admin ; Direction (interne) |
| Gestion académique | Années, périodes, classes/filières, cycle de vie | Direction, Comptable |
| Gestion des apprenants | Import, fiches, rattachements, transferts, archivage | Comptable, Caissier |
| Gestion des frais & barèmes | Types, barèmes, remises, plan de facturation | Direction |
| Gestion des échéanciers | Tranches, imputation, pénalités | Direction, Comptable |
| Gestion des paiements | Journal, encaissements manuels, imputation | Comptable, Caissier |
| Gestion des impayés & relances | Suivi, relances auto/manuelles | Comptable |
| Gestion de la réconciliation | Rapprochement, écarts | Système, Admin |
| Gestion des reversements | Fréquence, relevés, exécution | Admin ; Direction (consultation) |
| Gestion des commissions | Barèmes, mode de facturation | Super-admin |
| Gestion des notifications | Templates, scénarios, canaux | Direction, Super-admin |
| Gestion des litiges & remboursements | Tickets, remboursements (4 yeux) | Comptable + Admin |
| Gestion de la fraude | Règles, alertes, plafonds | Super-admin |
| Gestion des intégrations | Clés, environnements, santé API | Super-admin |
| Gestion de l'audit & conformité | Journal, exports réglementaires | Super-admin |

**Matrice RBAC (extrait)** — capacité × rôle :

| Capacité | Direction | Comptable | Caissier | Consultation | Super-admin |
|---|:-:|:-:|:-:|:-:|:-:|
| Configurer barèmes | ✅ | — | — | — | ✅ |
| Valider remises | ✅ | — | — | — | ✅ |
| Gérer apprenants | ✅ | ✅ | ✅ | — | ✅ |
| Encaissement manuel | ✅ | ✅ | ✅ | — | — |
| Lancer relances | ✅ | ✅ | — | — | ✅ |
| Voir rapports | ✅ | ✅ | ✅ | ✅ | ✅ |
| Valider remboursement | ✅* | ✅* | — | — | ✅* |
| Config commission/tenant | — | — | — | — | ✅ |

`*` remboursement = **double validation** (comptable établissement **et** admin abc pay).

---

## 6. Machine à états — Transaction

```
initiee ──▶ en_attente ──▶ confirmee ──▶ (reversee)
   │             │              │
   │             ├──▶ expiree   └──▶ remboursee   (via Support, 4 yeux)
   │             └──▶ echouee
   └──▶ echouee (rejet immédiat)
```
Règles : transitions contrôlées (aucun saut) ; `confirmee` seulement après webhook signé **ou** query de statut positive ; job de réconciliation rattrape les `en_attente` orphelines (transaction débitée côté opérateur mais non confirmée).

Autres machines : **Établissement** (`pending→verified→active→suspended`),
**Reversement** (`pending→processing→paid|failed`), **Litige** (`ouvert→en_cours→résolu|rejeté`).

## 7. Jobs planifiés (scheduler)
| Job | Fréquence | Rôle |
|---|---|---|
| `ReconcilePayments` | nuit | Consolider + rapprocher, rattraper les désync |
| `RunSettlements` | selon contrat | Calculer le net et déclencher le reversement |
| `SendDueReminders` | quotidien | Rappels J-7 / J-2 |
| `SendOverdueReminders` | quotidien | Relances J0 / J+3 / J+7 |
| `ApplyLatePenalties` | quotidien | Pénalités après délai de grâce |
| `CheckOperatorHealth` | 5 min | Santé des API opérateurs |
| `DailyCollectionDigest` | quotidien | Récap encaissements au comptable |
| `PurgeExpiredOtp` | horaire | Nettoyage OTP |

File d'attente Redis + workers (Horizon) ; jobs **idempotents** et rejouables.

## 8. Événements → Listeners (extrait)
- `PaymentConfirmed` → `GenerateReceipt`, `UpdateLearnerBalance`, `NotifyPayerAndEstablishment`, `RecordAudit`.
- `PaymentFailed` → `NotifyPayer`, `RecordAudit`.
- `BillingGenerated` → `BuildInstallmentPlans`.
- `SettlementPaid` → `GenerateStatement`, `NotifyEstablishment`.
- Toute action financière → `RecordAudit` (systématique).

## 9. Couche paiement (abstraction)
```php
interface PaymentGateway {
    public function initiate(PaymentIntent $intent): GatewayResult;   // push USSD/prompt
    public function verifyWebhook(Request $request): WebhookEvent;     // signature HMAC + anti-rejeu
    public function queryStatus(string $operatorRef): PaymentStatus;   // polling de secours
    public function refund(Transaction $tx, Money $amount): GatewayResult;
}
```
Drivers : `AggregatorGateway` (Phase 1), puis `AirtelGateway`, `OrangeGateway`,
`MpesaGateway`, `AfricellGateway`, `CardGateway`. Sélection par `channel` via un
`GatewayManager`. **Idempotence** : `Idempotency-Key` → 1 seule transaction même en cas de retry.

## 10. Sécurité transverse
Voir `docs/SECURITY.md` (7 couches). Points backend clés : RBAC + policies multi-tenant,
FormRequests en allowlist, `$fillable` strict, webhooks signés + IP allowlist,
chiffrement PII au repos, audit immuable, 4 yeux sur annulation/remboursement/reversement,
rate limiters `api`/`auth`/`payment`/`webhook`.

## 11. Observabilité
Logs structurés (PII masquée), métriques (latence, taux d'erreur, taux d'échec MoMo,
délai de reversement), santé des intégrations, alertes automatiques sur incident et fraude.

## 12. Stack & infrastructure
- **Laravel 13** (PHP 8.4), API REST `/api/v1`, Sanctum.
- **PostgreSQL** (transactionnel), **Redis** (cache, sessions, files).
- **Queue + Horizon** (jobs), **Scheduler** (cron), **Storage** (reçus PDF chiffrés).
- Environnements **dev / recette / prod** séparés, secrets en coffre, CI/CD, sauvegardes chiffrées.

## 13. Phasage d'implémentation backend
1. **Socle** : Identity (auth OTP + Sanctum), Tenancy, RBAC, audit. *(fait : Sanctum + rate limiters + sécurité)*
2. **Tuition end-to-end** : Academic (import), Billing, Payment (agrégateur + webhook), Document (reçu+QR). *(fait : tranche paiement Tuition + reçu)*
3. **Recouvrement** : Scheduling (échéanciers), Notification (relances), Reporting (dashboard).
4. **Financier** : Reconciliation, Settlement, Commission.
5. **Gouvernance** : Support/Remboursements, Risk/Fraude, Admin complet, conformité BCC.
```
