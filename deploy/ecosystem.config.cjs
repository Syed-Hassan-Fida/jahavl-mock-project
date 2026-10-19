// Run from the repo root after the frontend has been built:
//   pm2 start deploy/ecosystem.config.cjs
//   pm2 save
//
// Restart only these names. Do not run `pm2 restart all`.
// Ports are bound to 127.0.0.1. Nginx is the only public entry.

const root = "/var/www/jaha-revamp";

module.exports = {
  apps: [
    {
      name: "jaha-web",
      cwd: `${root}/frontend`,
      script: "npm",
      args: "run start -- --hostname 127.0.0.1 --port 3015",
      env: {
        NODE_ENV: "production",
        PORT: "3015",
      },
    },
    {
      name: "jaha-api",
      cwd: `${root}/backend`,
      script: "php",
      args: "artisan serve --host=127.0.0.1 --port=8015",
      interpreter: "none",
      env: {
        PHP_CLI_SERVER_WORKERS: "8",
      },
    },
    {
      name: "jaha-live",
      cwd: `${root}/backend`,
      script: "php",
      args: "artisan serve --host=127.0.0.1 --port=8016 --no-reload",
      interpreter: "none",
      env: {
        PHP_CLI_SERVER_WORKERS: "8",
      },
    },
  ],
};
