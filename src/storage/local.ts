import { get, set, del, keys } from 'idb-keyval';
import type { LocalCloudHero } from '../state/models';

const KEY_PREFIX = 'cct:';

export async function saveLocalHero(uid: string, heroId: string, data: LocalCloudHero) {
  await set(`${KEY_PREFIX}${uid}:hero:${heroId}`, data);
}

export async function loadLocalHero(uid: string, heroId: string): Promise<LocalCloudHero | null> {
  return (await get(`${KEY_PREFIX}${uid}:hero:${heroId}`)) ?? null;
}

export async function deleteLocalHero(uid: string, heroId: string) {
  await del(`${KEY_PREFIX}${uid}:hero:${heroId}`);
}

export async function listLocalHeroIds(uid: string): Promise<string[]> {
  const all = await keys();
  const prefix = `${KEY_PREFIX}${uid}:hero:`;
  return all
    .filter(k => typeof k === 'string' && k.startsWith(prefix))
    .map(k => (k as string).slice(prefix.length));
}
