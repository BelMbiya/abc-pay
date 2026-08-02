# abc pay — Guide projet (lu par Claude Code)

Plateforme web de paiement pour la **RDC**, niche de lancement = paiement des frais de
scolarité (« Tuition »). Monorepo : un front Next.js + une API Laravel.

## Repos
- `abc-pay-web/` — **Next.js 16 + React 19 + Tailwind v4** (front des 3 espaces).
- `abc-pay-api/` — **Laravel 13 (PHP 8.4) + Sanctum** (API REST `/api/v1`).
- `docs/` — architecture, sécurité, contrat d'API. `db/schema.sql` — schéma PostgreSQL cible.

## Les 3 espaces (front)
- **Payeur** (parent/étudiant) : `/` + `/tuition`, `/paiements`, `/envoyer`, `/recevoir`, `/scan`, `/activite`, `/profil`, pages info/légales.
- **Back-office établissement** : `/etablissement/*`.
- **Super-admin abc pay** : `/admin/*`.
Disposition : desktop = rail d'icônes à gauche (style Claude) ; mobile = topbar + menu.

## Commandes
```bash
# Front
cd abc-pay-web && npm run dev        # http://localhost:3000
npm run build && npx tsc --noEmit && npx eslint src
# API
cd abc-pay-api && php artisan serve --port=8000
php artisan migrate && php artisan db:seed
```

## Règles de design (NON négociables)
- **Source de vérité visuelle** = `C:\Users\hp\Downloads\8 abc-pay-webapp v1.mvp19.html`.
- Couleurs, rayons, polices **Sora** (titres) + **Inter** (texte) = tokens dans
  `abc-pay-web/src/app/globals.css` (`@theme`). **Ne jamais coder une couleur en dur.**
- Kit de composants réutilisable : `src/components/ui/`. Layouts : `src/components/{layout,backoffice,admin}/`.

## Sécurité (fintech — voir docs/SECURITY.md)
- API : `SecurityHeaders` + `ForceJsonResponse`, CORS strict (`config/cors.php`),
  rate limiters `api/auth/payment/webhook`, `SecureFormRequest` (allowlist, `authorize()=false` par défaut).
- Front : CSP à nonce dans `src/proxy.ts`, en-têtes dans `next.config.ts`.
- Paiement : montants **recalculés serveur**, `Idempotency-Key`, webhooks signés.

## Pièges connus (IMPORTANT)
- **Next 16** : le middleware s'appelle **`proxy.ts`** (pas `middleware.ts`). Lire `node_modules/next/dist/docs/` avant de coder du Next.
- **Tailwind v4** : `max-w-app` vient du token `--container-app` (namespace `--container-*`).
- **`tsc --noEmit` pendant `next dev`** remonte de FAUSSES erreurs (`.next/dev/types`).
  Check fiable : stopper le dev → `rm -rf .next` → `npm run build` + `npx tsc`.
- **Un seul `npm run dev` à la fois** : des serveurs orphelins + `rm -rf .next` provoquent des *Internal Server Error*.
- **Build = webpack** (`next build --webpack`, déjà dans package.json) : le build Turbopack **crashe** le worker au prérendu statique sur Windows (`STATUS_STACK_BUFFER_OVERRUN`). `next dev` (Turbopack) reste OK.
- **Laravel 13** : modèles avec attributs `#[Fillable]`/`#[Hidden]` ; PK **uuid** via `HasUuids`.

## État (voir HISTORY.md)
Front : 3 espaces + parcours Tuition branché sur l'API réelle (avec repli mock). Auth non encore implémentée.
Backend : tranche Tuition (établissements/paiement/reçu) réelle ; reste à implémenter selon `docs/BACKEND-ARCHITECTURE.md`.

## Langue
Tout en **français** (UI, contenu, communication).
