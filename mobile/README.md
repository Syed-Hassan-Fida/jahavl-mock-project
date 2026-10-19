# JAH Audio mobile (Expo)

API and media URLs are set in `src/api.ts`:

```ts
export const API_URL = "https://jahavl.hivelyhr.com";
export const WEB_URL = "https://jahavl.hivelyhr.com";
```

## Quick test on a phone (no APK)

1. Phone and Mac on same network, or use Expo tunnel.
2. From `mobile/`: `npx expo start`
3. Scan QR with Expo Go (Android) or Camera (iOS).
4. App talks to the live site above — backend must be up.

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
