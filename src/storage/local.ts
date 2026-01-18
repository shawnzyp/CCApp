import { get, set, del, keys } from 'idb-keyval';
import type { CloudHero } from '../state/models';
import type { HeroListItem } from './cloud';

const KEY_PREFIX = 'cct:';

export async function saveLocalHero(uid: string, heroId: string, data: CloudHero) {
  await set(`${KEY_PREFIX}${uid}:hero:${heroId}`, data);
}

export async function loadLocalHero(uid: string, heroId: string): Promise<CloudHero | null> {
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

export async function listLocalHeroes(uid: string): Promise<HeroListItem[]> {
  const ids = await listLocalHeroIds(uid);
  const items: HeroListItem[] = [];
  for (const id of ids) {
    const rec = await loadLocalHero(uid, id);
    items.push({ heroId: id, heroName: rec?.doc?.meta?.heroName || id });
  }
  return items.sort((a, b) => a.heroName.localeCompare(b.heroName));
}
