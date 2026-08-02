# abc pay — Contrat d'API REST (Phase 1)

Backend **Laravel** exposant une API REST consommée par le frontend **Next.js**.
Base URL : `https://api.abcpay.cd/v1`. Format : JSON. Auth : **Bearer token** (Laravel Sanctum).

## Conventions
- Multi-tenant : le contexte établissement est déduit du token (staff) ou passé en `establishment_id`.
- Réponses : `{ "data": …, "meta": … }` ; erreurs : `{ "error": { "code", "message", "fields" } }`.
- Pagination : `?page=&per_page=` → `meta.pagination`.
- Rôles : `payer` (parent/étudiant), `staff:{direction|comptable|caissier|consultation}`, `super_admin`.
- Idempotence : les créations de paiement acceptent l'en-tête `Idempotency-Key`.

---

## 1. Authentification & comptes  `/auth`
| Méthode | Endpoint | Rôle | Rôle |
|---|---|---|---|
| POST | `/auth/otp/request` | public | Envoi OTP SMS (inscription/connexion payeur) |
| POST | `/auth/otp/verify` | public | Vérifie OTP → token |
| POST | `/auth/login` | public | Email + mot de passe (établissement / admin), 2FA optionnel |
| POST | `/auth/password/forgot` | public | Réinit par OTP/email |
| POST | `/auth/password/reset` | public | Applique le nouveau mot de passe |
| GET | `/auth/me` | authentifié | Profil + rôles + établissements |
| POST | `/auth/logout` | authentifié | Révoque le token |

## 2. Espace payeur (parent / étudiant)  `/me`
| Méthode | Endpoint | Détail |
|---|---|---|
| GET | `/me/learners` | Tableau de bord multi-enfants / multi-établissements (solde, prochaine échéance) |
| GET | `/me/learners/{id}` | Détail apprenant : postes de frais, payé, restant, historique |
| GET | `/me/transactions` | Historique filtrable (période, enfant, établissement) |
| GET | `/me/transactions/export` | Export PDF des reçus d'une année |
| GET | `/me/linked-accounts` · POST · DELETE | Comptes Mobile Money / banque reliés |
| GET | `/me/kyc` | Niveau de vérification & plafonds |

## 3. Onboarding établissement  `/establishments`
| Méthode | Endpoint | Rôle |
|---|---|---|
| POST | `/partners/apply` | public — formulaire « Devenir partenaire » |
| POST | `/establishments` | super_admin — crée le tenant |
| GET/PATCH | `/establishments/{id}` | staff:direction / admin — infos + config financière |
| POST | `/establishments/{id}/logo` | Upload logo |
| GET/PATCH | `/establishments/{id}/settings` | Commission, devise, fréquence reversement, qui paie la commission |

## 4. Structure académique  `/establishments/{id}`
| Méthode | Endpoint | Détail |
|---|---|---|
| CRUD | `/academic-years` , `/academic-terms` | Années + périodes (trimestres/semestres) |
| CRUD | `/academic-groups` | Classes (école) / filières-promotions (supérieur) |
| CRUD | `/learners` | Fiche apprenant |
| POST | `/learners/import` | Import Excel/CSV (gabarit) + détection doublons |
| POST | `/learners/{id}/guardians` | Rattacher parent/tuteur (relation) |
| POST | `/learners/promote` | Passage de niveau en fin d'année |

## 5. Frais & barèmes  `/establishments/{id}`
| Méthode | Endpoint | Détail |
|---|---|---|
| CRUD | `/fee-types` | Catalogue (inscription, minerval, annexes, par crédit, examen, pénalité) |
| CRUD | `/fee-schedules` | Barème par groupe / année |
| POST | `/billing/generate` | Génère les postes de frais individuels depuis le barème |
| CRUD | `/fee-items` | Postes de frais d'un apprenant |
| CRUD | `/installment-plans` | Échéanciers & tranches |
| POST | `/discounts` | Remise/exonération (validation direction) |

## 6. Paiement  `/payments`
| Méthode | Endpoint | Détail |
|---|---|---|
| POST | `/payments/quote` | Calcule frais de service + total (règles §20, taux MVP : tuition 2 %, supérieur 3 %) |
| POST | `/payments` | Initie un paiement (mobile money / carte / virement) → statut `initiee` |
| GET | `/payments/{id}` | Statut de la transaction (polling si pas de webhook) |
| POST | `/payments/third-party` | Paiement pour un tiers (sponsor) sans compte parent complet |
| POST | `/payments/manual` | staff — encaissement espèces (hors commission) |
| POST | `/webhooks/operators/{channel}` | **Webhook opérateur/agrégateur** → confirme, met à jour le solde, génère le reçu |
| GET | `/receipts/{id}` / `/receipts/verify/{qr_token}` | Reçu PDF / page de vérification QR (public) |

## 7. Back-office établissement  `/establishments/{id}`
| Méthode | Endpoint | Détail |
|---|---|---|
| GET | `/dashboard` | Attendu / encaissé / taux de recouvrement / en attente de reversement, répartition par canal, évolution |
| GET | `/unpaid` | Liste des impayés (filtre classe/promotion, jours de retard) |
| POST | `/reminders/send` | Relance manuelle personnalisée |
| CRUD | `/staff` | Rôles internes (direction/comptable/caissier/consultation) |
| GET | `/reports/*` , `/exports/*` | Exports Excel/CSV, journal des transactions |
| GET | `/learners/{id}/no-debt-certificate` | Attestation de non-dette (PDF) |

## 8. Réconciliation & reversement  `/establishments/{id}`
| Méthode | Endpoint | Détail |
|---|---|---|
| GET | `/settlements` / `/settlements/{id}` | Lots de reversement + relevé PDF/Excel |
| POST | `/settlements/run` | admin — consolidation (job nocturne déclenchable) |
| POST | `/refunds` | Remboursement (validation conjointe comptable + admin abc pay) |

## 9. Super-admin abc pay  `/admin`
| Méthode | Endpoint | Détail |
|---|---|---|
| GET | `/admin/establishments` | Gérer / suspendre / configurer commission |
| GET | `/admin/overview` | Volumes consolidés par opérateur / établissement / période |
| GET/PATCH | `/admin/commissions` | Barèmes de commission |
| GET | `/admin/tickets` | Support & litiges (transactions en échec, contestations) |
| GET | `/admin/fraud-alerts` | Transactions atypiques |
| GET/PATCH | `/admin/integrations` | Santé des API opérateurs, clés, environnements |

---

## Découpage en services Laravel (modules)
`Auth` · `Academic` · `Billing` · `Payment` (avec **couche d'abstraction opérateur**) · `Notifications` · `Reconciliation` · `Admin`.
La couche paiement isole chaque opérateur derrière une interface commune (`PaymentGateway`) → on démarre avec **un agrégateur agréé**, on bascule vers des intégrations directes en Phase 2 sans réécrire le cœur (recommandation §19 du cahier des charges).
