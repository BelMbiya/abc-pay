# abc pay — Architecture backend en microservices (proposition)

Proposition d'architecture **microservices**, orientée sécurité par **confinement**
et **isolation**. À valider avant toute implémentation.
Alternative au monolithe modulaire décrit dans `BACKEND-ARCHITECTURE.md`.

## 0. Ce que les microservices apportent (et ce qu'ils n'apportent pas)
**Apportent** : confinement du rayon d'explosion (une brèche reste dans un service),
isolation des données (DB par service), moindre privilège par service, scaling ciblé
(le paiement scale sans le reste), déploiements indépendants.
**N'apportent PAS gratuitement** : ils *augmentent* la surface réseau (plus d'appels à
chiffrer/authentifier), imposent la cohérence éventuelle (sagas, pas de transaction ACID
inter-service) et un lourd socle d'exploitation. La sécurité vient des **patterns** (zero-trust,
segmentation, secrets managés), pas du découpage en soi.

## 1. Découpage en services (bounded contexts)
On regroupe par **frontière de sécurité et de scaling** — surtout pas 1 service = 1 table.

| Service | Responsabilité | Sensibilité |
|---|---|---|
| **API Gateway / BFF** | Entrée unique : routage, validation token, rate limit, WAF | Exposé (durci) |
| **Identity** | Auth, OTP, 2FA, comptes, rôles, émission JWT | Critique |
| **Tenancy** | Établissements, onboarding, **KYB** | Critique (PII/légal) |
| **Academic** | Années, classes/filières, apprenants, import | Standard |
| **Billing** | Types de frais, barèmes, postes de frais, échéanciers | Standard |
| **Payment** | Initiation, **gateways opérateurs**, webhooks, idempotence, états | **Ultra-critique** (secrets, argent) |
| **Ledger & Reconciliation** | Écritures financières (append-only), réconciliation, reversements | **Ultra-critique** (source de vérité $) |
| **Document** | Reçus PDF, QR, attestations | Standard |
| **Notification** | SMS / email / push | Standard |
| **Reporting** | Read models, tableaux de bord (CQRS read) | Standard (lecture) |
| **Risk / Fraud** | Règles, alertes, plafonds | Critique |
| **Support** | Tickets, litiges, remboursements (4 yeux) | Critique |
| **Audit** | Journal immuable centralisé (WORM) | Critique |

> ~13 services. Pour démarrer, on peut en fusionner certains (Document+Notification,
> Reporting dans le read model) et n'isoler durement que **Identity**, **Payment**, **Ledger**.

## 2. Vue d'ensemble
```
                     Internet (payeur / établissement / admin)
                                   │  HTTPS
                          ┌────────▼────────┐
                          │  API Gateway    │  WAF · authЗ JWT · rate limit · routage
                          └───┬───┬───┬─────┘
       mTLS (service mesh)    │   │   │
   ┌───────────┬──────────────┼───┼───┼───────────────┬───────────┐
   ▼           ▼              ▼   ▼   ▼                ▼           ▼
Identity   Tenancy       Academic Billing  ...      Support     Reporting
   │           │              │      │                            ▲ (read models)
   └───────────┴──────┬───────┴──────┴────────── Event Bus ───────┘
              ZONE DURCIE (privée)  │  (Kafka / RabbitMQ, outbox pattern)
        ┌──────────────┬───────────┴───────────┬──────────────┐
        ▼              ▼                        ▼              ▼
     Payment  ◄──►  Ledger &            Document        Audit (WORM)
   (secrets Vault) Reconciliation      Notification
        │
        └──► Opérateurs MoMo / carte (egress allowlist uniquement)
```

## 3. Communication
- **Client → système** : REST/JSON via l'**API Gateway** seulement (services internes jamais exposés).
- **Service → service (synchrone)** : REST ou **gRPC** en interne, **mTLS** obligatoire (service mesh).
- **Asynchrone (par défaut)** : **bus d'événements** (Kafka ou RabbitMQ). Ex. `PaymentConfirmed` →
  consommé par Ledger, Document, Notification, Audit. Découplage fort.
- **Transactions distribuées** : **Saga** avec compensations (jamais de 2PC). Ex. paiement :
  `Payment.reserve → Ledger.write → Document.issue` ; en cas d'échec, compensation (`Payment.void`).
