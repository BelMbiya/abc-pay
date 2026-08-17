# Déploiement abc pay — VPS Hostinger (tout-en-un)

Guide pas-à-pas pour mettre **le front (Next.js)** et **l'API (Laravel + PostgreSQL)**
en ligne sur un seul VPS. Testé pour **Ubuntu 24.04 LTS**.

- Front SSR (`next start`) derrière Nginx → `https://app.abcpay.cd`
- API Laravel (PHP 8.4-FPM) derrière Nginx → `https://api.abcpay.cd`
- PostgreSQL 16 en local, PM2 pour Node, Certbot pour HTTPS.

> Remplace partout `app.abcpay.cd` / `api.abcpay.cd` par tes vrais sous-domaines,
> et tous les `CHANGE_ME…` par des secrets forts.

---

## 0. Prérequis

1. **VPS Hostinger KVM** (min. **KVM 2 : 2 vCPU / 8 Go**), OS **Ubuntu 24.04**.
2. Un **domaine** (ex. `abcpay.cd`) avec 2 enregistrements **DNS A** pointant vers l'IP du VPS :
   - `app.abcpay.cd  →  <IP_DU_VPS>`
   - `api.abcpay.cd  →  <IP_DU_VPS>`
3. Le code poussé sur un **dépôt Git** que le VPS peut cloner (GitHub/GitLab).
   Prévois un accès (deploy key SSH, ou HTTPS + token).

---

## 1. Connexion + durcissement de base

```bash
# En root (depuis le hPanel Hostinger ou ssh root@IP)
adduser deploy
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy   # réutilise ta clé SSH

# Pare-feu : n'ouvre que SSH + HTTP + HTTPS
apt update && apt install -y ufw fail2ban
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Bascule sur l'utilisateur deploy pour la suite
su - deploy
```

> À partir d'ici, tout se fait en tant que **`deploy`** (avec `sudo` au besoin).

---

## 2. Installer la stack

```bash
# --- Outils de base ---
sudo apt update && sudo apt install -y git unzip curl ca-certificates

# --- Nginx ---
sudo apt install -y nginx

# --- PHP 8.4 + extensions (PPA ondrej) ---
sudo apt install -y software-properties-common
sudo add-apt-repository -y ppa:ondrej/php
sudo apt update
sudo apt install -y php8.4-fpm php8.4-cli php8.4-pgsql php8.4-mbstring \
  php8.4-bcmath php8.4-xml php8.4-curl php8.4-zip php8.4-intl

# --- Composer ---
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# --- Node.js 20 LTS + PM2 ---
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

# --- PostgreSQL 16 ---
sudo apt install -y postgresql postgresql-contrib

# Vérifs
php -v && node -v && psql --version && nginx -v
```

---

## 3. Base de données PostgreSQL

```bash
sudo -u postgres psql <<'SQL'
CREATE USER abcpay WITH PASSWORD 'CHANGE_ME_MOT_DE_PASSE_FORT';
CREATE DATABASE abcpay OWNER abcpay;
\q
SQL
```

> Postgres n'écoute qu'en local (127.0.0.1) par défaut sur Ubuntu — parfait, ne l'expose pas.

---

## 4. Récupérer le code

```bash
sudo mkdir -p /var/www/abcpay
sudo chown -R deploy:deploy /var/www/abcpay
git clone <URL_DE_TON_DEPOT> /var/www/abcpay
cd /var/www/abcpay
# Structure attendue : /var/www/abcpay/abc-pay-web  et  /var/www/abcpay/abc-pay-api
```

---

## 5. Déployer l'API (Laravel)

```bash
cd /var/www/abcpay/abc-pay-api

# Dépendances (prod)
composer install --no-dev --optimize-autoloader --no-interaction

# Fichier d'environnement
cp /var/www/abcpay/deploy/api.env.production.example .env
nano .env        # ⤷ renseigne DB_PASSWORD, CORS_ALLOWED_ORIGINS, APP_URL, MAIL_*
php artisan key:generate

# Clés JWT RS256 (générées SUR le serveur, hors dépôt)
mkdir -p storage/app/keys
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out storage/app/keys/jwt_private.pem
openssl rsa -in storage/app/keys/jwt_private.pem -pubout -out storage/app/keys/jwt_public.pem
chmod 600 storage/app/keys/jwt_private.pem

# Permissions : storage + cache accessibles à PHP-FPM (www-data) ET à deploy (git)
sudo chown -R deploy:www-data storage bootstrap/cache
sudo chmod -R 775 storage bootstrap/cache

# Schéma (structure des tables)
php artisan migrate --force

# ⚠️ NE PAS lancer `db:seed` en prod : il crée des établissements de démo ET des
#    comptes (admin + staff) tous avec le mot de passe « password ». En prod, on
#    crée UNIQUEMENT le super-admin, avec un vrai mot de passe :
php artisan tinker --execute="\App\Models\Admin::updateOrCreate(['email'=>'admin@abcpay.cd'], ['name'=>'Super Admin','password'=>\Illuminate\Support\Facades\Hash::make('CHANGE_ME_MDP_ADMIN_FORT'),'role'=>'super_admin']);"

# Caches de prod
php artisan optimize
```

