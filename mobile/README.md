# JAH Audio mobile (Expo)

EAS project id: `a8a27ce5-c0f6-47df-bc3f-f9efa53c268c` (in `app.json` → `extra.eas.projectId`)

API and media URLs are set in `src/api.ts`:

```ts
export const API_URL = "https://jahavl.hivelyhr.com";
export const WEB_URL = "https://jahavl.hivelyhr.com";
```

## Connect Expo account (one time)

```bash
cd mobile
npx eas-cli@latest login
npx eas-cli@latest init --id a8a27ce5-c0f6-47df-bc3f-f9efa53c268c
```

## Quick test on a phone (Expo Go)

1. Install Expo Go (App Store / Play Store).
2. From `mobile/`: `npx expo start` (or `npx expo start --tunnel` off same Wi‑Fi).
3. Scan the QR code.
4. App talks to `https://jahavl.hivelyhr.com` — site must be up.

## Build installable Android APK

Needs an Expo account (`npx eas login`).

```bash
cd mobile
npm install
npx eas-cli@latest build -p android --profile preview
```

When the build finishes, EAS gives a download URL for the `.apk`. Install on the phone (allow unknown sources).

Local APK (needs Android SDK):

```bash
npx eas-cli@latest build -p android --profile preview --local
```

## Build iOS IPA (not an APK)

iOS has no APK. You need an Apple Developer account for device installs.

```bash
npx eas-cli@latest build -p ios --profile preview
```

Then install via TestFlight, or Ad Hoc if you registered the device UDID in EAS.

## Demo users

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@example.com | password |
| Sales | sales@example.com | password |
| Dealer | dealer@example.com | password |
| Client | client@example.com | password |
