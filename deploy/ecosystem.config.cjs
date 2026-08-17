// PM2 — garde le front Next.js (SSR) en vie et le relance au reboot.
// Lancé depuis /var/www/abcpay :  pm2 start deploy/ecosystem.config.cjs
//
// NB : les NEXT_PUBLIC_* sont inlinées au build (.env.production), pas ici.
// Ici on ne fixe que l'environnement d'exécution du serveur Node.
module.exports = {
  apps: [
    {
      name: "abcpay-web",
      cwd: "/var/www/abcpay/abc-pay-web",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "600M",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
  ],
};