> **Comptes de démo** : `php artisan db:seed` est réservé à un environnement de test
> (il pose partout le mot de passe « password »). En prod, reste sur la commande
> `tinker` ci-dessus. Les vrais établissements se créent ensuite via l'espace
> super-admin (`/admin`).

> **HTTPS derrière Nginx** : `URL::forceScheme('https')` est déjà actif en prod
> (`AppServiceProvider`). Optionnel mais propre : fais confiance au proxy dans
> `bootstrap/app.php` → `$middleware->trustProxies(at: ['127.0.0.1']);`

---

## 6. Déployer le front (Next.js)

```bash
cd /var/www/abcpay/abc-pay-web

# Environnement — DOIT exister AVANT le build (NEXT_PUBLIC_* inlinées au build)
cp /var/www/abcpay/deploy/web.env.production.example .env.production
nano .env.production   # ⤷ NEXT_PUBLIC_API_URL=https://api.abcpay.cd (+ Firebase si activé)

npm ci
npm run build          # build webpack (déjà configuré dans package.json)

# Lancement + persistance via PM2
pm2 start /var/www/abcpay/deploy/ecosystem.config.cjs
pm2 save
pm2 startup            # ⤷ COPIE-COLLE la commande `sudo env ...` qu'il affiche, puis relance `pm2 save`
```

Vérifie : `curl -I http://127.0.0.1:3000` doit répondre `200`.

---

## 7. Nginx (2 sous-domaines)

```bash
# Copie les vhosts fournis
sudo cp /var/www/abcpay/deploy/nginx/api.abcpay.cd.conf /etc/nginx/sites-available/api.abcpay.cd
sudo cp /var/www/abcpay/deploy/nginx/app.abcpay.cd.conf /etc/nginx/sites-available/app.abcpay.cd

# (si tes domaines diffèrent, édite server_name + root dans ces 2 fichiers)

# Active-les
sudo ln -s /etc/nginx/sites-available/api.abcpay.cd /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/app.abcpay.cd /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t && sudo systemctl reload nginx
```

---

## 8. HTTPS (Let's Encrypt / Certbot)

```bash
sudo snap install core && sudo snap refresh core
sudo snap install --classic certbot
sudo ln -sf /snap/bin/certbot /usr/bin/certbot

# Génère les certificats et configure automatiquement les blocs 443 + redirection
sudo certbot --nginx -d app.abcpay.cd -d api.abcpay.cd \
  --redirect --agree-tos -m ton-email@exemple.cd --no-eff-email

# Le renouvellement auto est déjà planifié. Test :
sudo certbot renew --dry-run
```

---

## 9. Vérifications finales

```bash
# API en ligne (doit renvoyer du JSON)
curl -s https://api.abcpay.cd/api/v1/settings ; echo
curl -s https://api.abcpay.cd/api/v1/stats/public ; echo

# Front en ligne
curl -I https://app.abcpay.cd/bienvenue

# Depuis un navigateur :
#   https://app.abcpay.cd/bienvenue        → la landing, chiffres réels affichés
#   https://app.abcpay.cd/verifier-recu    → vérification de reçu
#   https://app.abcpay.cd/connexion?nouveau=1 → « Créer ton compte »
```

**Check-list « ça marche vraiment » :**
- [ ] La landing charge et le bandeau chiffres se remplit (front → API OK = CORS + CSP bons).
- [ ] Un paiement Tuition génère un reçu **avec QR** ; le QR scanné ouvre `/verifier-recu` et affiche ✅.
- [ ] Le formulaire démo enregistre un lead (visible via l'API `/admin/leads`).
- [ ] Aucune erreur dans `pm2 logs abcpay-web` ni `tail -f abc-pay-api/storage/logs/laravel.log`.

---

## 10. Mises à jour (à chaque release)

```bash
bash /var/www/abcpay/deploy/deploy.sh
```
(git pull → composer + migrate + caches API → npm build + reload front.)

---

## 11. Exploitation / dépannage

```bash
pm2 status                      # état du front
pm2 logs abcpay-web             # logs front
pm2 restart abcpay-web

sudo systemctl status php8.4-fpm nginx postgresql
sudo tail -f /var/log/nginx/*.error.log
tail -f /var/www/abcpay/abc-pay-api/storage/logs/laravel.log
```

**Sauvegardes DB (recommandé — mettre en cron) :**
```bash
pg_dump -U abcpay abcpay | gzip > ~/backup-abcpay-$(date +%F).sql.gz
```

---

## 12. À prévoir ensuite (pas requis pour démarrer)

- **OTP réel** : activer Firebase Phone Auth (`NEXT_PUBLIC_FIREBASE_ENABLED=true` + clés +
  numéros/reCAPTCHA configurés dans la console Firebase), **rebuild** le front.
- **Redis** : `CACHE_STORE=redis` + `QUEUE_CONNECTION=redis` (rate-limiters + cache plus rapides).
- **Workers de file + scheduler** (quand webhooks opérateurs / reversements arrivent) :
  Supervisor pour `php artisan queue:work` + cron `* * * * * php artisan schedule:run`.
- **SMTP** réel pour les e-mails (reçus, notifications).
- **Conformité BCC** : héberger chez un prestataire audité + documenter (HTTPS de bout en bout OK ici).
