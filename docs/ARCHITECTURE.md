# abc pay — Architecture technique (Phase 1 : Web App / Tuition)

Document maître. **Source de vérité visuelle** : `8 abc-pay-webapp v1.mvp19.html`
(couleurs, polices Sora + Inter, composants, responsive). **Source de vérité
fonctionnelle** : le cahier des charges v2.0.

## 1. Vue d'ensemble

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│  abc-pay-web  (Next.js)      │  REST  │  abc-pay-api  (Laravel)      │
│  ─ Espace payeur             │ ─────▶ │  Auth · Academic · Billing   │
│  ─ Back-office établissement │ ◀───── │  Payment · Notifications     │
│  ─ Super-admin abc pay       │  JSON  │  Reconciliation · Admin      │
└─────────────────────────────┘        └──────────────┬───────────────┘
        │  Tailwind + tokens                            │
        │  (thème repris du MVP)                        ▼
        │                                    ┌──────────────────┐
        │                                    │  PostgreSQL      │
        │                                    │  + Redis (cache) │
        │                                    └──────────────────┘
                                             couche paiement ⇄ agrégateur MoMo / carte
```

**3 surfaces**, un seul design system :
1. **Payeur** — mobile-first, `max-width:480px` (le MVP actuel).
2. **Back-office établissement** — desktop-dense (à concevoir, mêmes tokens).
3. **Super-admin abc pay** — desktop-dense (à concevoir).

## 2. Dépôt frontend — `abc-pay-web` (Next.js, App Router, TypeScript)

```
abc-pay-web/
├─ src/
│  ├─ app/
│  │  ├─ (payer)/            # espace payeur (mobile-first)
│  │  │   ├─ layout.tsx      # conteneur max-w-app, topbar, menu
│  │  │   ├─ page.tsx        # Home (grille 4 actions)
│  │  │   ├─ send/ receive/ pay/ tuition/ scan/ activity/ profile/
│  │  │   └─ (legal)/ faq/ terms/ privacy/ …
│  │  ├─ (establishment)/    # back-office établissement (desktop)
│  │  │   ├─ dashboard/ learners/ fees/ unpaid/ settlements/ reports/
│  │  ├─ (admin)/            # super-admin abc pay
│  │  │   ├─ establishments/ overview/ commissions/ integrations/
│  │  └─ layout.tsx          # next/font Sora + Inter → --font-sora / --font-inter
│  ├─ components/ui/         # KIT repris du MVP : Button, Card, ListRow, Chip,
│  │                         # Recap, Receipt, Toast, Menu, AmountInput, StatusPill…
│  ├─ components/tuition/    # étapes du parcours Tuition
│  ├─ lib/                   # api client (fetch), auth, formatters (fmt())
│  ├─ app/globals.css        # tokens Tailwind v4 (@theme) — SOURCE DE VÉRITÉ
│  ├─ proxy.ts               # CSP à nonce (ex-middleware, renommé en Next 16)
│  └─ types/                 # types partagés (miroir du contrat d'API)
├─ next.config.ts            # en-têtes de sécurité
└─ package.json
```

**Stack réelle installée** : Next.js 16 + React 19 + **Tailwind v4** (config CSS-first).
Les tokens exacts du HTML sont dans `abc-pay-web/src/app/globals.css` (bloc `@theme`) ;
les variables CSS (`var(--navy)`…) y restent aussi pour un portage 1:1.
Polices via `next/font/google` (Sora 700/800, Inter 400–700), auto-hébergées.
**Responsive** : on conserve le comportement du MVP — l'espace payeur reste
centré `max-w-app` sur desktop ; les surfaces admin passent en layouts larges.
Icônes : `lucide-react` (le MVP utilise déjà Lucide).

## 3. Dépôt backend — `abc-pay-api` (Laravel, PHP 8.3)

```
abc-pay-api/
├─ app/
│  ├─ Modules/               # découpage métier (cf. contrat d'API §Découpage)
│  │   ├─ Auth/  Academic/  Billing/  Payment/  Notifications/
│  │   ├─ Reconciliation/  Admin/
│  ├─ Payment/Gateways/      # PaymentGateway (interface) + Aggregator, Airtel…
│  ├─ Models/                # Eloquent (miroir du schéma)
│  └─ Http/Controllers/Api/
├─ database/migrations/      # dérivées de db/schema.sql
├─ routes/api.php            # versionné /v1
└─ config/
```

- **Auth** : Sanctum (tokens). OTP SMS pour payeurs, email+mot de passe (+2FA) pour staff.
- **Multi-tenant** : scope global par `establishment_id` (middleware + policies).
- **Paiement** : interface `PaymentGateway` → une implémentation **agrégateur** en Phase 1 ; webhook de confirmation + **job de réconciliation** périodique (désynchronisations).
- **Documents** : service de génération PDF (reçus numérotés + QR de vérification).
- **Sécurité** : chiffrement au repos des données sensibles, `audit_logs` append-only, principe des quatre yeux (annulations/remboursements).
- **Jobs planifiés** : rappels J-7/J-2, relances J0/J+3/J+7, consolidation nocturne, reversement.

## 4. Modèle de données
Voir **`db/schema.sql`** — 10 entités du cahier des charges étendues (users,
establishments, academic_years/terms/groups, learners, learner_guardians,
fee_types/schedules/items, installment_plans/installments, discounts,
transactions, payment_allocations, receipts, linked_accounts, settlements,
operator_integrations, notifications, audit_logs).

## 5. Contrat d'API
Voir **`docs/api-contract.md`** — REST versionné, 9 groupes d'endpoints alignés
sur les modules Laravel et les écrans du MVP.

## 5 bis. Sécurité
Voir **`docs/SECURITY.md`** — défense en profondeur (7 couches). Déjà implémenté :
en-têtes de sécurité (`SecurityHeaders`), CORS strict (`config/cors.php`), rate
limiters `api`/`auth`/`payment`/`webhook`, `ForceJsonResponse`, `SecureFormRequest`
(allowlist + `authorize()=false` par défaut), modèles Eloquent stricts, Sanctum ;
côté front : CSP à nonce (`proxy.ts`) + en-têtes (`next.config.ts`).

## 6. Design system (résumé — détail dans tailwind.config.ts)
- **Couleurs** : navy `#0F1B30/#16233C` · blue `#0F3E8A/#1857B8/#2D74D6/#DCEAFB` ·
  gold `#E08E00/#F5A623/#FFC24B` · ink `#101826` · gray `700/500/300/100` ·
  green `#1BA672` · red `#E5484D`.
- **Typo** : titres **Sora** (700/800, tracking -0.02em) ; texte **Inter**.
- **Rayons** : 11→26px, pills 100px. **CTA** : dégradé bleu `135deg #2D74D6→#0F3E8A`.
- **Frais** (MVP) : envoi 1,5 % · pay 2,5 % · tuition 2 % · tuition supérieur 3 %.

## 7. Prochaines étapes (après validation de l'architecture)
1. Scaffolder `abc-pay-web` (Next.js) avec les tokens + le kit de composants.
2. Scaffolder `abc-pay-api` (Laravel) + migrations depuis `schema.sql`.
3. Porter l'espace payeur (22 écrans) fidèlement, brancher sur l'API.
4. Concevoir back-office établissement + super-admin dans le même langage.
```
