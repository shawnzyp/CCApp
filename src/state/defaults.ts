import { uuid } from '../lib/ids';
import type { HeroDoc } from './models';
import { SKILLS } from './skills';

export const DEFAULT_CONDITIONS = [
  'Blinded','Charmed','Deafened','Frightened','Grappled','Incapacitated','Invisible','Paralyzed','Petrified','Poisoned','Prone','Restrained','Stunned','Unconscious'
] as const;

export function newHeroDoc(name: string): HeroDoc {
  const heroId = uuid();
  const skills = Object.fromEntries(SKILLS.map(s => [s, false])) as any;

  return {
    meta: { heroId, heroName: name, createdAt: Date.now() },
    profile: {},
    progression: { xp: 0, level: 1, profBonus: 2, augments: [] },
    stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    proficiencies: {
      saves: { str: false, dex: false, con: false, int: false, wis: false, cha: false },
      skills
    },
    combat: {
      hp: { current: 10, max: 10, temp: 0 },
      sp: { current: 5, max: 5, temp: 0 },
      deathSaves: { success: 0, fail: 0, mod: 0, mode: 'normal' },
      tc: 10,
      speed: 30,
      passivePerception: 10,
      capUsed: false,
      conditions: Object.fromEntries(DEFAULT_CONDITIONS.map(c => [c, false])),
      initiativeBonus: 0
    },
    resonance: { points: 0, banked: 0, nextCombatRegenPenalty: false, surge: { active: false, aftermathPending: false, mode: 'encounter' } },
    powers: [],
    gear: { credits: 0, inventory: [], equipped: { weapons: [] } },
    story: {
      backstory: '',
      notes: '',
      prompts: {},
      reputation: { public: 200, government: 200, omni: 200, pfv: 200, greyline: 200, conclave: 200 }
    },
    ui: { editLock: false }
  };
}
