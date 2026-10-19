// Run from the repo root after the frontend has been built:
//   pm2 start deploy/ecosystem.config.cjs
//   pm2 save
//
// Restart only these names. Do not run `pm2 restart all`.
// Ports are bound to 127.0.0.1. Nginx is the only public entry.
//
// Chosen to avoid occupied VPS ports (3050-3111 Next apps, 8090, 5180, etc.):
//   Next.js 3125 | Laravel API 8125 | Live SSE 8126

const root = "/var/www/jahavl-mock-project";

module.exports = {
  apps: [
    {
      name: "jahavl-mock-web",
      cwd: `${root}/frontend`,
      script: "npm",
      args: "run start -- --hostname 127.0.0.1 --port 3125",
      env: {
        NODE_ENV: "production",
        PORT: "3125",
      },
    },
    {
      name: "jahavl-mock-api",
      cwd: `${root}/backend`,
      script: "php",
      args: "artisan serve --host=127.0.0.1 --port=8125",
      interpreter: "none",
      env: {
        PHP_CLI_SERVER_WORKERS: "8",
      },
    },
    {
      name: "jahavl-mock-live",
      cwd: `${root}/backend`,
      script: "php",
      args: "artisan serve --host=127.0.0.1 --port=8126 --no-reload",
      interpreter: "none",
      env: {
        PHP_CLI_SERVER_WORKERS: "8",
      },
    },
  ],
};
