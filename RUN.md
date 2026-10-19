# Run the JAH demo

From `jaha_live_revamp`. Redis should already be running on port 6379. The database is SQLite at `backend/database/database.sqlite`. Do not start MySQL.

## Backend

```bash
cd backend
php artisan serve --host=127.0.0.1 --port=8000
```

API: http://127.0.0.1:8000

## Frontend

```bash
cd frontend
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Site: http://127.0.0.1:3000

## Live server

This is a Server-Sent Events stream, not a WebSocket server. Run it in its own process so it does not block the API.

```bash
cd backend
PHP_CLI_SERVER_WORKERS=8 php artisan serve --host=127.0.0.1 --port=8002 --no-reload
```

The website uses `NEXT_PUBLIC_LIVE_URL`, which defaults to http://127.0.0.1:8002. The phone app polls the API on port 8000 instead of this stream.

## Phone

```bash
cd mobile
npx expo start
```

## Sign-in

These are the only local passwords. Public catalog prices are samples and are not the live jahavl.com list.

| Name | Email | Role | Password |
| --- | --- | --- | --- |
| Avery Admin | admin@example.com | admin | password |
| Sam Sales | sales@example.com | sales | password |
| Dana Dealer | dealer@example.com | dealer | password |
| Casey Client | client@example.com | client | password |
| Jordan Hardison | jhardison@jahavl.com | admin | JahaTest@2026 |
| Justin Hardison | justin@jahavl.com | admin | JahaTest@2026 |
| Andrew Harrison | aharrison@jahavl.com | sales | JahaTest@2026 |
| Justin Test | justin2@jahavl.com | dealer | JahaTest@2026 |
| Matthew Gille | matthew@cfbcstuart.com | client | JahaTest@2026 |

Imported accounts below kept their original live password. That password is not in this file.

| Name | Email | Role |
| --- | --- | --- |
| Adam Flake | arrow.proavl@gmail.com | client |
| Kieran Kuphal | brath@example.org | client |
| Clay Meares | clay@atlantaproav.com | client |
| Jazmyn Emard | crist.shea@example.org | client |
| Dan Ferentzy | dan@tc3.church | client |
| David Gonzales | davidgman11@gmail.com | client |
| David Henry | daviqh@gmail.com | client |
| Carolina Jacobi | dejuan38@example.net | client |
| Harrison Petrina | harrisonp@canvas.church | client |
| Hassan jamil | hassanjamil0802@yahoo.com | client |
| new client | hassansfida@gmail.com | client |
| Alison Metz | hodkiewicz.ella@example.com | client |
| John Smith | jsmith@gmail.com | client |
| Northplace Church | justin3@jahavl.com | client |
| Baylee Bradtke | kihn.derrick@example.net | client |
| Arianna Gibson | krajcik.eleonore@example.com | client |
| Michael Hall | mhall@cornerstonebrandon.org | client |
| Outside Client | outside-client@example.com | client |
| Steve Biles | sbiles@lutzfbc.org | client |
| client-001 self | self1@gmail.com | client |
| Dr. Ignatius Hermann III | upton.roslyn@example.com | client |
| Cielo Heller | xhamill@example.com | client |
| Anthony Stowell | anthony@nexosav.com | dealer |
| Avery Lane | avery.lane.dealer@example.com | dealer |
| Brian Poole | brian@solutionstride.com | dealer |
| Jordan Hardison | jordanahardison@gmail.com | dealer |
| Neil Klein | nadia51@example.com | dealer |
| Miss Clarissa Grant III | parisian.karlee@example.com | dealer |
| Lacey Halvorson DVM | uohara@example.net | dealer |
| Bruce O Leary | boleary@jahavl.com | sales |
| Mr. Korbin Stokes | ckub@example.net | sales |
| Adeline Langworth V | edgardo.denesik@example.net | sales |
| Test Specialiist | jahaudiosales@gmail.com | sales |
| Waleed Bhatti | waleed.akbarbhatti@outlook.com | sales |
