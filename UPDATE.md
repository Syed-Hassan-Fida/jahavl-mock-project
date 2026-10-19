# Update commands (production VPS)

App root: `/var/www/jahavl-mock-project`  
Public site: `https://jahavl.hivelyhr.com`  
PM2: `jahavl-mock-web` (3125) · `jahavl-mock-api` (8125) · `jahavl-mock-live` (8126)

Always pull/copy code first, then run only the section you changed.

## Backend changed

```bash
cd /var/www/jahavl-mock-project/backend
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:clear
php artisan config:cache
php artisan route:cache
pm2 restart jahavl-mock-api jahavl-mock-live
```

## Frontend changed

```bash
cd /var/www/jahavl-mock-project/frontend
# keep .env.production pointing at https://jahavl.hivelyhr.com
npm ci
npm run build
pm2 restart jahavl-mock-web
```

## Both changed

```bash
cd /var/www/jahavl-mock-project/backend
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:clear && php artisan config:cache && php artisan route:cache
pm2 restart jahavl-mock-api jahavl-mock-live

cd ../frontend
npm ci && npm run build
pm2 restart jahavl-mock-web
```

## Smoke test

```bash
curl -s -o /dev/null -w "web %{http_code}\n" http://127.0.0.1:3125/
curl -s -o /dev/null -w "api %{http_code}\n" http://127.0.0.1:8125/api/v1/catalog
curl -s -o /dev/null -w "live %{http_code}\n" http://127.0.0.1:8126/api/v1/live
curl -s -o /dev/null -w "public %{http_code}\n" https://jahavl.hivelyhr.com/
```

## Mobile app rebuild (local Mac, not VPS)

After changing `mobile/src/api.ts` or app code:

```bash
cd mobile
npx eas build -p android --profile preview   # APK
npx eas build -p ios --profile preview       # IPA (Apple account required)
```

Demo logins: `admin@example.com` / `sales@example.com` / `dealer@example.com` / `client@example.com` — password `password`.
