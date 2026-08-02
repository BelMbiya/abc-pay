-- =====================================================================
--  abc pay — Schéma PostgreSQL (Phase 1 : Web App / niche Tuition)
--  Dérivé du cahier des charges (§24) + de la logique du prototype MVP.
--  Multi-tenant : chaque table métier porte establishment_id.
--  Conventions : snake_case, PK uuid, timestamps, soft-delete via deleted_at.
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()

-- ------- ENUMS ---------------------------------------------------------
CREATE TYPE establishment_type AS ENUM
  ('maternelle','primaire','secondaire','institut_superieur','universite');
CREATE TYPE academic_level     AS ENUM ('petit','secondaire','superieur'); -- cf. fieldSets du MVP
CREATE TYPE currency_code      AS ENUM ('CDF','USD');
CREATE TYPE learner_status     AS ENUM ('actif','transfere','diplome','abandon','redoublant');
CREATE TYPE relation_type      AS ENUM ('parent','tuteur','etudiant','proche','sponsor');
CREATE TYPE payment_channel    AS ENUM ('mpesa','airtel_money','orange_money','africell_money','carte','virement','especes');
CREATE TYPE tx_status          AS ENUM ('initiee','en_attente','confirmee','echouee','expiree','remboursee');
CREATE TYPE fee_frequency      AS ENUM ('unique','mensuel','trimestriel','semestriel','par_credit');
CREATE TYPE installment_model  AS ENUM ('une_fois','echelonne','libre_plafonne','mensuel_auto');
CREATE TYPE settlement_freq    AS ENUM ('quotidien','hebdomadaire','sur_demande');
CREATE TYPE staff_role         AS ENUM ('direction','comptable','caissier','consultation');

-- ======================================================================
--  SOCLE PLATEFORME : comptes, tenants, rôles, sécurité
-- ======================================================================

-- Comptes utilisateurs (payeurs ET personnel établissement ET super-admin)
CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone         varchar(20) UNIQUE,           -- +243… (login OTP payeur)
  email         varchar(160) UNIQUE,          -- login établissement / diaspora
  password_hash text,
  full_name     varchar(160),
  is_super_admin boolean NOT NULL DEFAULT false,
  two_factor_enabled boolean NOT NULL DEFAULT false,
  phone_verified_at timestamptz,
  email_verified_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

-- Établissement = tenant
CREATE TABLE establishments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          varchar(200) NOT NULL,
  slug          varchar(80) UNIQUE,           -- nomecole.abcpay.cd
  merchant_code varchar(40) UNIQUE NOT NULL,  -- ABC-TUITION-xxx (cf. MVP)
  type          establishment_type NOT NULL,
  level         academic_level NOT NULL,      -- adapte écrans & terminologie
  rccm          varchar(60),
  ministry_agreement varchar(120),            -- EPST ou ESU
  city          varchar(120),
  province      varchar(120),
  logo_url      text,
  contact_email varchar(160),
  contact_phone varchar(20),
  -- config financière
  payout_channel payment_channel,             -- compte de reversement
  payout_account varchar(120),
  settlement_frequency settlement_freq NOT NULL DEFAULT 'hebdomadaire',
  default_currency currency_code NOT NULL DEFAULT 'CDF',
  fx_rate_usd_cdf numeric(12,2),              -- si double devise
  commission_rate numeric(5,4) NOT NULL DEFAULT 0.02,   -- barème par établissement
  commission_paid_by varchar(12) NOT NULL DEFAULT 'etablissement', -- 'etablissement' | 'payeur'
  kyb_status    varchar(20) NOT NULL DEFAULT 'pending', -- pending|verified|suspended
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

-- Personnel établissement (RBAC interne : direction/comptable/caissier/consultation)
CREATE TABLE establishment_staff (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES establishments(id),
  user_id          uuid NOT NULL REFERENCES users(id),
  role             staff_role NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (establishment_id, user_id)
);

-- ======================================================================
--  STRUCTURE ACADÉMIQUE & APPRENANTS
-- ======================================================================
CREATE TABLE academic_years (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES establishments(id),
  label            varchar(20) NOT NULL,       -- ex. 2026-2027
  starts_on        date NOT NULL,
  ends_on          date NOT NULL,
  is_current       boolean NOT NULL DEFAULT false
);

