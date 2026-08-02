# abc pay — Architecture de sécurité des API (Fintech)

Objectif : **sécurité maximale**, défense en profondeur. Aucune intrusion, aucune
injection (SQL, HTML/XSS, prompt), intégrité totale des flux de paiement.
Principe directeur : **ne jamais faire confiance à l'entrée, tout valider, tout
tracer, chiffrer partout, exposer le minimum.**

---

## 0. Les 7 couches de défense

```
[1] Réseau / Transport   TLS 1.3, HSTS, WAF, IP allowlist admin, anti-DDoS
[2] Périmètre API        CORS strict, rate limiting, en-têtes de sécurité, taille max payload
[3] Authentification     OTP SMS + Sanctum, 2FA staff, rotation & expiration des tokens
[4] Autorisation         RBAC + Policies multi-tenant, principe des 4 yeux, moindre privilège
[5] Entrées              Form Requests (allowlist), typage strict, anti-injection SQL/XSS/prompt
[6] Données              Chiffrement au repos, hashing, secrets en coffre, masquage PII
[7] Observabilité        Audit log immuable, détection de fraude, alertes, tests de sécurité CI
```

---

## 1. Réseau & transport
- **TLS 1.3** obligatoire, redirection HTTP→HTTPS, **HSTS** (`max-age=63072000; includeSubDomains; preload`).
- **WAF** en amont (Cloudflare/AWS WAF) : règles OWASP Core Rule Set, anti-DDoS, geo/rate rules.
- Back-office **super-admin** derrière **IP allowlist** + VPN.
- Certificats gérés (renouvellement auto), TLS pinning côté intégrations opérateurs si supporté.

## 2. Périmètre API (middleware Laravel)
- **CORS strict** : origines en allowlist (domaines abc pay uniquement), pas de `*`, credentials contrôlés.
- **Rate limiting** différencié : global par IP, plus sévère sur `/auth/*` (anti-bruteforce) et `/payments/*`. Ex. `throttle:auth` = 5/min, `throttle:payment` = 10/min, `throttle:api` = 60/min.
- **En-têtes de sécurité** sur toutes les réponses :
  `Content-Security-Policy` (default-src 'self'), `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy` restrictif,
  `Cache-Control: no-store` sur les endpoints sensibles.
- **Taille max des requêtes** (anti-DoS mémoire), timeouts, rejet des `Content-Type` inattendus.
- API **versionnée** `/v1`, endpoints internes non exposés publiquement.

## 3. Authentification
- **Payeurs** : téléphone + **OTP SMS** (code à usage unique, TTL court, tentatives limitées, invalidation après usage).
- **Staff établissement / admin** : email + mot de passe **+ 2FA (OTP)**. Mots de passe hashés **bcrypt/argon2**, politique de complexité, verrouillage après N échecs.
- **Tokens** : Laravel **Sanctum**, tokens à **portée (abilities)** minimale, **expiration** + **rotation**, révocation à la déconnexion et au changement de mot de passe.
- Pas de secret dans l'URL ni les logs. Reset de mot de passe par lien/OTP à durée de vie limitée, à usage unique.

## 4. Autorisation (le plus critique en multi-tenant)
- **RBAC** : rôles `payer`, `staff:{direction|comptable|caissier|consultation}`, `super_admin`.
- **Isolation tenant** : *global scope* Eloquent + **Policies** vérifiant systématiquement `establishment_id`. **Aucune** requête ne doit pouvoir lire/écrire les données d'un autre établissement (protection contre l'**IDOR / accès horizontal**).
- **Moindre privilège** : le caissier n'accède pas aux barèmes ; la consultation est en lecture seule.
- **Principe des quatre yeux** : annulation/remboursement/reversement exigent une **double validation** (comptable établissement + admin abc pay), tracée.
- Vérification d'autorisation **côté serveur uniquement** (jamais se fier au front).

## 5. Prévention des injections

