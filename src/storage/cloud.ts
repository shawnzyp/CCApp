import { ref, get, onValue, update, serverTimestamp } from 'firebase/database';
import { requireDb } from '../firebase';
import type { CloudHero, HeroDoc } from '../state/models';

export function heroPath(uid: string, heroId: string) {
  return `users/${uid}/heroes/${heroId}`;
}

export type HeroListItem = { heroId: string; heroName: string };

export async function listCloudHeroes(uid: string): Promise<HeroListItem[]> {
  const db = requireDb();
  const snap = await get(ref(db, `users/${uid}/heroes`));
  if (!snap.exists()) return [];
  const val = snap.val() as Record<string, any>;
  return Object.entries(val)
    .map(([heroId, v]) => ({
      heroId,
      heroName: v?.doc?.meta?.heroName || heroId
    }))
    .sort((a, b) => a.heroName.localeCompare(b.heroName));
}

export async function fetchCloudHero(uid: string, heroId: string): Promise<CloudHero | null> {
  const db = requireDb();
  const snap = await get(ref(db, heroPath(uid, heroId)));
  return snap.exists() ? (snap.val() as CloudHero) : null;
}

export function subscribeCloudHero(uid: string, heroId: string, cb: (val: CloudHero | null) => void) {
  const db = requireDb();
  const r = ref(db, heroPath(uid, heroId));
  return onValue(r, (snap) => {
    cb(snap.exists() ? (snap.val() as CloudHero) : null);
  });
}

export async function pushCloudHero(args: {
  uid: string;
  heroId: string;
  doc: HeroDoc;
  clientId: string;
  reason: 'autosave' | 'manual' | 'snapshot';
}) {
  const { uid, heroId, doc, clientId, reason } = args;
  const rev = Date.now();
  const db = requireDb();
  const root = ref(db);

  const base = heroPath(uid, heroId);
  const updates: Record<string, any> = {};
  updates[`${base}/meta`] = { rev, updatedAt: serverTimestamp(), clientId };
  updates[`${base}/doc`] = doc;
  updates[`${base}/snapshots/${rev}`] = { savedAt: serverTimestamp(), reason, doc };

  await update(root, updates);
  return rev;
}
