import { debounce } from '../lib/debounce';
import { loadLocalHero, saveLocalHero, listLocalHeroIds } from '../storage/local';
import { fetchCloudHero, subscribeCloudHero, pushCloudHero } from '../storage/cloud';
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

export async function bootstrapHeroes(uid: string) {
  const ids = await listLocalHeroIds(uid);
  return ids;
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

  // Subscribe live
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
}

export async function createHero(uid: string, heroName: string) {
  const doc = newHeroDoc(heroName);
  const heroId = doc.meta.heroId;
  const cloud = { meta: { rev: Date.now(), updatedAt: Date.now(), clientId: getClientId() }, doc } as any;
  useAppStore.getState().setHero(heroId, cloud);
  await saveLocalHero(uid, heroId, cloud);
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
