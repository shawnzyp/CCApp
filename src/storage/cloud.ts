import { ref, get, onValue, update, serverTimestamp } from 'firebase/database';
import { db } from '../firebase';
import type { CloudHero, HeroDoc } from '../state/models';

export function heroPath(uid: string, heroId: string) {
  return `users/${uid}/heroes/${heroId}`;
}

export async function fetchCloudHero(uid: string, heroId: string): Promise<CloudHero | null> {
  const snap = await get(ref(db, heroPath(uid, heroId)));
  return snap.exists() ? (snap.val() as CloudHero) : null;
}

export function subscribeCloudHero(uid: string, heroId: string, cb: (val: CloudHero | null) => void) {
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
  const root = ref(db);

  const base = heroPath(uid, heroId);
  const updates: Record<string, any> = {};
  updates[`${base}/meta`] = { rev, updatedAt: serverTimestamp(), clientId };
  updates[`${base}/doc`] = doc;
  updates[`${base}/snapshots/${rev}`] = { savedAt: serverTimestamp(), reason, doc };

  await update(root, updates);
  return rev;
}

export type SnapshotEntry = {
  id: string;
  savedAt: number;
  reason: 'autosave' | 'manual' | 'snapshot';
  doc: HeroDoc;
};

function normalizeTimestamp(value: unknown) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  if (typeof value === 'object' && value && 'seconds' in value) {
    const seconds = (value as { seconds?: number }).seconds;
    if (typeof seconds === 'number') return seconds * 1000;
  }
  return 0;
}

export async function fetchHeroSnapshots(uid: string, heroId: string): Promise<SnapshotEntry[]> {
  const snap = await get(ref(db, `${heroPath(uid, heroId)}/snapshots`));
  if (!snap.exists()) return [];
  const val = snap.val() as Record<string, { savedAt: unknown; reason: SnapshotEntry['reason']; doc: HeroDoc }>;
  return Object.entries(val).map(([id, entry]) => ({
    id,
    savedAt: normalizeTimestamp(entry.savedAt),
    reason: entry.reason,
    doc: entry.doc
  }));
}
