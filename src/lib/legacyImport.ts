import { newHeroDoc } from '../state/defaults';
import { SKILLS, type SkillName } from '../state/skills';
import { uuid } from './ids';
import type { HeroDoc, PowerCard } from '../state/models';
import { clamp } from './math';

type LegacyRecord = Record<string, unknown>;

function asRecord(value: unknown): LegacyRecord {
  return value && typeof value === 'object' ? (value as LegacyRecord) : {};
}

function readNumber(value: unknown, fallback: number) {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return fallback;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function isTruthy(value: unknown) {
  return value === true || value === 1 || value === 'true';
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function titleize(value: string) {
  return value
    .split(/[-_ ]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function mapLegacyPower(entry: unknown, signature: boolean): PowerCard {
  const raw = asRecord(entry);
  const id = readString(raw.id) || uuid();
  const tags = Array.isArray(raw.tags) ? raw.tags.filter((tag): tag is string => typeof tag === 'string') : [];
  return {
    id,
    name: readString(raw.name) || readString(raw.title) || (signature ? 'Signature Move' : 'Power'),
    signature,
    actionType: readString(raw.actionType) || readString(raw.action) || 'Action',
    range: readString(raw.range) || '',
    shape: readString(raw.shape) || '',
    duration: readString(raw.duration) || '',
    effectTag: readString(raw.effectTag) || '',
    intensity: readString(raw.intensity) || '',
    scaling: readString(raw.scaling) || '',
    spCost: readNumber(raw.spCost ?? raw.sp, 0),
    uses: readString(raw.uses) || '',
    requiresSave: Boolean(raw.requiresSave ?? raw.save),
    saveAbilityTarget: readString(raw.saveAbilityTarget ?? raw.saveStat) || '',
    saveDC: readNumber(raw.saveDC ?? raw.dc, 0),
    concentration: Boolean(raw.concentration),
    cooldown: readNumber(raw.cooldown, 0),
    ultimateCooldown: readNumber(raw.ultimateCooldown ?? raw.ultimate, 0),
    description: readString(raw.description) || '',
    special: readString(raw.special) || '',
    tags
  };
}

export function legacyImportToHeroDoc(raw: unknown): HeroDoc {
  const data = asRecord(raw);
  const heroName = readString(data['hero-name']) || readString(data.heroName) || readString(data.name) || 'Legacy Import';
  const doc = newHeroDoc(heroName);

  doc.progression.xp = readNumber(data.xp, doc.progression.xp);
  doc.progression.profBonus = readNumber(data['prof-bonus'], doc.progression.profBonus);
  doc.progression.level = readNumber(data.level, doc.progression.level);

  const hpMax = readNumber(data['hp-max'], doc.combat.hp.max);
  const hpCurrent = readNumber(data['hp-bar'], doc.combat.hp.current);
  doc.combat.hp.max = hpMax;
  doc.combat.hp.current = clamp(hpCurrent, 0, hpMax);

  const spMax = readNumber(data['sp-max'], doc.combat.sp.max);
  const spCurrent = readNumber(data['sp-bar'], doc.combat.sp.current);
  doc.combat.sp.max = spMax;
  doc.combat.sp.current = clamp(spCurrent, 0, spMax);

  const statusKeys = Object.keys(data).filter(k => k.startsWith('status-'));
  const conditionMap = Object.keys(doc.combat.conditions).reduce<Record<string, string>>((acc, key) => {
    acc[normalizeKey(key)] = key;
    return acc;
  }, {});
  statusKeys.forEach(key => {
    if (!isTruthy(data[key])) return;
    const name = titleize(key.replace(/^status-/, ''));
    const normalized = normalizeKey(name);
    const existing = conditionMap[normalized] ?? name;
    doc.combat.conditions[existing] = true;
  });

  const skillMap = SKILLS.reduce<Record<string, SkillName>>((acc, skill) => {
    acc[normalizeKey(skill)] = skill;
    return acc;
  }, {});
  Object.keys(data).forEach(key => {
    if (!key.startsWith('skill-') || !isTruthy(data[key])) return;
    const name = titleize(key.replace(/^skill-/, ''));
    const matched = skillMap[normalizeKey(name)];
    if (matched) doc.proficiencies.skills[matched] = true;
  });

  Object.keys(data).forEach(key => {
    if (!key.startsWith('save-') || !isTruthy(data[key])) return;
    const stat = key.replace(/^save-/, '').toLowerCase();
    if (stat in doc.proficiencies.saves) {
      doc.proficiencies.saves[stat as keyof typeof doc.proficiencies.saves] = true;
    }
  });

  const deathSuccess = Object.keys(data).filter(k => k.startsWith('death-success-') && isTruthy(data[k])).length;
  const deathFail = Object.keys(data).filter(k => k.startsWith('death-fail-') && isTruthy(data[k])).length;
  doc.combat.deathSaves.success = clamp(deathSuccess, 0, 3);
  doc.combat.deathSaves.fail = clamp(deathFail, 0, 3);

  const repKeys = ['public','government','omni','pfv','greyline','conclave'] as const;
  repKeys.forEach(rep => {
    const key = `rep-${rep}`;
    if (key in data) {
      doc.story.reputation[rep] = readNumber(data[key], doc.story.reputation[rep]);
    }
  });

  const powers = Array.isArray(data.powers) ? data.powers.map(p => mapLegacyPower(p, false)) : [];
  const signatures = Array.isArray(data.signatures) ? data.signatures.map(p => mapLegacyPower(p, true)) : [];
  doc.powers = [...signatures, ...powers];

  return doc;
}
