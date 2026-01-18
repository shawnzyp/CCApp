# Catalyst Core Tracker (v0.1)

Minimal character tracker for Catalyst Core. Offline-first autosave (local) plus cloud sync (Firebase RTDB).

## Setup
1) Copy `.env.example` to `.env.local` and fill Firebase values.
2) In Firebase Console:
   - Enable Authentication (Google Sign-In recommended).
   - Create or use an existing Realtime Database.
3) Install and run:

```bash
npm install
npm run dev
```

## Deploy (GitHub Pages)
- Build: `npm run build`
- Deploy `dist/` to your Pages branch or use a GitHub Action.

## Realtime Database rules (starter)
Use authenticated per-user isolation.

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    }
  }
}
```

## Data model
Everything a player needs is inside `HeroDoc`. There is also an import path for legacy RTDB exports.
