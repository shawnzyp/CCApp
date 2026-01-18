import type { SkillName } from './skills';

export type DeathSaveMode = 'normal' | 'adv' | 'dis';

export type DamageBlock = {
  dice?: string;
  type?: string;
  onSave?: 'Half' | 'Negate' | 'None';
};

export type PowerCard = {
  id: string;
  name: string;
  signature?: boolean;

  actionType?: string;
  range?: string;
  shape?: string;
  duration?: string;
  effectTag?: string;
  intensity?: string;
  scaling?: string;

  spCost?: number;
  uses?: string;

  requiresSave?: boolean;
  saveAbilityTarget?: string;
  saveDC?: number;

  concentration?: boolean;
  cooldown?: number;

  damage?: DamageBlock;
  description?: string;
  special?: string;
  tags?: string[];

  versionNotes?: string;
  history?: Array<{ at: number; note: string; snapshot: Omit<PowerCard, 'history'> }>;
};

export type GearItem = {
  id: string;
  name: string;
  category: 'Weapon' | 'Armor' | 'Shield' | 'Utility' | 'Item';
  rarity?: 'Common' | 'Uncommon' | 'Rare' | 'Elite' | 'Legendary';
  style?: string;
  cost?: number;
  notes?: string;
  tcBonus?: number;
  spBonus?: number;
};

export type HeroDoc = {
  meta: {
    heroId: string;
    heroName: string;
    alterEgo?: string;
    playerName?: string;
    createdAt: number;
  };

  profile: {
    classification?: string;
    origin?: string;
    alignment?: string;
    powerStylePrimary?: string;
    powerStyleSecondary?: string;
  };

  progression: {
    xp: number;
    level: number;
    profBonus: number;
    augments: string[];
  };

  stats: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };

  proficiencies: {
    saves: Record<'str'|'dex'|'con'|'int'|'wis'|'cha', boolean>;
    skills: Record<SkillName, boolean>;
  };

  combat: {
    hp: { current: number; max: number; temp: number };
    sp: { current: number; max: number; temp: number };
    deathSaves: { success: number; fail: number; mod: number; mode: DeathSaveMode };
    tc: number;
    speed: number;
    passivePerception: number;
    capUsed: boolean;
    conditions: Record<string, boolean>;
    initiativeBonus: number;
  };

  resonance: {
    points: number;
    banked: number;
    nextCombatRegenPenalty: boolean;
    surge: { active: boolean; aftermathPending: boolean; mode: 'encounter' | 'session' };
  };

  powers: PowerCard[];
  gear: {
    credits: number;
    inventory: GearItem[];
    equipped: { armor?: string; shield?: string; utility?: string; weapons: string[] };
  };

  story: {
    backstory: string;
    notes: string;
    prompts: Record<string, string>;
    reputation: Record<'public'|'government'|'omni'|'pfv'|'greyline'|'conclave', number>;
  };

  ui: {
    editLock: boolean;
  };
};

export type CloudMeta = {
  rev: number;
  updatedAt: any;
  clientId: string;
};

export type CloudHero = {
  meta: CloudMeta;
  doc: HeroDoc;
};
