# abc pay — Contexte du projet

Photo d'ensemble du projet à un instant T : vision, utilisateurs, état de chaque
partie, décisions clés et pourquoi, flux, questions ouvertes.
_(Compléments : `CLAUDE.md` = comment travailler · `HISTORY.md` = chronologie · `docs/` = détails.)_

## 1. Vision
Plateforme web de paiement mobile pour la **République Démocratique du Congo**.
Slogan : « The Connected Money » — Payer, Envoyer, Recevoir simplement.
**Niche de lancement** : paiement des **frais de scolarité et académiques** (« Tuition »)
pour écoles (primaire/secondaire) et enseignement supérieur. Multi-opérateur obligatoire :
Airtel Money, Orange Money, M-Pesa (Vodacom), Africell Money + carte + virement.
Modèle **B2B2C** : on vend à l'établissement, qui amène des centaines de parents/étudiants.

## 2. Utilisateurs & espaces
- **Payeur** (parent, étudiant, tiers/sponsor) — paie, suit son solde, reçoit des reçus.
- **Établissement** (direction, comptable, caissier, consultation) — gère apprenants, frais, impayés, reversements.
- **Super-admin abc pay** — supervise les établissements, commissions, intégrations, fraude.

## 3. État actuel (front)
| Espace | URL | État |
|---|---|---|
| Payeur | `/` | Accueil + **Tuition branché API** ; Paiements (11 catégories), Envoyer, Recevoir, Scan, Activité, Profil ; pages info/légales |
| Back-office | `/etablissement` | Dashboard, Apprenants, Frais, Reversements **réels** ; autres sections = stubs |
| Super-admin | `/admin` | Vue d'ensemble, Établissements, Intégrations **réels** ; autres = stubs |

**Pas encore** : authentification (aucun login), protection des routes, vrais flux de paiement
des catégories (toast pour l'instant), vrai QR de « Recevoir », états loading/erreur/vide, tests.

## 4. État actuel (backend)
- **Tranche Tuition réelle et testée** : `GET /api/v1/establishments`, `POST /payments/quote`, `POST /payments` → reçu. Validation stricte, CORS OK, montants recalculés serveur.
- DB dev = **sqlite** (migrée + seedée). Cible = **PostgreSQL**.
- Reste : implémenter les 16 modules selon `docs/BACKEND-ARCHITECTURE.md` (à commencer par l'auth).

## 5. Décisions clés (et pourquoi)
- **Web app d'abord** (pas d'app native) → time-to-market, compatibilité bas/moyen de gamme RDC.
- **Next.js + Laravel + PostgreSQL** → séparation front/API, écosystème mûr, choix de l'utilisateur.
- **Tailwind + tokens du MVP** → fidélité visuelle absolue, impossible de sortir de la charte.
- **Disposition « à la Claude »** (rail d'icônes desktop) → demandée explicitement ; menu mobile conservé.
- **Agrégateur de paiement en Phase 1** derrière une couche `PaymentGateway` → lancement rapide, bascule vers intégrations directes plus tard sans réécriture.
- **Sécurité maximale** (fintech) → défense en profondeur, 4 yeux, idempotence, webhooks signés, audit immuable.

## 6. Flux principal (paiement Tuition)
```
Payeur → choisit établissement (API) → renseigne élève/étudiant + montant
      → /payments/quote (frais recalculés serveur) → confirme
      → /payments (Idempotency-Key) → transaction confirmée + reçu généré
      → (à venir) webhook opérateur signé remplace la confirmation immédiate de démo
```

## 7. Questions ouvertes / à trancher
- **Devise d'affichage** au lancement : USD (comme le MVP), CDF, ou double selon l'établissement ?
- **Instance PostgreSQL** locale dispo ? (pour basculer depuis sqlite et générer les migrations complètes)
- **Agrégateur** retenu en RDC (accès sandbox à obtenir dès que possible — dépendance critique du planning).
- Statut réglementaire **BCC** (à cadrer juridiquement avant prod commerciale).

## 8. Fichiers de référence
- `CLAUDE.md` — guide de travail + pièges. `HISTORY.md` — journal.
- `docs/ARCHITECTURE.md`, `docs/BACKEND-ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/api-contract.md`.
- `db/schema.sql` — schéma PostgreSQL cible. Source visuelle : le MVP HTML.
