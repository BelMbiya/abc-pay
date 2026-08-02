# abc pay — Journal du projet

Historique chronologique des grandes étapes de construction.

## 2026-07-30 — Cadrage & socle
- Étude du **cahier des charges** (PDF) et du **prototype MVP HTML** (source de vérité visuelle).
- Décisions : stack **Next.js + Laravel + PostgreSQL**, Tailwind + tokens repris du MVP, disposition « à la Claude » (rail desktop / menu mobile), français.
- Docs d'architecture : `docs/ARCHITECTURE.md`, `docs/api-contract.md`, `db/schema.sql`.

## 2026-07-30 — Sécurité & scaffolds
- `docs/SECURITY.md` (défense en profondeur, 7 couches).
- Scaffold **abc-pay-web** (Next 16, React 19, Tailwind v4) + **abc-pay-api** (Laravel 13, Sanctum).
- Durcissement : en-têtes de sécurité, CORS strict, rate limiters, `SecureFormRequest`, CSP à nonce (`proxy.ts`).

## 2026-07-30 — Design system & front payeur
- Kit de composants (`src/components/ui/`) repris au pixel du MVP + client API sécurisé (`src/lib/api.ts`).
- Accueil payeur, puis parcours **Tuition** (7 étapes).
- Disposition responsive : rail d'icônes desktop, topbar+drawer mobile.

## 2026-07-30 — Back-office & super-admin
- **Back-office établissement** (`/etablissement/*`) : tableau de bord, apprenants, frais, reversements + stubs.
- **Super-admin abc pay** (`/admin/*`) : vue d'ensemble, établissements, intégrations + stubs.

## 2026-07-30 — Écrans payeur restants & API
- Écrans : Paiements (11 catégories), Envoyer, Recevoir, Scan, Activité, Profil, + pages info/légales.
- **API Laravel branchée (Tuition)** : migration établissements/transactions/reçus (uuid), contrôleurs, validation, seeder. Testé end-to-end (quote, paiement → reçu `RC-2026-…`, 422, CORS). Front câblé avec repli mock.

## 2026-07-30 — Retrofit Tuition sur le Master Prompt (DDD + TDD)
- Logique métier sortie du contrôleur → `app/Services/Payment/TuitionPaymentService` (calcul frais/commission, création tx, idempotence) + `app/Services/Document/ReceiptService`. `PaymentController` = orchestration seule (DI par constructeur). `PaymentServiceProvider` enregistré.
- **Idempotence** ajoutée (colonne `idempotency_key` unique) : même clé → 1 seule transaction. Démontré en TDD (RED sans garde → 500 ; GREEN avec garde).
- Tests PHPUnit : `tests/Unit/TuitionFeeTest` (3) + `tests/Feature/TuitionPaymentTest` (5) → **8/8**, suite complète 10/10. Factory `EstablishmentFactory`.
- Patterns : Service Layer, futur Strategy (PaymentGateway). SOLID : SRP (contrôleur≠métier, reçu isolé), DIP (contrôleur→abstraction service via conteneur).