### 5.1 SQL injection — **éliminée par construction**
- **Eloquent / Query Builder uniquement** → requêtes **paramétrées** (bindings). **Interdiction** de `DB::raw`, concaténation de chaînes dans les requêtes, `whereRaw` avec entrée utilisateur. Si SQL brut inévitable → **bindings nommés** obligatoires, jamais d'interpolation.
- Règle CI : grep bloquant sur `DB::raw`, `->raw(`, `whereRaw(` contenant `$`.
- Colonnes/tri dynamiques (`sort_by`) validés contre une **allowlist** (jamais l'entrée brute dans `ORDER BY`).

### 5.2 HTML / XSS injection
- API **JSON pure** : `Content-Type: application/json`, jamais de rendu HTML avec données utilisateur côté API.
- **Sanitisation en entrée** (strip des balises/scripts sur les champs libres : nom d'établissement, référence, message de relance) + **échappement à la sortie**.
- Côté **Next.js** : React échappe par défaut ; **interdiction** de `dangerouslySetInnerHTML` avec données serveur ; CSP stricte ; validation des liens (pas de `javascript:`).
- Reçus **PDF** générés côté serveur à partir de champs **échappés** (pas d'injection dans le template).

### 5.3 Prompt injection (si un module IA/LLM est ajouté)
- **Aucune donnée utilisateur n'est traitée comme instruction.** Tout contenu (nom, référence, message, document importé) est **donnée**, jamais commande.
- Si un assistant/IA est branché (support, catégorisation) : séparer strictement *system prompt* et *données* (délimiteurs + rôle), **allowlist d'outils**, pas d'exécution d'action financière déclenchée par un texte, sorties re-validées côté serveur avant tout effet.
- Contenu importé (Excel/CSV d'apprenants) traité comme données inertes : parsing strict, pas d'évaluation de formules, pas d'exécution.

### 5.4 Autres injections
- **Mass assignment** : `$fillable` explicite (allowlist) sur tous les modèles, jamais `$guarded=[]`. Champs sensibles (`is_super_admin`, `commission_rate`, `establishment_id`) **non remplissables** par l'API.
- **Command/Path injection** : pas d'appel shell avec entrée utilisateur ; uploads stockés hors webroot, noms régénérés, type MIME vérifié.
- **SSRF** : webhooks/appels sortants restreints à des hôtes en allowlist.

## 6. Validation des entrées (systématique)
- **Form Requests** Laravel sur **chaque** endpoint : règles strictes (type, format, bornes, regex téléphone `+243…`, montants > 0, devises dans l'enum, longueurs max).
- **Allowlist, pas blocklist.** Rejet par défaut de tout champ non déclaré.
- Validation des **UUID** de route, des énumérations, cohérence métier (le montant ≤ solde dû, l'apprenant appartient à l'établissement…).
- Miroir de validation côté Next.js (UX) **sans jamais** remplacer la validation serveur.

## 7. Sécurité spécifique **paiement** (priorité maximale)
- **Idempotence** : en-tête `Idempotency-Key` obligatoire sur `POST /payments` → **aucun double débit** même en cas de retry réseau.
- **Webhooks opérateurs** : **vérification de signature** (HMAC / secret partagé) + **allowlist d'IP** + rejet des rejeux (nonce/timestamp). Le solde n'est mis à jour **qu'après** confirmation authentifiée.
- **Montants côté serveur** : le total, les frais et la commission sont **recalculés côté API** (`/payments/quote`), jamais fait confiance au montant envoyé par le client.
- **Job de réconciliation** périodique : interroge l'opérateur pour rattraper les désynchronisations (transaction débitée mais non confirmée) → pas de paiement « perdu ».
- **Machine à états** stricte des transactions (`initiee → en_attente → confirmee/echouee/expiree`), transitions contrôlées, pas de saut d'état.
- **Cartes** : **jamais** stocker le PAN/CVV côté abc pay → délégué au prestataire agréé (**PCI-DSS SAQ-A**, tokenisation). Voir la note conformité BCC (§8.3 cahier).

## 8. Protection des données
- **Chiffrement au repos** des données sensibles/financières (Postgres + chiffrement applicatif Laravel `encrypted` casts pour PII : téléphone, comptes liés).
- **TLS** en transit partout (y compris DB ↔ app).
- **Secrets** hors du code : variables d'environnement / coffre (AWS Secrets Manager / Vault). **Jamais** de clé API opérateur commitée. `.env` hors dépôt.
- **Masquage PII** dans les logs (téléphones, numéros de compte partiellement masqués), données des **mineurs** strictement restreintes aux parents/tuteurs déclarés + établissement.
- **Sauvegardes chiffrées**, restauration testée, rétention conforme aux exigences comptables.

## 9. Observabilité, audit & anti-fraude
- **Audit log immuable** (append-only) de toute opération financière : création de frais, modif de barème, annulation, reversement — avec acteur, avant/après, horodatage.
- **Détection de fraude** : alertes sur montants atypiques, tentatives répétées d'échec, vélocité anormale, multi-comptes.
- **Monitoring** : taux d'erreur, latence, santé des intégrations opérateurs, alertes automatiques.
- **Logs de sécurité** (auth échouée, accès refusé) centralisés et alertés.

## 10. Cycle de développement sécurisé (CI/CD)
- **Analyse de dépendances** (composer audit, npm audit) bloquante sur vulnérabilités critiques.
- **SAST** (analyse statique) + lint sécurité (règle anti `DB::raw`, anti `dangerouslySetInnerHTML`).
- **Secrets scanning** (empêche de committer une clé).
- **Tests de sécurité** : jeux de tests d'injection SQL/XSS, tests d'autorisation (un tenant ne voit pas un autre), tests d'idempotence paiement.
- Environnements séparés **dev / recette / prod**, secrets distincts, pas de données réelles en dev.
- Revue de code obligatoire sur tout ce qui touche auth, paiement, autorisation.

### État des dépendances (front `abc-pay-web`)
`npm audit` remonte **12 avis « high » transitifs**, tous dans l'**outillage dev/build**
(chaîne ESLint → `minimatch`/`brace-expansion` = DoS dev-only ; `postcss` = build-time ;
`sharp` = optimisation d'images). **Aucun** n'est sur le chemin runtime de traitement des
requêtes de l'API. Les versions patchées ne sont pas encore dans les ranges figés par Next 16
(major tout juste publié) ; forcer des `overrides` a introduit d'autres conflits (testé → écarté).
**Plan** : suivre le patch upstream de Next, `composer audit`/`npm audit` bloquants en CI,
et éviter l'optimisation serveur d'images non fiables (mitige `sharp`).

---

## Récapitulatif — correspondance avec les menaces citées
| Menace | Contre-mesures principales |
|---|---|
| Intrusion | TLS 1.3, WAF, IP allowlist admin, rate limiting, Sanctum + 2FA, monitoring |
| Injection **SQL** | Eloquent paramétré, interdiction SQL brut, allowlist tri/colonnes, `$fillable` |
| Injection **HTML/XSS** | API JSON, sanitisation entrée + échappement sortie, CSP, React auto-escape, pas de `dangerouslySetInnerHTML` |
| Injection **prompt** | Données ≠ instructions, séparation system/données, allowlist d'outils, re-validation serveur, imports inertes |
| Fraude **paiement** | Idempotence, webhooks signés, montants recalculés serveur, réconciliation, machine à états, 4 yeux, PCI-DSS déléguée |
