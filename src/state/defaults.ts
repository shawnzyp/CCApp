import { uuid } from '../lib/ids';
import type { HeroDoc } from './models';
import { SKILLS } from './skills';

export const DEFAULT_CONDITIONS = [
  'Blinded','Charmed','Deafened','Frightened','Grappled','Incapacitated','Invisible','Paralyzed','Petrified','Poisoned','Prone','Restrained','Stunned','Unconscious'
] as const;

export const DEFAULT_REPUTATION = {
  public: 200,
  government: 200,
  omni: 200,
  pfv: 200,
  greyline: 200,
  conclave: 200
};

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
      initiativeBonus: 0,
      initiative: 0,
      round: 1
    },
    resonance: { points: 0, banked: 0, nextCombatRegenPenalty: false, surge: { active: false, aftermathPending: false, mode: 'encounter' } },
    powers: [],
    signatures: [],
    gear: { credits: 0, inventory: [], equipped: { weapons: [] } },
    story: {
      backstory: '',
      notes: '',
      prompts: {}
    },
    reputation: { ...DEFAULT_REPUTATION },
    ui: { editLock: false }
  };
}

function normalizeReputation(input: any) {
  return {
    public: Number(input?.public ?? DEFAULT_REPUTATION.public),
    government: Number(input?.government ?? DEFAULT_REPUTATION.government),
    omni: Number(input?.omni ?? DEFAULT_REPUTATION.omni),
    pfv: Number(input?.pfv ?? DEFAULT_REPUTATION.pfv),
    greyline: Number(input?.greyline ?? DEFAULT_REPUTATION.greyline),
    conclave: Number(input?.conclave ?? DEFAULT_REPUTATION.conclave)
  };
}

export function normalizeHeroDoc(doc: HeroDoc): HeroDoc {
  const fallback = newHeroDoc(doc?.meta?.heroName ?? 'Hero');
  const incomingStory = (doc as any)?.story ?? {};
  const { reputation: legacyRep, ...story } = incomingStory;
  const repSource = (doc as any)?.reputation ?? legacyRep;

  return {
    ...fallback,
    ...doc,
    meta: { ...fallback.meta, ...doc.meta },
    profile: { ...fallback.profile, ...doc.profile },
    progression: { ...fallback.progression, ...doc.progression },
    stats: { ...fallback.stats, ...doc.stats },
    proficiencies: {
      saves: { ...fallback.proficiencies.saves, ...(doc.proficiencies?.saves ?? {}) },
      skills: { ...fallback.proficiencies.skills, ...(doc.proficiencies?.skills ?? {}) }
    },
    combat: {
      ...fallback.combat,
      ...doc.combat,
      hp: { ...fallback.combat.hp, ...(doc.combat?.hp ?? {}) },
      sp: { ...fallback.combat.sp, ...(doc.combat?.sp ?? {}) },
      deathSaves: { ...fallback.combat.deathSaves, ...(doc.combat?.deathSaves ?? {}) },
      conditions: { ...fallback.combat.conditions, ...(doc.combat?.conditions ?? {}) }
    },
    resonance: { ...fallback.resonance, ...doc.resonance, surge: { ...fallback.resonance.surge, ...(doc.resonance?.surge ?? {}) } },
    powers: doc.powers ?? fallback.powers,
    signatures: doc.signatures ?? (doc as any).signatures ?? fallback.signatures,
    gear: { ...fallback.gear, ...doc.gear, equipped: { ...fallback.gear.equipped, ...(doc.gear?.equipped ?? {}) } },
    story: { ...fallback.story, ...story },
    reputation: normalizeReputation(repSource),
    ui: { ...fallback.ui, ...doc.ui }
  };
}
