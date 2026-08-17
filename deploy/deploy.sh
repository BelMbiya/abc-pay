#!/usr/bin/env bash
# ============================================================================
#  Déploiement / mise à jour d'abc pay sur le VPS (à relancer à chaque release).
#  Usage :  bash /var/www/abcpay/deploy/deploy.sh
#  Prérequis : première installation déjà faite (voir deploy/README.md).
# ============================================================================
set -euo pipefail

ROOT=/var/www/abcpay
cd "$ROOT"

echo "▶ Récupération du code…"
git pull --ff-only

# ----------------------------- API (Laravel) --------------------------------
echo "▶ API : dépendances + migrations + caches…"
cd "$ROOT/abc-pay-api"
composer install --no-dev --optimize-autoloader --no-interaction
php artisan migrate --force
php artisan optimize        # config + route + view cache
sudo systemctl reload php8.4-fpm

# ------------------------------ FRONT (Next) --------------------------------
echo "▶ Front : dépendances + build + reload…"
cd "$ROOT/abc-pay-web"
npm ci
npm run build
pm2 reload abcpay-web --update-env

echo "✅ Déploiement terminé."
