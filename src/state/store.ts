import { create } from 'zustand';
import type { CloudHero, HeroDoc, LocalCloudHero } from './models';

export type SyncState = {
  online: boolean;
  dirty: boolean;
  lastSavedRev: number | null;
  lastError: string | null;
  localSavedAt: number | null;
};

export type AppState = {
  uid: string | null;
  heroId: string | null;
  cloud: LocalCloudHero | null;
  doc: HeroDoc | null;
  sync: SyncState;
  conflict: { cloud: CloudHero; local: LocalCloudHero } | null;

  setUid: (uid: string | null) => void;
  // NOTE: local autosave adds a non-cloud metadata wrapper, so the stored type can be wider than CloudHero.
  setHero: (heroId: string | null, cloud: LocalCloudHero | null) => void;
  setDoc: (updater: (d: HeroDoc) => HeroDoc) => void;
  markDirty: () => void;
  setSync: (s: Partial<SyncState>) => void;
  setConflict: (conflict: AppState['conflict']) => void;
};

export const useAppStore = create<AppState>((set, get) => ({
  uid: null,
  heroId: null,
  cloud: null,
  doc: null,
  sync: { online: navigator.onLine, dirty: false, lastSavedRev: null, lastError: null, localSavedAt: null },
  conflict: null,

  setUid: (uid) => set({ uid }),
  setHero: (heroId, cloud) => {
    const localDirty = Boolean(cloud?.__local?.dirty);
    set({
      heroId,
      cloud,
      doc: cloud?.doc ?? null,
      sync: {
        ...get().sync,
        dirty: localDirty,
        lastError: null,
        lastSavedRev: cloud?.meta?.rev ?? null,
        localSavedAt: cloud?.__local?.savedAt ?? null
      }
    });
  },

  setDoc: (updater) => {
    const doc = get().doc;
    if (!doc) return;
    set({ doc: updater(doc) });
  },

  markDirty: () => set({ sync: { ...get().sync, dirty: true } }),
  setSync: (s) => set({ sync: { ...get().sync, ...s } }),
  setConflict: (conflict) => set({ conflict })
}));
