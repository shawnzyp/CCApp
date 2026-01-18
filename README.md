# Catalyst Core Character Tracker (CCApp)

Minimal, offline-first character tracker for Catalyst Core.

Design goals:
- Everything the table needs is digital: combat resources, conditions, saves, skills, powers, signatures, gear, rep meters, notes.
- Data safety first: local autosave (IndexedDB) plus cloud autosave (Firebase Realtime Database).
- No fancy UI, just fast inputs.

## What this tracks
- Combat: HP, SP, TC, speed, passive perception, CAP used, death saves (mode + mod + success/fail), conditions.
- Abilities: STR/DEX/CON/INT/WIS/CHA, skill proficiencies (18), saving throw proficiencies (6), XP, level, proficiency bonus.
- Powers: editable power cards + signature moves, cooldown/uses fields, narrative descriptions.
- Gear: inventory, equipped armor/shield/utility, credits.
- Story: identity, origin fields, backstory, session notes, faction reputation meters.

## Setup
1) Copy `.env.example` to `.env.local` and fill in Firebase values.
2) In Firebase Console:
   - Enable Authentication (Google Sign-In is the default in this repo).
   - Add your GitHub Pages domain under Authorized domains (example: `shawnzyp.github.io`).
   - Create or use an existing Realtime Database.
3) Install and run:

```bash
npm install
npm run dev
```

## Deploy (GitHub Pages)
This repo includes a GitHub Pages workflow at `.github/workflows/deploy.yml`.

1) In the repo settings: Settings -> Pages -> Source: GitHub Actions.
2) Push to `main`. The workflow will build and deploy `dist/`.

Vite base is set to `/CCApp/` for project-site deployment at:
`https://shawnzyp.github.io/CCApp/`

## Realtime Database rules (starter)
This app stores data per user under `users/<uid>/heroes/<heroId>`.

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    }
  }
}
```

## Files you will touch most
- `src/state/models.ts`: data model
- `src/state/defaults.ts`: new character defaults
- `src/state/syncEngine.ts`: autosave + cloud sync scheduler
- `src/storage/cloud.ts`: RTDB read/write and snapshots