-- Périodes de paiement (trimestres / semestres / quadrimestres)
CREATE TABLE academic_terms (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id uuid NOT NULL REFERENCES academic_years(id),
  label            varchar(40) NOT NULL,       -- Trimestre 1 / Semestre 1
  starts_on        date,
  ends_on          date,
  ordinal          smallint NOT NULL
);

-- Classe (école) OU filière/promotion (supérieur) — table unifiée
CREATE TABLE academic_groups (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES establishments(id),
  academic_year_id uuid NOT NULL REFERENCES academic_years(id),
  kind             varchar(12) NOT NULL,       -- 'classe' | 'promotion'
  name             varchar(120) NOT NULL,      -- 4ème secondaire / Bac 2
  section          varchar(80),                -- option (scientifique…)  — secondaire
  faculty          varchar(120),               -- supérieur
  cycle            varchar(40)                 -- supérieur (Licence/Master)
);

-- Apprenant (élève / étudiant)
CREATE TABLE learners (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES establishments(id),
  academic_group_id uuid REFERENCES academic_groups(id),
  abcpay_ref       varchar(30) UNIQUE NOT NULL, -- id abc pay stable (indépendant du matricule)
  internal_matricule varchar(60),               -- matricule interne établissement
  last_name        varchar(80) NOT NULL,        -- Nom
  middle_name      varchar(80),                 -- Post-nom
  first_name       varchar(80) NOT NULL,        -- Prénom
  status           learner_status NOT NULL DEFAULT 'actif',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  deleted_at       timestamptz
);
CREATE INDEX ON learners (establishment_id, academic_group_id);

-- Rattachement apprenant <-> payeur (un parent peut avoir plusieurs enfants,
-- y compris dans des établissements différents → relation N–N)
CREATE TABLE learner_guardians (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id  uuid NOT NULL REFERENCES learners(id),
  user_id     uuid NOT NULL REFERENCES users(id),
  relation    relation_type NOT NULL DEFAULT 'parent',
  is_primary  boolean NOT NULL DEFAULT false,
  UNIQUE (learner_id, user_id)
);

-- ======================================================================
--  STRUCTURATION DES FRAIS & BARÈMES
-- ======================================================================
-- Catalogue des types de frais par établissement (inscription, minerval,
-- frais annexes, par crédit, examen, pénalité…)
CREATE TABLE fee_types (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES establishments(id),
  name             varchar(80) NOT NULL,        -- "Minerval", "Frais d'examen"…
  frequency        fee_frequency NOT NULL DEFAULT 'trimestriel',
  is_penalty       boolean NOT NULL DEFAULT false,
  is_optional      boolean NOT NULL DEFAULT false -- cantine, transport, labo…
);

-- Barème : montant d'un type de frais pour un groupe donné
CREATE TABLE fee_schedules (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES establishments(id),
  academic_year_id uuid NOT NULL REFERENCES academic_years(id),
  academic_group_id uuid REFERENCES academic_groups(id),  -- null = tout l'établissement
  fee_type_id      uuid NOT NULL REFERENCES fee_types(id),
  amount           numeric(14,2) NOT NULL,
  currency         currency_code NOT NULL DEFAULT 'CDF',
  per_credit       boolean NOT NULL DEFAULT false          -- supérieur : montant × crédits
);

-- Postes de frais imputés à un apprenant (plan de facturation individuel)
CREATE TABLE fee_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES establishments(id),
  learner_id       uuid NOT NULL REFERENCES learners(id),
  fee_type_id      uuid NOT NULL REFERENCES fee_types(id),
  academic_term_id uuid REFERENCES academic_terms(id),
  label            varchar(120) NOT NULL,
  amount_due       numeric(14,2) NOT NULL,
  amount_paid      numeric(14,2) NOT NULL DEFAULT 0,
  currency         currency_code NOT NULL DEFAULT 'CDF',
  due_date         date,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON fee_items (learner_id);

-- Échéanciers & tranches (échelonné / libre plafonné / mensuel auto)
CREATE TABLE installment_plans (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_item_id      uuid NOT NULL REFERENCES fee_items(id),
  model            installment_model NOT NULL
);
CREATE TABLE installments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installment_plan_id uuid NOT NULL REFERENCES installment_plans(id),
  ordinal          smallint NOT NULL,
  amount_expected  numeric(14,2) NOT NULL,
  due_date         date NOT NULL
);

