import { debounce } from '../lib/debounce';
import { loadLocalHero, saveLocalHero, listLocalHeroIds } from '../storage/local';
import { fetchCloudHero, subscribeCloudHero, pushCloudHero } from '../storage/cloud';
import { useAppStore } from './store';
import { newHeroDoc } from './defaults';
import type { LocalCloudHero, HeroDoc } from './models';
import { uuid } from '../lib/ids';
import { legacyImportToHeroDoc } from '../lib/legacyImport';

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
    const localRev = local?.meta.rev ?? 0;
    const localDirty = Boolean(local?.__local?.dirty);
    if (localDirty && cloud.meta.rev > localRev) {
      useAppStore.getState().setConflict({ cloud, local });
    } else if (!local || cloud.meta.rev > localRev) {
      const record: LocalCloudHero = { ...cloud, __local: { dirty: false, savedAt: Date.now() } };
      useAppStore.getState().setHero(heroId, record);
      await saveLocalHero(uid, heroId, record);
    }
  }

  // Subscribe live
  const unsub = subscribeCloudHero(uid, heroId, async (val) => {
    if (!val) return;
    const st = useAppStore.getState();
    const localRev = st.cloud?.meta.rev ?? 0;
    if (val.meta.rev > localRev && st.sync.dirty) {
      if (!st.doc) return;
      const local: LocalCloudHero = st.cloud ?? { meta: { rev: localRev, updatedAt: Date.now(), clientId: getClientId() }, doc: st.doc, __local: { dirty: true, savedAt: st.sync.localSavedAt ?? Date.now() } };
      st.setConflict({ cloud: val, local });
      return;
    }
    if (val.meta.rev > localRev && !st.sync.dirty) {
      const record: LocalCloudHero = { ...val, __local: { dirty: false, savedAt: Date.now() } };
      st.setHero(heroId, record);
      await saveLocalHero(uid, heroId, record);
    }
  });

  return unsub;
}

export async function createHero(uid: string, heroName: string) {
  const doc = newHeroDoc(heroName);
  const heroId = doc.meta.heroId;
  const record: LocalCloudHero = { meta: { rev: Date.now(), updatedAt: Date.now(), clientId: getClientId() }, doc, __local: { dirty: true, savedAt: Date.now() } };
  useAppStore.getState().setHero(heroId, record);
  await saveLocalHero(uid, heroId, record);
  return heroId;
}

export async function importLegacyHero(uid: string, raw: unknown) {
  const doc = legacyImportToHeroDoc(raw);
  const heroId = doc.meta.heroId;
  const record: LocalCloudHero = { meta: { rev: 0, updatedAt: Date.now(), clientId: getClientId() }, doc, __local: { dirty: true, savedAt: Date.now() } };
  const st = useAppStore.getState();
  st.setHero(heroId, record);
  await saveLocalHero(uid, heroId, record);
  st.setSync({ dirty: true, localSavedAt: Date.now() });
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

  const record: LocalCloudHero = cloud ? { ...cloud, doc, __local: { dirty: true, savedAt: Date.now() } } : { meta: { rev: 0, updatedAt: Date.now(), clientId: getClientId() }, doc, __local: { dirty: true, savedAt: Date.now() } };
  await saveLocalHero(uid, heroId, record);
  st.setSync({ localSavedAt: record.__local?.savedAt ?? Date.now(), dirty: true });
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
  if (st.conflict) return;

  try {
    const clientId = getClientId();
    const rev = await pushCloudHero({ uid, heroId, doc, clientId, reason: 'autosave' });
    const record: LocalCloudHero = { meta: { rev, updatedAt: Date.now(), clientId }, doc, __local: { dirty: false, savedAt: Date.now() } };
    st.setHero(heroId, record);
    await saveLocalHero(uid, heroId, record);
    st.setSync({ dirty: false, lastSavedRev: rev, lastError: null, localSavedAt: Date.now() });
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
  const record: LocalCloudHero = { meta: { rev, updatedAt: Date.now(), clientId }, doc, __local: { dirty: false, savedAt: Date.now() } };
  st.setHero(heroId, record);
  await saveLocalHero(uid, heroId, record);
  st.setSync({ dirty: false, lastSavedRev: rev, lastError: null, localSavedAt: Date.now() });
}

export async function resolveConflictKeepLocal() {
  const st = useAppStore.getState();
  if (!st.conflict) return;
  st.setConflict(null);
  await manualSave('manual');
}

export async function resolveConflictUseCloud() {
  const st = useAppStore.getState();
  const uid = st.uid;
  const heroId = st.heroId;
  const conflict = st.conflict;
  if (!uid || !heroId || !conflict) return;
  const record: LocalCloudHero = { ...conflict.cloud, __local: { dirty: false, savedAt: Date.now() } };
  st.setHero(heroId, record);
  await saveLocalHero(uid, heroId, record);
  st.setSync({ dirty: false, lastSavedRev: conflict.cloud.meta.rev, lastError: null, localSavedAt: Date.now() });
  st.setConflict(null);
}

export async function resolveConflictDuplicate() {
  const st = useAppStore.getState();
  const uid = st.uid;
  const conflict = st.conflict;
  if (!uid || !conflict) return;
  const newHeroId = uuid();
  const doc: HeroDoc = {
    ...conflict.local.doc,
    meta: {
      ...conflict.local.doc.meta,
      heroId: newHeroId,
      heroName: `${conflict.local.doc.meta.heroName} Copy`,
      createdAt: Date.now()
    }
  };
  const clientId = getClientId();
  const record: LocalCloudHero = { meta: { rev: 0, updatedAt: Date.now(), clientId }, doc, __local: { dirty: true, savedAt: Date.now() } };
  st.setHero(newHeroId, record);
  await saveLocalHero(uid, newHeroId, record);
  st.setConflict(null);
  await manualSave('manual');
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
