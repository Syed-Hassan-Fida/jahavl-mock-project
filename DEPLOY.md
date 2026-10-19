# Deploy jahavl-mock-project on an existing DigitalOcean VPS

This guide adds one site next to the projects already on the VPS. It does not edit their nginx files, their databases, or their PM2 apps.

App root on the VPS: `/var/www/jahavl-mock-project`

The public site is Next.js. The API is Laravel. Live updates are a Server-Sent Events stream on its own PHP process, not a WebSocket server. Nginx is the only process that listens on ports 80 and 443 for this domain. The app processes listen on `127.0.0.1` only.

Replace `jah.example.com` with the domain or subdomain you will use for this project. A subdomain is the safest choice when other sites already use the apex domain.

## What stays untouched

- Do not edit `/etc/nginx/nginx.conf` except to confirm it already includes `sites-enabled`.
- Do not add `default_server` to this site. That would steal requests from other projects.
- Do not run `pm2 restart all`, `pm2 delete all`, or `pm2 kill`.
- Do not run `FLUSHALL` on Redis, and do not change the MySQL root account.
- Do not point this app at an existing database (do not reuse `jahavl_database` or any other live DB).

## 1. Ports (chosen to avoid occupied VPS listeners)

Snapshot of ports already in use on this VPS includes: `3050-3054`, `3100-3111`, `3088`, `3110`, `4416`, `5180`, `8090`, `8765`, `8787`, plus `80`/`443`/`22`/`3306`.

This project uses free ports outside those ranges:

| Process | Port | PM2 name |
| --- | --- | --- |
| Next.js | **3125** | `jahavl-mock-web` |
| Laravel API | **8125** | `jahavl-mock-api` |
| Live stream | **8126** | `jahavl-mock-live` |

On the VPS, confirm they are still free before starting:

```bash
ss -lntp | grep -E '3125|8125|8126' || echo "ports are free"
```

If any line prints, pick different free ports and change them in all three places: `deploy/ecosystem.config.cjs`, `deploy/jahavl-mock-project.nginx.conf`, and re-check nginx after editing.

## 2. Check what is already installed

```bash
nginx -v
pm2 -v
mysql --version
node -v
php -v
redis-cli ping || true
```

You need PHP 8.3 or newer for this Laravel app, and Node.js 20 or 22 for the Next.js build. If the system `php` command is older because another site needs it, install PHP 8.3 beside it and call `php8.3` in the PM2 file. Do not change the default PHP used by the other sites.

Redis is optional. If `redis-cli ping` prints `PONG`, Redis is already running. This app will use database numbers 8 and 9 so it does not share cache keys with other apps. If Redis is not installed, the API still runs and falls back to MySQL for the read cache. Install Redis only if you want the live wake:

```bash
sudo apt-get update
sudo apt-get install -y redis-server
sudo systemctl enable --now redis-server
```

Do not change `bind` or the Redis password used by other apps. Leave Redis on `127.0.0.1:6379`.

Composer, if it is missing:

```bash
php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
sudo php composer-setup.php --install-dir=/usr/local/bin --filename=composer
rm composer-setup.php
```

## 3. Put the code in its own directory

```bash
sudo mkdir -p /var/www/jahavl-mock-project
sudo chown "$USER":"$USER" /var/www/jahavl-mock-project
```

Copy or clone so the tree is:

```text
/var/www/jahavl-mock-project/backend
/var/www/jahavl-mock-project/frontend
/var/www/jahavl-mock-project/deploy
```

Do not place it inside another project's directory.

## 4. Create one MySQL database

Log in with the MySQL account you already use for administration. Create a new database and a user that can see only that database.

```sql
CREATE DATABASE jaha_revamp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'jaha_revamp'@'127.0.0.1' IDENTIFIED BY 'choose-a-long-password';
GRANT ALL PRIVILEGES ON jaha_revamp.* TO 'jaha_revamp'@'127.0.0.1';
FLUSH PRIVILEGES;
```

`jaha_revamp.*` does not grant access to your other databases. Do not point this app at the legacy `jahavl_database`.

`php artisan migrate` creates empty tables on MySQL. Running `php artisan db:seed` creates the four `example.com` demo accounts with the password `password`. Do not seed that on a public server unless you change those passwords before anyone can reach the site.

## 5. Configure the API

```bash
cd /var/www/jahavl-mock-project/backend
composer install --no-dev --optimize-autoloader
cp .env.example .env
php artisan key:generate
```

Edit `.env`. Keep the file on the server. Do not commit it.

```env
APP_NAME=JAH
APP_ENV=production
APP_DEBUG=false
APP_URL=https://jah.example.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=jaha_revamp
DB_USERNAME=jaha_revamp
DB_PASSWORD=choose-a-long-password

CACHE_STORE=database
CACHE_READ_STORE=redis
CACHE_READ_FALLBACK=database

REDIS_CLIENT=phpredis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_DB=8
REDIS_CACHE_DB=9
REDIS_PREFIX=jahavl-mock-

SESSION_DRIVER=database
QUEUE_CONNECTION=database
```