-- Remises / exonérations (bourse, fratrie) — validation par rôle habilité
CREATE TABLE discounts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id       uuid NOT NULL REFERENCES learners(id),
  fee_item_id      uuid REFERENCES fee_items(id),
  kind             varchar(12) NOT NULL,        -- 'montant' | 'pourcentage'
  value            numeric(14,4) NOT NULL,
  reason           text NOT NULL,
  approved_by      uuid REFERENCES users(id),
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ======================================================================
--  PAIEMENTS, REÇUS
-- ======================================================================
CREATE TABLE transactions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES establishments(id),
  learner_id       uuid NOT NULL REFERENCES learners(id),
  payer_user_id    uuid REFERENCES users(id),   -- null = paiement tiers non enregistré
  payer_name       varchar(160),                -- si tiers/sponsor
  payer_relation   relation_type,
  channel          payment_channel NOT NULL,
  amount           numeric(14,2) NOT NULL,       -- montant net facture
  service_fee      numeric(14,2) NOT NULL DEFAULT 0, -- frais de service (si répercuté)
  commission       numeric(14,2) NOT NULL DEFAULT 0, -- commission abc pay
  currency         currency_code NOT NULL DEFAULT 'CDF',
  status           tx_status NOT NULL DEFAULT 'initiee',
  operator_ref     varchar(120),                 -- référence transaction opérateur
  is_manual        boolean NOT NULL DEFAULT false,-- encaissement direct établissement (hors commission)
  reference        varchar(120),                 -- réf saisie (REF-2026-…)
  confirmed_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON transactions (establishment_id, status, created_at);
CREATE INDEX ON transactions (learner_id);

-- Imputation d'une transaction (partielle) sur un ou plusieurs postes de frais
CREATE TABLE payment_allocations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES transactions(id),
  fee_item_id    uuid NOT NULL REFERENCES fee_items(id),
  amount         numeric(14,2) NOT NULL
);

CREATE TABLE receipts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL UNIQUE REFERENCES transactions(id),
  number         varchar(40) UNIQUE NOT NULL,    -- numérotation séquentielle
  pdf_url        text,
  qr_token       varchar(64) UNIQUE NOT NULL,    -- vérification d'authenticité
  issued_at      timestamptz NOT NULL DEFAULT now()
);

-- Comptes mobile money / banque reliés au compte payeur (écran "Comptes liés")
CREATE TABLE linked_accounts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id),
  channel    payment_channel NOT NULL,
  account_ref varchar(120) NOT NULL,             -- numéro masqué
  is_active  boolean NOT NULL DEFAULT true
);

-- ======================================================================
--  RÉCONCILIATION & REVERSEMENT
-- ======================================================================
CREATE TABLE settlements (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES establishments(id),
  period_start     date NOT NULL,
  period_end       date NOT NULL,
  gross_amount     numeric(16,2) NOT NULL,
  commission_total numeric(16,2) NOT NULL,
  net_amount       numeric(16,2) NOT NULL,       -- montant reversé
  channel          payment_channel NOT NULL,
  status           varchar(20) NOT NULL DEFAULT 'pending', -- pending|paid|failed
  statement_url    text,
  paid_at          timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE settlement_transactions (
  settlement_id  uuid NOT NULL REFERENCES settlements(id),
  transaction_id uuid NOT NULL REFERENCES transactions(id),
  PRIMARY KEY (settlement_id, transaction_id)
);

-- ======================================================================
--  INTÉGRATIONS, NOTIFICATIONS, AUDIT (transverses)
-- ======================================================================
CREATE TABLE operator_integrations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel      payment_channel NOT NULL,
  environment  varchar(12) NOT NULL DEFAULT 'sandbox', -- sandbox|production
  is_healthy   boolean NOT NULL DEFAULT true,
  last_checked_at timestamptz
);

CREATE TABLE notifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES users(id),
  channel      varchar(10) NOT NULL,            -- sms|email|push
  template     varchar(60) NOT NULL,            -- confirmation|rappel_j7|relance_j3…
  payload      jsonb,
  sent_at      timestamptz,
  status       varchar(20) NOT NULL DEFAULT 'queued'
);

-- Journal d'audit IMMUABLE (append-only) de toute opération financière
CREATE TABLE audit_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid REFERENCES establishments(id),
  actor_user_id uuid REFERENCES users(id),
  action       varchar(80) NOT NULL,            -- fee.create, barème.update, tx.cancel, settlement.pay…
  entity_type  varchar(60),
  entity_id    uuid,
  before       jsonb,
  after        jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON audit_logs (establishment_id, created_at);
