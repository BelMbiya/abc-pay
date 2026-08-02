# Audit de sécurité — abc pay (option 2 : revue manuelle experte)

> Fintech manipulant des transactions monétaires réelles. Audit adversarial sur 4 axes :
> auth/scope, IDOR/scoping, mass-assignment/injection, config/secrets/headers.
> Date : 2026-08-02. Périmètre : `abc-pay-api` (Laravel) + `abc-pay-web` (Next.js).

## Verdict global
Architecture globalement **saine** : montants recalculés serveur, allowlists strictes
(`SecureFormRequest`), scoping tenant par claims JWT (jamais par input client), RS256,
`type`/`scope` vérifiés (staff/admin), CORS sans wildcard, CSP à nonce, rate-limiting.
Les failles réelles trouvées ont été **corrigées** (voir ci-dessous) ; quelques chantiers
de durcissement prod restent planifiés.

---

## ✅ Corrigé dans cette passe

| # | Sévérité | Faille | Correctif | Fichier |
|---|----------|--------|-----------|---------|
| 1 | **CRITIQUE** | Auth **fail-open** : le vérificateur factice (accepte n'importe quel numéro) s'activait si Firebase désactivé, sans garde prod → usurpation totale de compte | Refus de démarrer (exception) si le fake verifier serait utilisé en production (`isProduction()`) | `app/Providers/IdentityServiceProvider.php` |
| 2 | **HIGH** | **Confusion de scope** : le middleware payeur ne vérifiait pas `scope` ; `users.id`/`admins.id` partagent l'espace d'ids entiers → un jeton admin/staff pouvait résoudre vers un payeur de même id | Épinglage `scope === 'payer'` dans le middleware (test dédié `AuthScopeTest`) | `app/Http/Middleware/JwtAuthenticate.php` |
| 3 | MEDIUM | Refresh **staff** réémettait le `role` depuis le jeton (persistance de privilège après downgrade) | Rôle **re-lu en base** à chaque refresh + refus si compte bloqué | `app/Services/Identity/RefreshService.php` |
| 4 | MEDIUM | **Idempotence non scopée** : rejouer la clé d'autrui renvoyait son reçu + `qr_token` | Lookup idempotence scopé à l'appelant (user_id / établissement) | `TransferService.php`, `TuitionPaymentService.php` |
| 5 | MEDIUM | `trustProxies(at: '*')` → spoof `X-Forwarded-For` → contournement des rate-limiters | Proxys de confiance via `TRUSTED_PROXIES` ; `[]` en prod par défaut | `bootstrap/app.php` |
| 6 | MEDIUM | JWT sans validation d'**issuer** | `parse()` rejette tout `iss` ≠ attendu | `app/Services/Identity/JwtService.php` |
| 7 | LOW | `reason` de blocage non bornée (DoS stockage) | Validation `nullable|string|max:255` | `AdminUserController.php` |
| 8 | LOW | Mots de passe back-office `min:6` | Relevé à `min:8` | `OnboardEstablishmentRequest`, `StoreStaffMemberRequest` |
| 9 | HIGH (latent) | Mass-assignment : champs statut/sécurité de `User` dans l'allowlist | Retirés de `#[Fillable]`, réglés par affectation explicite (services admin) | `app/Models/User.php` |

---

## ⏳ Reste à faire (chantiers dédiés / checklist déploiement)

### Code — chantiers dédiés (ne PAS bâcler)
- **[HIGH] Stockage des tokens en `localStorage`** (payeur/staff/**admin**) → vol par XSS.
  Migrer les **refresh tokens** vers cookie `HttpOnly; Secure; SameSite=Strict` posé par
  l'API ; ne garder que l'access token (court) en mémoire. Ajouter protection CSRF pour le
  flux cookie. Fichiers : `src/lib/refresh.ts`, `staff-auth.ts`, `admin-auth.ts`, `auth-context.tsx`.
- **[HIGH] Incohérence de schéma** : `establishment_staff.user_id` est `varchar` alors que
  `users.id` est `integer`. Fonctionne en SQLite (coercion) mais **cassera sur PostgreSQL**
  (cible prod). Migration d'altération de colonne + conversion de données requise avant prod.
- **[MEDIUM] Révocation refresh staff/admin** : seul le payeur a un kill-switch
  (`sessions_revoked_at`). Ajouter la même révocation (ou un `token_version`) pour staff/admin.
- **[LOW] `$fillable` trop larges** sur `Transaction`, `Establishment`, `Learner`, `Admin`,
  `FraudFlag` (champs argent/rôle/statut). Non exploitable aujourd'hui (tous les writes passent
  par `validated()` ou des tableaux explicites) mais fragile : passer en `forceCreate`/explicite
  et réduire l'allowlist, sur le modèle de `User`.
- **[LOW]** Rate-limit login aussi **par identifiant** (téléphone/email), pas seulement par IP
  (anti credential-stuffing multi-IP). CSP `report-uri` pour détecter les tentatives d'injection.

### Checklist déploiement (config, hors code)
- `APP_DEBUG=false` et `APP_ENV=production` (sinon stack traces + env exposés).
- `APP_KEY` de prod **distinct** de la clé de dev.
- `JWT_ACCESS_TTL=900` (15 min) en prod (dev : 8 h).
- `CORS_ALLOWED_ORIGINS` = origine(s) HTTPS exacte(s) du front.
- `TRUSTED_PROXIES` = CIDR du load-balancer.
- `FIREBASE_ENABLED=true` + `FIREBASE_PROJECT_ID` (sinon l'API refuse de démarrer — cf. #1).
- Clés `storage/app/keys/*.pem` hors dépôt (déjà gitignore) ; « Authorized domains » Firebase verrouillés.

### Option 1 (suite) — audit automatisé
Le projet `abc-pay-api` n'est pas encore sous git → l'outil `security-review` automatisé ne
peut pas diffuser un diff. Étape suivante : `git init` + premier commit, puis lancer l'audit
automatisé sur l'ensemble.