If Redis is not installed, set `CACHE_READ_STORE=database`.

`phpredis` must be enabled (`php -m | grep redis`). If the module is missing and you do not want to install it, set `REDIS_CLIENT=predis` only after requiring `predis/predis`, or leave the read cache on `database`.

Then:

```bash
php artisan migrate --force
php artisan db:seed --force
php artisan db:seed --class=WorkflowLinksSeeder --force
php artisan storage:link
php artisan config:cache
php artisan route:cache
```

Also set CORS for your public domain in `config/cors.php` (`allowed_origins`), then run `php artisan config:cache` again.

`storage:link` only creates a link inside this project.

## 6. Build the website

`NEXT_PUBLIC_*` values are baked in when Next.js builds. Set them to the public domain, not to `127.0.0.1`. A visitor's browser cannot open a port that is bound only on the VPS.

```bash
cd /var/www/jahavl-mock-project/frontend
npm ci
```

Create `frontend/.env.production`:

```env
NEXT_PUBLIC_SITE_URL=https://jah.example.com
NEXT_PUBLIC_API_URL=https://jah.example.com
NEXT_PUBLIC_LIVE_URL=https://jah.example.com
```

Both the API and the live stream use the same domain. Nginx sends `/api/v1/live` to the stream process and every other `/api/` request to the API process.

```bash
npm run build
```

If you change those variables later, run `npm run build` again before restarting `jahavl-mock-web`.

## 7. Start the three processes with PM2

From `/var/www/jahavl-mock-project`:

```bash
pm2 start deploy/ecosystem.config.cjs
pm2 save
```

If `pm2 startup` is already installed for your other apps, do not run it again. `pm2 save` is enough to remember `jahavl-mock-web`, `jahavl-mock-api`, and `jahavl-mock-live`.

Check them:

```bash
pm2 status
curl -s -o /dev/null -w "web %{http_code}\n" http://127.0.0.1:3125
curl -s -o /dev/null -w "api %{http_code}\n" http://127.0.0.1:8125/api/v1/catalog
curl -s -o /dev/null -w "live %{http_code}\n" http://127.0.0.1:8126/api/v1/live
```

The catalog route should return `200`. The live route should return `401` when called without a token. That means the stream is up.

Later restarts, by name only:

```bash
pm2 restart jahavl-mock-web
pm2 restart jahavl-mock-api
pm2 restart jahavl-mock-live
```

## 8. Nginx site

The ready file is `deploy/jahavl-mock-project.nginx.conf`. Copy it and edit `server_name` first.

```bash
sudo cp /var/www/jahavl-mock-project/deploy/jahavl-mock-project.nginx.conf /etc/nginx/sites-available/jahavl-mock-project
sudo nano /etc/nginx/sites-available/jahavl-mock-project
sudo ln -s /etc/nginx/sites-available/jahavl-mock-project /etc/nginx/sites-enabled/jahavl-mock-project
sudo nginx -t
sudo systemctl reload nginx
```

`reload` keeps the other sites up. Do not `restart` nginx unless `reload` fails.

Full site file:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name jah.example.com;

    client_max_body_size 12m;

    location /api/v1/live {
        proxy_pass http://127.0.0.1:8126;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 60s;
        gzip off;
        add_header X-Accel-Buffering no;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8125;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    location / {
        proxy_pass http://127.0.0.1:3125;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

`/api/v1/live` is listed before `/api/` on purpose. Nginx uses the longer match for the stream and leaves normal API calls on the API process. The stream must not be buffered, or the browser will sit until the whole response ends.

Point DNS for `jah.example.com` at this VPS before the certificate step. Confirm no other file in `sites-enabled` already uses that exact `server_name`.

## 9. HTTPS for this domain only

```bash
sudo certbot --nginx -d jah.example.com
```

Pass only this hostname. Certbot will add the 443 server block to `/etc/nginx/sites-available/jahavl-mock-project`. It should not rewrite your other site files.

After the certificate exists, open `https://jah.example.com` and `https://jah.example.com/api/v1/catalog`.

## 10. Confirm the other projects

```bash
pm2 status
sudo nginx -t
```

Open one of the existing sites in a browser. If it still loads, this site did not take its server block. If an old site fails, the usual cause is a duplicated `server_name` or a `default_server` flag. Remove those from the jahavl-mock-project file only, then `sudo nginx -t` and `sudo systemctl reload nginx`.

## Updating later

```bash
cd /var/www/jahavl-mock-project
# pull or copy the new code

cd backend
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache
pm2 restart jahavl-mock-api
pm2 restart jahavl-mock-live

cd ../frontend
npm ci
npm run build
pm2 restart jahavl-mock-web
```

## Phone app

This guide does not publish the Expo app. The phone client in `mobile/src/api.ts` still calls `http://127.0.0.1:8000` and loads images from `http://127.0.0.1:3000`. Those values are for the machine running the demo. Point them at `https://jah.example.com` only when you build a phone release.
