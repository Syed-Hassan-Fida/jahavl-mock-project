# Deploy JAH revamp on an existing DigitalOcean VPS

This guide adds one site next to the projects already on the VPS. It does not edit their nginx files, their databases, or their PM2 apps.

The public site is Next.js. The API is Laravel. Live updates are a Server-Sent Events stream on its own PHP process, not a WebSocket server. Nginx is the only process that listens on ports 80 and 443 for this domain. The app processes listen on `127.0.0.1` only.

Replace `jah.example.com` with the domain or subdomain you will use for this project. A subdomain is the safest choice when other sites already use the apex domain.

## What stays untouched

- Do not edit `/etc/nginx/nginx.conf` except to confirm it already includes `sites-enabled`.
- Do not add `default_server` to this site. That would steal requests from other projects.
- Do not run `pm2 restart all`, `pm2 delete all`, or `pm2 kill`.
- Do not run `FLUSHALL` on Redis, and do not change the MySQL root account.
- Do not point this app at an existing database.

## 1. Pick three free local ports

Other projects may already use 3000, 8000, or 8002. This setup uses:

| Process | Port | PM2 name |
| --- | --- | --- |
| Next.js | 3015 | `jaha-web` |
| Laravel API | 8015 | `jaha-api` |
| Live stream | 8016 | `jaha-live` |

On the VPS:

```bash
ss -lntp | grep -E '3015|8015|8016' || echo "ports are free"
```

If any line prints, pick a different free port and change it in all three places: `deploy/ecosystem.config.cjs`, `deploy/jaha-revamp.nginx.conf`, and the frontend build variables below.

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
sudo mkdir -p /var/www/jaha-revamp
sudo chown "$USER":"$USER" /var/www/jaha-revamp
```

Copy the `jaha_live_revamp` folder there, or clone it, so the tree is:

```text
/var/www/jaha-revamp/backend
/var/www/jaha-revamp/frontend
/var/www/jaha-revamp/deploy
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

`jaha_revamp.*` does not grant access to your other databases.

The local demo uses SQLite. `php artisan migrate` creates empty tables on MySQL. It does not copy the SQLite catalog, users, or quotes. Running `php artisan db:seed` creates the four `example.com` demo accounts with the password `password`. Do not seed that on a public server unless you change those passwords before anyone can reach the site.

## 5. Configure the API

```bash
cd /var/www/jaha-revamp/backend
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
REDIS_PREFIX=jaha-revamp-

SESSION_DRIVER=database
QUEUE_CONNECTION=database
```

If Redis is not installed, set `CACHE_READ_STORE=database`.

`phpredis` must be enabled (`php -m | grep redis`). If the module is missing and you do not want to install it, set `REDIS_CLIENT=predis` only after requiring `predis/predis`, or leave the read cache on `database`.

Then:

```bash
php artisan migrate --force
php artisan storage:link
php artisan config:cache
php artisan route:cache
```

`storage:link` only creates a link inside this project.

## 6. Build the website

`NEXT_PUBLIC_*` values are baked in when Next.js builds. Set them to the public domain, not to `127.0.0.1`. A visitor's browser cannot open a port that is bound only on the VPS.

```bash
cd /var/www/jaha-revamp/frontend
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

If you change those variables later, run `npm run build` again before restarting `jaha-web`.

## 7. Start the three processes with PM2

From `/var/www/jaha-revamp`:

```bash
pm2 start deploy/ecosystem.config.cjs
pm2 save
```

If `pm2 startup` is already installed for your other apps, do not run it again. `pm2 save` is enough to remember `jaha-web`, `jaha-api`, and `jaha-live`.

Check them:

```bash
pm2 status
curl -s -o /dev/null -w "web %{http_code}\n" http://127.0.0.1:3015
curl -s -o /dev/null -w "api %{http_code}\n" http://127.0.0.1:8015/api/v1/catalog
curl -s -o /dev/null -w "live %{http_code}\n" http://127.0.0.1:8016/api/v1/live
```

The catalog route should return `200`. The live route should return `401` when called without a token. That means the stream is up.

Later restarts, by name only:

```bash
pm2 restart jaha-web
pm2 restart jaha-api
pm2 restart jaha-live
```

## 8. Nginx site

The ready file is `deploy/jaha-revamp.nginx.conf`. Copy it and edit `server_name` first.

```bash
sudo cp /var/www/jaha-revamp/deploy/jaha-revamp.nginx.conf /etc/nginx/sites-available/jaha-revamp
sudo nano /etc/nginx/sites-available/jaha-revamp
sudo ln -s /etc/nginx/sites-available/jaha-revamp /etc/nginx/sites-enabled/jaha-revamp
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
        proxy_pass http://127.0.0.1:8016;
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
        proxy_pass http://127.0.0.1:8015;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    location / {
        proxy_pass http://127.0.0.1:3015;
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

Pass only this hostname. Certbot will add the 443 server block to `/etc/nginx/sites-available/jaha-revamp`. It should not rewrite your other site files.

After the certificate exists, open `https://jah.example.com` and `https://jah.example.com/api/v1/catalog`.

## 10. Confirm the other projects

```bash
pm2 status
sudo nginx -t
```

Open one of the existing sites in a browser. If it still loads, this site did not take its server block. If an old site fails, the usual cause is a duplicated `server_name` or a `default_server` flag. Remove those from the JAH file only, then `sudo nginx -t` and `sudo systemctl reload nginx`.

## Updating later

```bash
cd /var/www/jaha-revamp
# pull or copy the new code

cd backend
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache
pm2 restart jaha-api
pm2 restart jaha-live

cd ../frontend
npm ci
npm run build
pm2 restart jaha-web
```

## Phone app

This guide does not publish the Expo app. The phone client in `mobile/src/api.ts` still calls `http://127.0.0.1:8000` and loads images from `http://127.0.0.1:3000`. Those values are for the machine running the demo. Point them at `https://jah.example.com` only when you build a phone release.
