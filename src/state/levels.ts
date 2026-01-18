export type LevelRow = {
  level: number;
  tier: number;
  subTier: string;
  xpRequired: number;
  tierLabel: string;
  gainsSummary: string;
};

// Source: Levels.docx (Catalyst Core).
export const LEVELS: LevelRow[] = [
  { level: 1, tier: 5, subTier: 'A', xpRequired: 0, tierLabel: 'Tier 5 – Rookie', gainsSummary: 'Character creation' },
  { level: 2, tier: 5, subTier: 'B', xpRequired: 300, tierLabel: '', gainsSummary: '+5 HP and Power Evolution' },
  { level: 3, tier: 5, subTier: 'C', xpRequired: 900, tierLabel: '', gainsSummary: 'Augment 1' },
  { level: 4, tier: 5, subTier: 'D', xpRequired: 2700, tierLabel: 'Tier 4 Begins (+1 Stat)', gainsSummary: 'Signature Move Evolution and +1 SP Max' },
  { level: 5, tier: 4, subTier: 'A', xpRequired: 6500, tierLabel: '', gainsSummary: '+5 HP and Power Evolution' },
  { level: 6, tier: 4, subTier: 'B', xpRequired: 14000, tierLabel: '', gainsSummary: 'Augment 2' },
  { level: 7, tier: 4, subTier: 'C', xpRequired: 23000, tierLabel: '', gainsSummary: '+1 SP Max and Power Evolution' },
  { level: 8, tier: 4, subTier: 'D', xpRequired: 34000, tierLabel: 'Tier 3 Begins (+1 Stat)', gainsSummary: 'Power or Signature Move Evolution' },
  { level: 9, tier: 3, subTier: 'A', xpRequired: 48000, tierLabel: '', gainsSummary: 'Augment 3' },
  { level: 10, tier: 3, subTier: 'B', xpRequired: 64000, tierLabel: '', gainsSummary: '+5 HP and Power Evolution' },
  { level: 11, tier: 3, subTier: 'C', xpRequired: 85000, tierLabel: '', gainsSummary: '+1 SP Max' },
  { level: 12, tier: 3, subTier: 'D', xpRequired: 100000, tierLabel: 'Tier 2 Begins (+1 Stat &)', gainsSummary: 'Augment 4' },
  { level: 13, tier: 2, subTier: 'A', xpRequired: 120000, tierLabel: '', gainsSummary: '+5 HP and Power Evolution' },
  { level: 14, tier: 2, subTier: 'B', xpRequired: 140000, tierLabel: '', gainsSummary: '+1 SP Max' },
  { level: 15, tier: 2, subTier: 'C', xpRequired: 165000, tierLabel: '', gainsSummary: 'Augment 5' },
  { level: 16, tier: 2, subTier: 'D', xpRequired: 195000, tierLabel: 'Tier 1 Begins (+1 Stat)', gainsSummary: 'Legendary Gear Access' },
  { level: 17, tier: 1, subTier: 'A', xpRequired: 225000, tierLabel: '', gainsSummary: '+5 HP and Power Evolution' },
  { level: 18, tier: 1, subTier: 'B', xpRequired: 265000, tierLabel: '', gainsSummary: '+1 SP Max' },
  { level: 19, tier: 1, subTier: 'C', xpRequired: 305000, tierLabel: '', gainsSummary: 'Augment 6' }
];

export function levelForXp(xp: number) {
  let current = LEVELS[0];
  for (const row of LEVELS) {
    if (xp >= row.xpRequired) current = row;
  }
  return current;
}

export function nextLevelRow(level: number) {
  return LEVELS.find(r => r.level === level + 1) ?? null;
}
