# Jaha Live revamp

Scaffold only. Feature work has not started. Do not build pages, APIs, or the admin dashboard until that work is explicitly approved.

Research for this scaffold lives in the existing project notes:

- `/Users/mac/Desktop/interview/jaha_live_updated/.notes/07-revamp-specification.md`
- `/Users/mac/Desktop/interview/jaha_live_updated/.notes/08-market-and-ownership.md`
- `/Users/mac/Desktop/interview/jaha_live_updated/.notes/09-live-site-pages.md`

## Live site coverage

On 2026-10-10, `https://www.jahavl.com/` had no sitemap. **31 public URLs returned HTTP 200** (30 distinct screens, because `/` and `/index` match). **18 templates.** Thirteen URLs are the single `product-details` template.

Those public templates, plus the logged-in client, dealer, sales, and admin areas in the current Laravel app, are the coverage list for this revamp. Dead live links that must be replaced, not copied: `/dealer-crm/my-account.php` and `/client-crm/my-account.php` (both 404). `/products` returns an empty 200. Every checked public title is `Home - JAH`.

## Layout

| Path | What it is now |
| --- | --- |
| `backend/` | Laravel **13.35** API skeleton. SQLite. Catalog and quote tables, factories, and a seeder. No public product API yet. |
| `frontend/` | Next.js App Router + TypeScript + Tailwind. Default starter page only. |
| `mobile/` | Expo SDK 57, React Native 0.86, TypeScript. Default starter only. |

Laravel 13 is the current `laravel/laravel` release used by `composer create-project`. The earlier spec named Laravel 12 because that is what the legacy app was upgraded to. This new app is on 13 unless you want it pinned back.

## Fake accounts

`php artisan migrate --seed` from `backend/` has already been run. Shared password: `password`.

| Role | Email |
| --- | --- |
| admin | admin@example.com |
| sales | sales@example.com |
| dealer | dealer@example.com |
| client | client@example.com |

The seeder also creates extra sales, dealer, and client users, 3 categories, 12 series, 36 products, and 4 quotes. All names and prices are Faker data, not the live customer database.

## What is running

- API: http://127.0.0.1:8000
- Site: http://127.0.0.1:3000

Public pages: home, `/catalog/led`, `/catalog/lighting`, `/catalog/audio`, series, product (with list price and JSON-LD), dealers, policies, contact. The LED catalog includes a 16:9 wall planner.

Sign in at `/login` with `admin@example.com` / `password` to open `/admin` (pipeline by status and by LED, lighting, and audio). `client@example.com` can open `/account` and is refused analytics. Dealer net price is returned by the API only for admin, sales, and dealer tokens.

The Expo app reads `GET /api/v1/catalog` from `127.0.0.1:8000`.

Still ahead: assignment-scoped sales access, Stripe, Reverb, quote editing, and the rest of the authenticated workflows.