## 2026-07-30 — UI menu latéral + module Identity (auth OTP Firebase, TDD)
- **Menu latéral** : indicateur or **coulissant** derrière l'item actif (composant `IconRail` factorisé pour les 3 rails payeur/back-office/admin), transition douce. Vues de lecture élargies à 640px (accueil gardé étroit).
- **Identity (auth payeur, extraction-ready)** : OTP délégué à **Firebase côté client** ; backend vérifie l'ID token (`FirebasePhoneTokenVerifier`, `firebase/php-jwt`, sans gros SDK) et émet un **JWT RS256** (`JwtService`). `AuthService` (use case), `AuthController` (orchestration), middleware `jwt`, `IdentityServiceProvider` (DIP : Firebase si configuré, sinon `FakePhoneTokenVerifier`). Routes `POST /api/v1/auth/firebase`, `GET /api/v1/me` (protégé JWT). Sanctum remplacé par JWT.
- Migration : `users.phone`/`firebase_uid` uniques, name/email/password nullables (payeur OTP).
- **TDD** : `JwtServiceTest` (3) + `AuthTest` (6, dont tests d'attaque jeton expiré/altéré) → suite **19/19, 51 assertions**. Clés RSA de test en fixtures (`tests/fixtures/`), clés dev dans `storage/app/keys` (gitignore). Pint appliqué.
- Activer le vrai Firebase : `FIREBASE_PROJECT_ID` en env + config Firebase côté front.

## 2026-07-30 — Parcours d'accueil + connexion + BottomSheet
- **Onboarding** `/bienvenue` (splash branding) → **connexion** `/connexion` (numéro → OTP dans un bottom sheet) → JWT stocké → app. `AuthProvider`/`useAuth` (token mémoire + localStorage), `AuthGate` protège l'espace payeur, déconnexion branchée. Dev = jeton `fake:+243…` accepté par le backend ; prod = Firebase (à brancher via `NEXT_PUBLIC_FIREBASE_*`). Login vérifié end-to-end.
- **BottomSheet** (`components/ui/BottomSheet`) : coulissant bas→haut, fond flouté, centré (façon Shopify) — à généraliser aux formulaires/détails.
- ⚠️ **Build = webpack** : `next build --webpack` (Turbopack crashe au prérendu sur Windows). package.json mis à jour.

## 2026-07-30 — Phase A : bottom sheets généralisés (payeur)
- Flux Envoyer / Recevoir / Payer-un-service portés en **feuilles coulissantes** (`components/payer/{SendSheet,ReceiveSheet,PayServiceSheet}`). Tuiles accueil (Envoyer/Recevoir) et services de catégorie (`/paiements`) ouvrent une feuille au lieu de naviguer/toaster. Anciennes routes `/envoyer` et `/recevoir` supprimées. Tuition et Scan restent des pages dédiées.
- Vérifs : eslint 0 erreur, tsc OK, build webpack OK, dev 200.

## 2026-07-30 — Phase B (début) : Billing — types de frais (TDD/DDD, form branché)
- Cause du « bouton sans formulaire » : les boutons back-office ne faisaient qu'un `showToast`.
- **Backend** : module Billing — migration `fee_types`, modèle+factory, `BillingService` (list/create), `FeeTypeController` (orchestration), `StoreFeeTypeRequest`, `BillingServiceProvider`, routes `GET/POST /api/v1/establishments/{id}/fee-types`. Tests `FeeTypeTest` (3) → suite **22/22**. Seeder crée les types depuis la liste `fees`.
- **Front** : `AddFeeTypeSheet` (formulaire en feuille coulissante) + `lib/billing-api.ts` ; page `/etablissement/frais` charge les types depuis l'API (repli mock) et « Ajouter un frais » ouvre la feuille → POST → liste rafraîchie. Vérifié : POST 201, CORS OK, page 200, lint clean.
- ⚠️ Endpoints Billing encore **non protégés** (auth staff à venir — phase établissement du module Identity).

## 2026-07-30 — Feuilles coulissantes généralisées (back-office + admin)
- Apprenants : `AddLearnerSheet` (Ajouter), `ImportLearnersSheet` (Importer, drop Excel/CSV), `LearnerDetailSheet` (aperçu au clic sur une ligne) → page `/etablissement/apprenants` branchée (liste en state, ajout, détail).
- Admin établissements : `OnboardEstablishmentSheet` (Onboarder), `ConfigureEstablishmentSheet` (Configurer au clic sur l'icône) → page `/admin/etablissements` branchée. Suspendre/Réactiver restent des actions (toast).
- Ces feuilles sont **UI de démo** (toast à la soumission) sauf `AddFeeTypeSheet` (branché API). Le backend de chaque (learners, onboarding) viendra avec son module.
- Lint clean, pages 200.

## 2026-07-30 — Staff Identity : back-office sécurisé (TDD/DDD)
- **Backend** : migration `establishment_staff` (RBAC), modèle, `StaffAuthService` (login email+mdp → JWT staff avec scope/établissement/rôle), `JwtService.issueStaffAccess`, `StaffLoginRequest`, `AuthController.staffLogin`, middleware `StaffAuthenticate` (scope=staff → lie l'établissement à la requête). Routes : `POST /api/v1/auth/staff/login`, groupe `staff` protégé `POST/GET /api/v1/staff/fee-types` (scopé à l'établissement du token). Les endpoints Frais publics ont été **supprimés** au profit des routes staff. Seeder : compte `direction@ets045.cd` / `password` par établissement.
- Tests : `StaffAuthTest` (3) + `FeeTypeTest` réécrit sous auth staff (4, dont 401 + scope tenant) → suite **26/26, 72 assertions**.
- **Front** : `lib/staff-auth.ts` (token séparé), `api.ts` (token par appel), `billing-api.ts` (routes `/staff/*`), page `/etablissement-connexion` (login), `StaffGate` (protège `/etablissement/*`). Vérifié end-to-end (login → création frais). Compte démo affiché sur l'écran de connexion.
- ⚠️ 2FA pas encore fait (email+mdp seulement). Les autres endpoints back-office/admin (apprenants, onboarding) restent à créer + protéger.

## 2026-07-30 — Apprenants réels + formulaires enrichis + accueil refait
- **Module Academic (apprenants) réel (TDD/DDD)** : migration `learners`, modèle/factory, `LearnerService`, `LearnerController` (scopé staff), `StoreLearnerRequest`, `AcademicServiceProvider`, routes `GET/POST /api/v1/staff/learners`. Tests `LearnerTest` (4) → suite **30/30, 81 assertions**. Seed : 6 apprenants/établissement.
- **Front** : `lib/learners-api.ts`, `AddLearnerSheet` **enrichie** (identité + parent, branchée API), `LearnerDetailSheet` enrichie (réf abc pay + scolarité + parent), page `/etablissement/apprenants` chargée depuis l'API (liste/ajout/détail réels).
- **Formulaire Onboarder enrichi** : KYB (RCCM, agrément EPST/ESU, ville/province) + contact + config financière (compte de reversement, fréquence, commission) — UI de démo (backend Tenancy à venir).
- **Page d'accueil racine `/bienvenue` refaite** : landing sombre premium (hero dégradé + sections features + CTA), design original abc pay. Build webpack + tsc OK.
- Reste : finir les autres stubs (impayés, rapports, paramètres, commissions, litiges, fraude, KYC/comptes liés payeur), backend Tenancy (onboarding réel), 2FA staff.

## 2026-07-30 — Impayés & relances réels (module Notification)
- **Backend (TDD/DDD)** : migration `reminders`, modèle, `NotificationService.remindLearner` (trace la relance ; envoi SMS/email réel à brancher), `LearnerController.remind` (scopé staff : 403 si apprenant hors établissement), route `POST /api/v1/staff/learners/{learner}/remind`, `NotificationServiceProvider`. Tests +2 → suite **32/32, 86 assertions**.
- **Front** : page `/etablissement/impayes` **réelle** (apprenants en dette depuis l'API, total à recouvrer, bouton Relancer → endpoint réel, état « Relancé »). `LearnerDetailSheet` « Relancer » branché aussi. `remindLearner` dans learners-api.
- Vérifié : lint clean, tsc OK, build webpack OK, relance « sent » en réel.

## 2026-07-30 — Traçabilité Tuition + Paramètres/rôles (réels, TDD)
- **Traçabilité Tuition** : un paiement enregistre/retrouve l'apprenant concerné (source=`paiement`) lié à l'établissement, et la transaction pointe dessus (`learner_id`). Migration (source, first_name nullable, transactions.learner_id), upsert dans `TuitionPaymentService`. Front : badge « via paiement » dans la liste apprenants. But = traçabilité, pas base exhaustive.
- **#1 Paramètres/rôles (staff)** : `StaffDirectoryService` (list/add membres), `StaffMemberController` (RBAC : seule la direction invite → 403 sinon), routes `GET/POST /api/v1/staff/members`. Front : page `/etablissement/parametres` réelle (profil courant + liste du personnel + feuille « Inviter un membre »), rôle stocké à la connexion (`setStaffSession`), bouton inviter visible seulement pour la direction.
- Tests +7 → suite **37/37, 99 assertions**. Build webpack + tsc OK, vérifié en réel (membres, traçabilité).

## 2026-07-30 — Barème + postes de frais → soldes RÉELS (Billing, TDD)
- **Backend** : migration `fee_schedules` (barème) + `fee_items` (postes par apprenant). `BillingService` étendu : listSchedules/createSchedule (génère les postes chez les apprenants concernés), generateFeeItemsForLearner (appelé à la création d'un apprenant), balanceFor. `LearnerService` calcule le **solde = somme(dû − payé)** des postes (fini le champ démo). `FeeScheduleController` + routes staff `GET/POST /api/v1/staff/fee-schedules`. Seeder : barème par établissement + postes générés avec variété payé/impayé.
- Tests `FeeScheduleTest` (3) → suite **40/40, 107 assertions**.
- **Front** : `AddScheduleSheet` (type × promotion × montant), page `/etablissement/frais` — barème réel depuis l'API + « Ajouter au barème ». Apprenants/Impayés affichent désormais des **soldes réels** (0/250/750 $ en démo).
- Vérifié : soldes calculés live, ajout barème live, tsc + build webpack OK.

## 2026-07-30 — Imputation par matricule + décision d'archi (TDD)
- **Décision** (validée user) : abc pay n'est PAS la base des apprenants. 2 modes établissement — `payment_only` (défaut : paiement+reçu+traçabilité, réconciliation chez l'établissement) et `fee_management` (opt-in : soldes+impayés+imputation). **Réconciliation par matricule**. Un seul compte payeur (téléphone) ; étudiant = rôle/lien, pas un type de compte (revoyable).
- **Backend** : migration (establishments.billing_mode, transactions.student_matricule, learners unique(establishment,matricule)). `TuitionPaymentService` : si mode fee_management + apprenant inscrit (matricule) → **impute** sur ses postes (le plus ancien d'abord, `BillingService.applyPayment`) au lieu de créer un tracé. Matricule **obligatoire** au paiement (TuitionPaymentRequest) et à l'inscription (StoreLearnerRequest unique). Seeder : établissements en fee_management.
- Tests +2 (imputation, matricule requis) → suite **42/42, 112 assertions**.
- **Front** : matricule ajouté au parcours Tuition (tous niveaux, obligatoire) + envoyé ; AddLearnerSheet matricule obligatoire. Vérifié en réel : paiement 100$ → solde 250→150.

## 2026-08-01 — OTP Firebase réel + reçu PDF + champs adaptatifs
- **OTP Firebase (Phone Auth) branché** : front `lib/firebase.ts` (init SDK, config publique `NEXT_PUBLIC_FIREBASE_*`), `lib/auth-api.ts` réécrit — `signInWithPhoneNumber` + reCAPTCHA invisible (import dynamique de `firebase/auth`, SSR-safe), `confirmationResult.confirm()` → `getIdToken()` → backend qui vérifie et émet le JWT. Conteneur reCAPTCHA + reset sur échec dans `/connexion`.
- **Interrupteur explicite** (front `NEXT_PUBLIC_FIREBASE_ENABLED`, back `FIREBASE_ENABLED`, défaut **false**) : sans lui, l'app reste en **mode démo** (`fake:+243…`) — le seul fait de poser les clés/le project_id ne casse pas le dev. `IdentityServiceProvider` gate la liaison sur `enabled && project_id`. Suite backend **42/42** conservée.
- **CSP** (`proxy.ts`) ouverte au strict nécessaire pour Firebase/reCAPTCHA : `script-src`/`frame-src`/`connect-src`/`img-src` + hôtes Google (identitytoolkit, securetoken, www.google.com, gstatic). Reste nonce + strict-dynamic.
- **Reçu PDF de marque (jsPDF)** : `lib/receipt.ts` — en-tête navy + logo, accent or, montant, badge PAYÉ, tableau des détails, pied. `Télécharger` = PDF ; `Partager` = Web Share API (fichier) avec repli téléchargement. Boutons du reçu Tuition branchés (états de chargement + toast). Vérifié en réel : blob `application/pdf` 154 KB, reçu API `RC-2026-00003`.
- **Champs adaptés au type d'établissement** fiabilisés (`tuition-data.ts`) : école (classe/option/année scolaire) vs supérieur/université (faculté/promotion/n° étudiant/année académique), flag `required` par champ + helper `requiredFieldIds`.
- **Astérisque `*` sur tous les champs obligatoires** : composant `Field` (affiche `*` si `required`), + labels custom (Relation/Type de frais/Montant) et validation des boutons Continuer (student/payer). Note « * Champs obligatoires ».
- Deps front : `firebase` ^12, `jspdf` ^4. ⚠️ Pour activer le vrai SMS : voir les étapes console Firebase (provider Phone + numéro de test) puis passer les 2 flags à `true`.

## 2026-08-01 (soir) — Correctif total + historique transactions + « C'est moi »
- **Bug d'affichage du total corrigé** (`lib/api.ts` `fmt`) : l'ancien `.replace(/,/g," ")` transformait la virgule DÉCIMALE fr-FR en espace (« 51,5 » → « 51 5 » ≈ « 515 »). Le calcul serveur était juste. Nouveau `fmt` : `maximumFractionDigits:2` + normalisation des espaces insécables. Vérifié en réel : 50 $ → frais 1,5 $ → total 51,5 $.
- **Historique « mes transactions » (réel, TDD/DDD)** : migration `transactions.user_id` (nullable, FK users), `Transaction.user()`, `PaymentController.optionalUserId()` (rattache la tx au payeur SI un JWT valide accompagne le POST — paiement tiers anonyme toujours permis), `TransactionHistoryService.forUser()`, `TransactionController@index`, route JWT `GET /api/v1/transactions`. Test `TransactionHistoryTest` (4 : 401 sans auth, association+listing, cloisonnement par user, anonyme sans user_id) → suite **46/46, 126 assertions**.
- **Front `/activite` réel** : `lib/transactions-api.ts` + page refaite (états chargement/vide/erreur, statut, n° reçu) ; **clic sur une transaction → re-télécharge son reçu PDF** (reconstruit `ReceiptData` depuis la tx). Vérifié : GET 200, RC-2026-00006 listé, reçu régénéré (PDF 153 KB).
- **Bouton « C'est moi (payer en mon nom) »** (étape payeur) : pré-remplit le payeur avec le compte connecté (téléphone + nom découpé Nom/Post-nom/Prénom si présent). Vérifié : tel → +243812345678.
- **Garde-fou token expiré** (`auth-context`) : à l'hydratation, un JWT expiré est purgé (fin de l'état « connecté zombie » → 401 silencieux). ⚠️ Le **refresh-token** n'est toujours pas branché (access ~15 min) : à faire.

## 2026-08-01 (nuit) — Auth expirée, super-admin + provisioning, gabarit Excel
- **A. Erreur « Authentification établissement requise » corrigée** : cause = token staff expiré (TTL 15 min) que `StaffGate` ne détectait pas (contrôle de présence seulement). Util partagé `lib/jwt.ts` (`isJwtExpired`) ; `getStaffToken()` purge un token expiré → redirection vers la connexion établissement (idem payeur `auth-context`). `JWT_ACCESS_TTL` porté à 8 h en dev (`.env`). ⚠️ refresh-token toujours à brancher. Vérifié : /etablissement/* redirige si token absent/expiré ; après login staff, POST fee-types → 201.
- **B. Module super-admin + provisioning établissement (TDD/DDD)** — l'espace /admin est maintenant authentifié.
  - Backend : table `admins`, modèle, `AdminAuthService`, middleware `admin`, `JwtService.issueAdminAccess` (scope=admin, `encode()` généralisé au sujet-id). `Services/Tenancy/EstablishmentProvisioningService` (create établissement + compte « direction » = User+EstablishmentStaff ; updateLogin email/mdp ; list avec email de connexion ; niveau auto selon le type ; code marchand auto). Routes `POST /auth/admin/login`, groupe `admin` : `GET|POST /admin/establishments`, `PATCH /admin/establishments/{id}/login`. FormRequests (unicité email). Seeder : `admin@abcpay.cd / password`. Tests `AdminAuthTest`(4)+`EstablishmentProvisioningTest`(4) → suite **54/54, 153 assertions**.
  - Front : `lib/admin-auth.ts` + `lib/admin-api.ts`, page `/admin-connexion`, `AdminGate` (dans le layout admin), `OnboardEstablishmentSheet` (création réelle + email/mdp), `ConfigureEstablishmentSheet` (modifier email / réinitialiser mdp), `/admin/etablissements` branché sur l'API (liste + compte de connexion + rafraîchissement).
  - Vérifié en réel : /admin→/admin-connexion (gate), login admin 200, liste 200, création établissement 201 (compte « direction » qui se connecte aussitôt au back-office), modification login (ancien 422 / nouveau 200).
- **C. Gabarit Excel de réconciliation des soldes** : `abc-pay-web/public/modeles/gabarit-reconciliation-abc-tuition.xlsx` (openpyxl). 3 onglets — Instructions, Réconciliation (saisie crème + Solde/Statut auto, total, validations), Listes (menus). Clé = matricule. Aussi téléchargeable côté back-office.
- **Correctif d'affichage** (rappel) : `fmt` réparé (virgule décimale fr-FR ne doit pas être remplacée).

## 2026-08-01 (fin) — Refresh-token, commission côté établissement, vues transactions
- **Refresh-token (3 scopes, TDD)** : `RefreshService` (payer/staff/admin — réémet un accès scopé + rotation du refresh, sujet revalidé), route `POST /auth/refresh`, `JwtService.issueStaffRefresh/issueAdminRefresh` ; staff+admin login renvoient désormais un refresh_token. Front : `lib/refresh.ts` (source unique — clés par scope, dédup, `ensureFreshAccess`), `api.ts` (401 → refresh → retry avec Idempotency-Key stable), hydratation payeur qui renouvelle au lieu de purger, gates staff/admin proactifs. Tests `RefreshTokenTest` (5). Vérifié en réel : accès payeur expiré → `POST /auth/refresh` 200 → resté connecté, /activite chargée.
- **Commission jamais à charge du payeur (TDD)** : `TuitionPaymentService` — `service_fee = 0`, `total = amount` (le payeur paie le montant exact) ; la **commission** (`commission_rate` de l'établissement) est prélevée côté établissement (`net_establishment = amount − commission`). Tests unitaires + feature réécrits. Front : récap/reçu sans ligne de frais + note « Aucun frais à ta charge ». Vérifié : devis 250 → total 250, commission 5, net 245.
- **Vues transactions (établissement + admin)** : `TransactionHistoryService` étendu (`forEstablishment`, `platformWide`, synthèses). Routes `GET /staff/transactions` (scopé établissement) + `GET /admin/transactions` (plateforme). Front `lib/tx-views-api.ts`, pages `/etablissement/paiements` (encaissé/commission/net + table) et `/admin/commissions` (volume/commission/nb + table). Tests `TransactionViewsTest` (3). Suite backend **62/62, 185 assertions**. Vérifié en réel (staff : 500/10/490 ; admin : 900/18/7).

## 2026-08-01 (nuit 2) — Scan + QR codes personnalisés + « C'est moi » (étudiant)
- **« C'est moi »** (étape payeur Tuition) reprécisé : signifie que **l'étudiant connecté paie pour lui-même** → copie l'identité de l'élève saisi + le téléphone du compte, et fixe la relation sur « Étudiant ». Bouton relibellé « C'est moi — je suis l'étudiant ».
- **QR codes (lib `lib/qr.ts`, deps `qrcode`+`jsqr`)** :
  - **Établissement** → QR encodant `${origin}/tuition?e=<code|id>` : scanné, il ouvre le parcours Tuition avec l'établissement **déjà présélectionné** (vérifié : `/tuition?e=ABC-TUITION-045` → étape Élève, ISC). Composant `EstablishmentQrCard` (téléchargeable), affiché en back-office (`/etablissement/paiements`) et dans la config admin.
  - **Utilisateur** → QR « recevoir » (`/scan?t=user&r=<tel>&n=<nom>`) affiché dans `ReceiveSheet` (généré depuis le compte connecté).
- **Vue `/scan` réelle** : caméra `getUserMedia` + décodage `jsqr` (boucle rAF), décode → route (établissement → Tuition prérempli ; utilisateur → flux d'envoi montant/moyen). Repli **saisie manuelle** + gestion caméra refusée/indisponible. Vérifié : repli + routage manuel OK (la caméra live nécessite un appareil réel).
- Tuition lit `?e=` (via `window.location.search`, sans Suspense). Front eslint+tsc propres.

## 2026-08-01 (jour 2) — Tous types de transactions, filtres, gestion établissement, reversements
- **Retracement de TOUT type de transaction** : migration `make_transactions_generic` (`type` tuition|send|service, `direction`, contrepartie, libellé ; colonnes Tuition → nullables). `TransferService` + `POST /api/v1/transactions` (JWT) enregistre envois P2P + paiements de service (reçu émis). Flux front `SendSheet`/`PayServiceSheet`/`scan` branchés → tracés dans l'historique. Tests `TransferTest` (4). Vérifié : envoi + service listés dans /activite avec reçu.
- **Catégorisation + filtres** : `/activite` (chips Tout/Tuition/Envois/Services + recherche, icônes + signe par type), `/etablissement/paiements` (recherche + moyen + statut), `/admin/commissions` (recherche + établissement + type + moyen, disposés sur une ligne compacte ; KPIs recalculés selon le filtre).
- **Vue établissement** : suppression de la section « Commission abc pay » (tuile + colonne) ; on garde Total encaissé + Net à reverser.
- **Gestion établissement (admin)** : `PATCH /admin/establishments/{id}` (nom, type→niveau, ville, commission, mode, `is_active`). `ConfigureEstablishmentSheet` édite infos + statut + compte + QR. **Bouton de changement de statut** (Suspendre/Réactiver) remis sur la liste. Tests +1 (suite **67/67**).
- **Reversements réels/dynamiques** : `SettlementService` (net par semaine, dérivé des transactions confirmées) + `GET /staff/settlements`. Page `/etablissement/reversements` réelle : KPIs (net à reverser, prochaine période, total net) + graphe hebdo CSS + historique. Vérifié : 650 brut / −13 commission / 637 net.
- **Caméra scan** : détection du **contexte non sécurisé** (IP réseau http → getUserMedia bloqué) avec message dédié + script `dev:https` (`next dev --experimental-https`) pour tester sur téléphone.
- **« C'est moi » (rappel)** = l'étudiant connecté paie pour lui-même (relation Étudiant).

## 2026-08-01 (jour 3) — Dashboards réels + graphes, filtre date, toutes les vues implémentées
- **Dashboards RÉELS (TDD)** : `StatsService` (Reporting) → établissement (attendu/encaissé/**taux de recouvrement** depuis Billing/fee_items, net, série hebdo, par canal, top impayés) + plateforme (volume/commission/établissements/transactions, hebdo, par opérateur, santé opérateurs, top établissements, alertes risque). `GET /staff/dashboard` + `GET /admin/dashboard`. Pages `/etablissement` et `/admin` branchées (graphes CSS alimentés en réel). Tests `DashboardTest` (3) → suite **70/70**. Vérifié : établissement (4500/650/57.8 %/637) + admin (1285/21/6/11 + volume par opérateur).
- **Filtre par DATE** (`lib/period.ts` : 7j / 30j / ce mois / tout) sur `/activite`, `/etablissement/paiements`, `/admin/commissions` — la vue ET les KPIs s'adaptent à la période. Vérifié (ce mois : 11 → 9 lignes).
- **Toutes les vues mock/en construction implémentées** :
  - `/etablissement/rapports` : réel (KPIs + répartition + **export CSV** du journal, `lib/csv.ts`).
  - `/etablissement/aide` : FAQ (accordéon) + contact support.
  - `/admin/integrations` : santé opérateurs réelle (tx/canal depuis la BDD).
  - `/admin/fraude` : alertes + transactions signalées (montant ≥ 500 $ ou échec), dérivées de la BDD.
  - `/admin/litiges` : file des cas (transactions non confirmées) + état vide.
  - `/admin/parametres` : compte admin + config plateforme + déconnexion.

## 2026-08-01 (jour 4) — Réception miroir, devise configurable, profil admin éditable
- **Réception (crédit) + vice-versa** : un envoi P2P vers un utilisateur abc pay (par téléphone) crée le mouvement MIROIR « receive » (crédit) dans SON historique — l'expéditeur voit « Envoi · destinataire » (débit), le destinataire voit « Reçu · expéditeur » (crédit +). `TransferService`. Test `TransferTest` +1. Vérifié en réel (envoi 40 → crédit 40 chez le destinataire).
- **Configuration de la devise (USD/CDF)** : table `settings` (clé/valeur) + `SettingsService` ; `GET /api/v1/settings` (public) + `PATCH /api/v1/admin/settings` (admin). Les nouveaux paiements enregistrent la devise plateforme. Front : `lib/money.ts` (`money()` adaptable), `CurrencyBootstrap` (charge la devise au démarrage), sweep des vues à données réelles (`${fmt} $` → `money()`). Sélecteur de devise dans `/admin/parametres`. Vérifié : passage CDF → dashboards affichent « 1 285 FC ».
- **Profil admin éditable** : `PATCH /api/v1/admin/me` (nom/email/mot de passe, `AdminAuthService.updateProfile`). `/admin/parametres` : formulaire « Mon compte » + déconnexion. Tests `SettingsAndProfileTest` (4). Suite backend **75/75, 238 assertions**.

## 2026-08-01 (jour 5) — Devise par établissement + par transaction, notifications instantanées
- **Devise par établissement** : colonne `establishments.currency` (défaut USD) ; onboarding + configuration admin (chips USD/CDF). Les paiements Tuition utilisent la devise de l'établissement.
- **Devise choisie par transaction** (envoi/service) : `TransactionStoreRequest.currency` ; sélecteur dans `SendSheet`/`PayServiceSheet`. Chaque ligne d'historique s'affiche dans SA devise (`money(x, t.currency)`) ; les KPIs restent en devise plateforme.
- **Notifications in-app (centre)** : table `user_notifications`, `NotificationService.notify/list/unread/markAllRead`, `GET/POST /api/v1/notifications`. Hooks : succès envoi → notifie l'expéditeur ET le **destinataire** (« Argent reçu ») ; **échec → notifie l'expéditeur avec la RAISON**. Tuition réussi → notifie le payeur. Front : `NotificationBell` (badge non-lus + centre coulissant, polling 15 s) dans la TopBar (mobile) + AppShell (desktop).
- **Cycle succès/échec des transferts** : `TransferService` — règle de plafond (10 000) → transaction `echouee` + raison ; `SendSheet`/`PayServiceSheet` affichent une étape « échoué » avec la raison. Reçu adapté à la devise.
- Tests `NotificationsTest` (3) + devise (2) → suite backend **79/79, 255 assertions**. Vérifié en réel (envoi CDF « 25,00 FC », échec « Plafond dépassé », cloche badge 2, centre).

## 2026-08-01 (jour 6) — Conversion de change (FX) multi-devises
- **Taux de change configurable** : `SettingsService` — `usd_cdf_rate` (défaut 2800), `convert()`, `toBase()`. Exposé par `GET /settings` ; réglable via `PATCH /admin/settings` (+ champ dans `/admin/parametres`).
- **Agrégats convertis en devise de base** : `StatsService` (dashboards établissement/plateforme) et `TransactionHistoryService.platformSummary` convertissent chaque transaction vers la devise de base (établissement = sa devise ; plateforme = devise réglage) avant de sommer. Réponses annotées `base_currency`.
- **Front** : `lib/money.ts` (`convert`/`toBase`, taux chargé par `CurrencyBootstrap`), KPIs filtrés admin `/commissions` et total période payeur `/activite` convertis (`toBase(x, row.currency)`). Chaque ligne reste dans sa devise ; les totaux sont en devise de base.
- Tests `FxTest` (3, dont agrégat plateforme USD+CDF) → suite backend **82/82, 267 assertions**. Vérifié en réel : paiement 4 000 CDF (taux 2000) agrégé en 2 USD dans le volume plateforme.

## 2026-08-01 (jour 7) — Symbole devise, notifications drawer temps réel, plafond configurable
- **Symbole de devise adaptatif** : `AmountInput` reçoit le symbole ; SendSheet/PayServiceSheet affichent **FC** quand CDF est choisi ; Tuition affiche la devise de l'établissement (ajoutée au DTO `EstablishmentDirectory` + type `School`) ; Scan idem.
- **Notifications en panneau coulissant à droite** (au lieu d'un modal) : `NotificationBell` via **portal** (`fixed inset-0 overflow-hidden` + panneau `absolute right-0`, slide-in). **Temps réel sans rechargement** : ping global `abcpay:notifications` émis après chaque action (transfert/Tuition) + rafraîchissement sur focus/visibilité + polling 8 s.
- **Plafond de transfert** : c'était une limite démo codée en dur (10 000) comparée SANS la devise (20 000 FC ≈ 7 $ échouait à tort). Corrigé → **configurable** (`settings.transfer_cap` en USD, réglable dans `/admin/parametres`) et **comparé en USD** (montant converti). Bug corrigé : `null === null` déclenchait un faux « auto-envoi ». Tests `FxTest` +1. Suite backend **83/83, 272 assertions**. Vérifié : 20 000 FC → réussi ; symbole FC affiché ; drawer ancré à droite.

## Reste à faire (voir docs/BACKEND-ARCHITECTURE.md)
- Auth OTP réelle (Sanctum) + protection des routes + espace parent connecté.
- Compléter les stubs (back-office & admin) et les vrais flux de paiement des catégories.
- Modules backend : Scheduling, Notification, Reconciliation, Settlement, Commission, Risk, Support, Reporting.
- Webhooks opérateurs signés (remplacer la confirmation immédiate de démo).
- Migrations complètes depuis `db/schema.sql` ; passage sqlite → PostgreSQL.