- **Fiabilité des événements** : **Transactional Outbox** (l'événement est écrit dans la même
  transaction DB que l'état, puis publié) → pas d'événement perdu ni fantôme.

## 4. Données
- **Une base par service** (PostgreSQL) — **aucune** base partagée. C'est l'isolation clé.
- Pas de jointure inter-service : on duplique en **read models** (CQRS) alimentés par événements.
- **Ledger** = grand livre **append-only**, source de vérité financière (jamais d'UPDATE/DELETE).
- Idempotence par service (clé d'idempotence + table de déduplication).

## 5. Sécurité (le cœur de la demande)
- **Zero-trust inter-services** : mTLS partout, identité de service (**SPIFFE/SPIRE**), aucun appel implicitement fiable. Autorisation par service (politiques du mesh).
- **Segmentation réseau** : Payment + Ledger + secrets dans une **zone privée durcie**, sans accès Internet sauf **egress allowlist** vers les opérateurs. Le reste ne peut pas atteindre cette zone sans politique explicite.
- **Secrets** : **HashiCorp Vault** — secrets dynamiques, par service, rotation automatique. Les **clés d'API opérateurs ne quittent jamais** la zone Payment.
- **API Gateway durci** = seul ingress : WAF (OWASP CRS), rate limiting, validation de schéma, terminaison TLS, validation JWT. Les services internes n'ont **pas** d'IP publique.
- **Moindre privilège** : chaque service a un compte DB et des droits minimaux → **confinement du rayon d'explosion** (compromettre Notification ne donne pas accès au Ledger).
- **Audit centralisé immuable** (stockage WORM), corrélé par trace-id.
- **Paiement** : idempotence, **webhooks signés** (HMAC + anti-rejeu + IP allowlist), machine à états stricte, PCI-DSS délégué (jamais de PAN stocké).
- **Chiffrement** : TLS en transit (y compris interne), chiffrement au repos par service, PII chiffrée applicativement.

## 6. Infrastructure & exploitation
- **Conteneurs Docker** + orchestration **Kubernetes** (ou plus léger au départ : Docker Compose → Nomad).
- **Service mesh** (Istio ou Linkerd) : mTLS automatique, politiques de trafic, observabilité.
- **Observabilité** : tracing distribué **OpenTelemetry** (indispensable en microservices), logs centralisés, métriques par service, health checks + probes.
- **Résilience** : circuit breakers, retries à backoff, timeouts, bulkheads, dead-letter queues.
- **CI/CD par service**, déploiements indépendants (canary/blue-green), IaC (Terraform).
- **Environnements** dev / recette / prod isolés ; secrets distincts par environnement.

## 7. Stack proposée (pour capitaliser sur Laravel)
- Services domaine en **Laravel** (l'équipe maîtrise) — un dépôt (ou module) par service, chacun sa DB.
- **API Gateway** : Kong/Traefik, **ou** un gateway Laravel/Node léger.
- Bus : **RabbitMQ** (plus simple à opérer que Kafka au lancement).
- Secrets : **Vault** ; Mesh : **Linkerd** (plus léger qu'Istio) ; Conteneurs : Docker + K8s managé.

## 8. Compromis (honnête)
| Axe | Monolithe modulaire | Microservices |
|---|---|---|
| Sécurité (confinement) | Moyen (1 process) | **Élevé** (isolation forte) |
| Surface d'attaque réseau | Faible | **Plus grande** (inter-services) |
| Complexité / exploitation | Faible | **Élevée** (mesh, K8s, tracing, sagas) |
| Cohérence des données | ACID simple | Éventuelle (sagas, outbox) |
| Time-to-market (Phase 1) | **Rapide** | Plus lent |
| Équipe requise | Petite | **DevOps + plus étoffée** |
| Scaling ciblé | Global | **Par service** |

## 9. Recommandation — hybride « strangler »
Plutôt que tout éclater d'emblée (risqué avec le planning et une petite équipe) :
1. **Garder le monolithe modulaire** actuel (déjà bâti, modules découplés).
2. **Extraire d'abord les 2–3 services vraiment sensibles** derrière l'API Gateway, avec **DB dédiée** et **zone durcie** : **Payment**, **Ledger**, et **Identity/Secrets (Vault)**.
   → On obtient **l'essentiel du gain sécurité (confinement) là où ça compte**, sans payer la taxe microservices sur tout le système.
3. **Extraire le reste progressivement** (pattern *strangler*) quand le volume et l'équipe le justifient — les modules du monolithe sont déjà des frontières nettes, prêts à devenir des services.

## 10. Ce que ça change vs l'existant
- Le code déjà écrit (modules `app/Modules`, services `app/Services`) **reste valable** : un module bien isolé devient un service sans réécriture du domaine.
- S'ajoutent : API Gateway, bus d'événements + outbox, DB par service, mesh mTLS + Vault, tracing.
- La tranche **Tuition/Payment** déjà faite serait le **premier candidat à l'extraction**.
