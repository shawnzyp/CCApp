import { debounce } from '../lib/debounce';
import { loadLocalHero, saveLocalHero, listLocalHeroes } from '../storage/local';
import { fetchCloudHero, subscribeCloudHero, pushCloudHero, listCloudHeroes, type HeroListItem } from '../storage/cloud';
import { useAppStore } from './store';
import { newHeroDoc } from './defaults';

const CLIENT_ID_KEY = 'cct:clientId';
function getClientId() {
  const existing = localStorage.getItem(CLIENT_ID_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(CLIENT_ID_KEY, id);
  return id;
}

export async function bootstrapHeroes(uid: string): Promise<HeroListItem[]> {
  const local = await listLocalHeroes(uid);
  let cloud: HeroListItem[] = [];
  try {
    cloud = await listCloudHeroes(uid);
  } catch {
    cloud = [];
  }
  const map = new Map<string, HeroListItem>();
  for (const i of [...cloud, ...local]) map.set(i.heroId, i);
  return Array.from(map.values()).sort((a, b) => a.heroName.localeCompare(b.heroName));
}

export async function loadHero(uid: string, heroId: string) {
  const local = await loadLocalHero(uid, heroId);
  if (local) {
    useAppStore.getState().setHero(heroId, local);
  }

  const cloud = await fetchCloudHero(uid, heroId);
  if (cloud) {
    // If cloud is newer than local, prefer cloud.
    if (!local || cloud.meta.rev > (local.meta.rev ?? 0)) {
      useAppStore.getState().setHero(heroId, cloud);
      await saveLocalHero(uid, heroId, cloud);
    }
  }

  // Subscribe live (safe if Firebase is temporarily unavailable)
  try {
    const unsub = subscribeCloudHero(uid, heroId, async (val) => {
      if (!val) return;
      const st = useAppStore.getState();
      const localRev = st.cloud?.meta.rev ?? 0;
      if (val.meta.rev > localRev && !st.sync.dirty) {
        st.setHero(heroId, val);
        await saveLocalHero(uid, heroId, val);
      }
    });
    return unsub;
  } catch {
    return () => {};
  }
}

export async function createHero(uid: string, heroName: string) {
  const doc = newHeroDoc(heroName);
  const heroId = doc.meta.heroId;
  const st = useAppStore.getState();
  const clientId = getClientId();
  // Start with a local record immediately, then attempt a cloud push.
  let rev = Date.now();
  const provisional = { meta: { rev, updatedAt: Date.now(), clientId }, doc } as any;
  st.setHero(heroId, provisional);
  await saveLocalHero(uid, heroId, { ...provisional, __local: { dirty: true, savedAt: Date.now() } } as any);
  st.setSync({ dirty: true });

  try {
    rev = await pushCloudHero({ uid, heroId, doc, clientId, reason: 'manual' });
    const cloud = { meta: { rev, updatedAt: Date.now(), clientId }, doc } as any;
    st.setHero(heroId, cloud);
    await saveLocalHero(uid, heroId, { ...cloud, __local: { dirty: false, savedAt: Date.now() } } as any);
    st.setSync({ dirty: false, lastSavedRev: rev, lastError: null });
  } catch (e: any) {
    st.setSync({ lastError: String(e?.message ?? e), online: navigator.onLine });
  }

  return heroId;
}

// Local autosave is intentionally separate from cloud autosave.
// Goal: never lose edits, even if offline or Firebase is misconfigured.
const saveLocalDebounced = debounce(async () => {
  const st = useAppStore.getState();
  const uid = st.uid;
  const heroId = st.heroId;
  const cloud = st.cloud;
  const doc = st.doc;
  if (!uid || !heroId || !doc) return;

  const record: any = cloud ? { ...cloud, doc } : { meta: { rev: 0, updatedAt: Date.now(), clientId: getClientId() }, doc };
  record.__local = { dirty: true, savedAt: Date.now() };
  await saveLocalHero(uid, heroId, record);
}, 250);

export function scheduleLocalSave() {
  saveLocalDebounced();
}

const pushCloudDebounced = debounce(async () => {
  const st = useAppStore.getState();
  const uid = st.uid;
  const heroId = st.heroId;
  const doc = st.doc;
  if (!uid || !heroId || !doc) return;
  if (!st.sync.dirty) return;

  try {
    const clientId = getClientId();
    const rev = await pushCloudHero({ uid, heroId, doc, clientId, reason: 'autosave' });
    const cloud = { meta: { rev, updatedAt: Date.now(), clientId }, doc } as any;
    st.setHero(heroId, cloud);
    await saveLocalHero(uid, heroId, cloud);
    st.setSync({ dirty: false, lastSavedRev: rev, lastError: null });
  } catch (e: any) {
    st.setSync({ lastError: String(e?.message ?? e), online: navigator.onLine });
  }
}, 1200);

export function scheduleCloudPush() {
  pushCloudDebounced();
}

export async function manualSave(reason: 'manual' | 'snapshot' = 'manual') {
  const st = useAppStore.getState();
  const uid = st.uid;
  const heroId = st.heroId;
  const doc = st.doc;
  if (!uid || !heroId || !doc) return;

  const clientId = getClientId();
  const rev = await pushCloudHero({ uid, heroId, doc, clientId, reason });
  const cloud = { meta: { rev, updatedAt: Date.now(), clientId }, doc } as any;
  st.setHero(heroId, cloud);
  await saveLocalHero(uid, heroId, { ...cloud, __local: { dirty: false, savedAt: Date.now() } } as any);
  st.setSync({ dirty: false, lastSavedRev: rev, lastError: null });
}

export function wireConnectivity() {
  const st = useAppStore.getState();
  const on = () => st.setSync({ online: true });
  const off = () => st.setSync({ online: false });
  window.addEventListener('online', on);
  window.addEventListener('offline', off);
  return () => {
    window.removeEventListener('online', on);
    window.removeEventListener('offline', off);
  };
}
