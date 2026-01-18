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

function pickRecordEntry(value: unknown): LegacyRecord | null {
  const record = asRecord(value);
  const candidate = Object.values(record).find(v => v && typeof v === 'object') ?? null;
  return candidate ? asRecord(candidate) : null;
}

function pickAutosave(records: LegacyRecord): LegacyRecord {
  const entries = Object.values(records)
    .filter(v => v && typeof v === 'object')
    .map(v => asRecord(v));
  if (entries.length === 0) return {};
  const sorted = entries.sort((a, b) => {
    const aTime = readNumber(a.savedAt ?? a.updatedAt ?? a.rev, 0);
    const bTime = readNumber(b.savedAt ?? b.updatedAt ?? b.rev, 0);
    return aTime - bTime;
  });
  const latest = sorted[sorted.length - 1];
  return 'doc' in latest ? asRecord(latest.doc) : latest;
}

function pickLegacyRoot(raw: unknown): LegacyRecord {
  const root = asRecord(raw);
  if ('doc' in root) return asRecord(root.doc);
  if ('autosaves' in root) return pickAutosave(asRecord(root.autosaves));
  if ('heroes' in root) {
    const heroRoot = pickRecordEntry(root.heroes);
    if (heroRoot) return 'doc' in heroRoot ? asRecord(heroRoot.doc) : heroRoot;
  }
  if ('users' in root) {
    const userRoot = pickRecordEntry(root.users);
    if (userRoot) {
      if ('autosaves' in userRoot) return pickAutosave(asRecord(userRoot.autosaves));
      if ('heroes' in userRoot) {
        const heroRoot = pickRecordEntry(userRoot.heroes);
        if (heroRoot) return 'doc' in heroRoot ? asRecord(heroRoot.doc) : heroRoot;
      }
      if ('doc' in userRoot) return asRecord(userRoot.doc);
    }
  }
  return root;
}

function readPath(value: unknown, path: string[]) {
  let current: any = value;
  for (const key of path) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function readNumberPaths(value: unknown, paths: string[][], fallback: number) {
  for (const path of paths) {
    const found = readPath(value, path);
    if (found !== undefined) {
      const num = readNumber(found, fallback);
      return num;
    }
  }
  return fallback;
}

function readStringPaths(value: unknown, paths: string[][]) {
  for (const path of paths) {
    const found = readPath(value, path);
    if (typeof found === 'string') return found;
  }
  return '';
}

export function legacyImportToHeroDoc(raw: unknown): HeroDoc {
  const data = pickLegacyRoot(raw);
  const heroName = readStringPaths(data, [['hero-name'], ['heroName'], ['name'], ['meta','heroName']]) || 'Legacy Import';
  const doc = newHeroDoc(heroName);

  const statKeys = ['str','dex','con','int','wis','cha'] as const;
  statKeys.forEach((key) => {
    doc.stats[key] = readNumberPaths(data, [[key], ['stats', key], ['abilities', key], ['abilityScores', key]], doc.stats[key]);
  });

  const saveList = readPath(data, ['saveProfs']) ?? readPath(data, ['save-profs']) ?? readPath(data, ['saves']);
  if (Array.isArray(saveList)) {
    saveList.forEach(entry => {
      if (typeof entry !== 'string') return;
      const stat = normalizeKey(entry);
      if (stat in doc.proficiencies.saves) {
        doc.proficiencies.saves[stat as keyof typeof doc.proficiencies.saves] = true;
      }
    });
  }

  const hpMax = readNumberPaths(data, [['hp','max'], ['hpMax'], ['hp-max']], doc.combat.hp.max);
  const hpTemp = readNumberPaths(data, [['hp','temp'], ['hpTemp'], ['hp-temp']], doc.combat.hp.temp);
  const hpCurrent = readNumberPaths(data, [['hp','current'], ['hpCurrent'], ['hp-current']], doc.combat.hp.current);
  doc.combat.hp.max = hpMax;
  doc.combat.hp.temp = hpTemp;
  doc.combat.hp.current = clamp(hpCurrent, 0, hpMax + hpTemp);

  const spMax = readNumberPaths(data, [['sp','max'], ['spMax'], ['sp-max']], doc.combat.sp.max);
  const spTemp = readNumberPaths(data, [['sp','temp'], ['spTemp'], ['sp-temp']], doc.combat.sp.temp);
  const spCurrent = readNumberPaths(data, [['sp','current'], ['spCurrent'], ['sp-current']], doc.combat.sp.current);
  doc.combat.sp.max = spMax;
  doc.combat.sp.temp = spTemp;
  doc.combat.sp.current = clamp(spCurrent, 0, spMax + spTemp);

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
  const skillRecord = readPath(data, ['skills']) ?? readPath(data, ['skillProfs']) ?? readPath(data, ['skill-profs']);
  if (skillRecord && typeof skillRecord === 'object') {
    Object.entries(skillRecord as Record<string, unknown>).forEach(([key, value]) => {
      if (!isTruthy(value)) return;
      const matched = skillMap[normalizeKey(key)];
      if (matched) doc.proficiencies.skills[matched] = true;
    });
  }
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

  const deathBlock = readPath(data, ['deathSaves']) ?? readPath(data, ['death-saves']) ?? readPath(data, ['death']);
  if (deathBlock && typeof deathBlock === 'object') {
    const record = deathBlock as Record<string, unknown>;
    const mode = readString(record.mode ?? record.saveMode);
    if (mode) doc.combat.deathSaves.mode = mode as any;
    doc.combat.deathSaves.mod = readNumber(record.mod ?? record.modifier, doc.combat.deathSaves.mod);
    doc.combat.deathSaves.success = clamp(readNumber(record.success ?? record.successes, doc.combat.deathSaves.success), 0, 3);
    doc.combat.deathSaves.fail = clamp(readNumber(record.fail ?? record.failures, doc.combat.deathSaves.fail), 0, 3);
  } else {
    const deathSuccess = Object.keys(data).filter(k => k.startsWith('death-success-') && isTruthy(data[k])).length;
    const deathFail = Object.keys(data).filter(k => k.startsWith('death-fail-') && isTruthy(data[k])).length;
    doc.combat.deathSaves.success = clamp(deathSuccess, 0, 3);
    doc.combat.deathSaves.fail = clamp(deathFail, 0, 3);
  }

  const repKeys = ['public','government','omni','pfv','greyline','conclave'] as const;
  repKeys.forEach(rep => {
    const key = `rep-${rep}`;
    const repRecord = readPath(data, ['reputation']);
    const value = key in data ? data[key] : repRecord && typeof repRecord === 'object' ? (repRecord as Record<string, unknown>)[rep] : undefined;
    if (value !== undefined) {
      doc.reputation[rep] = readNumber(value, doc.reputation[rep]);
    }
  });

  const powers = Array.isArray(data.powers) ? data.powers.map(p => mapLegacyPower(p, false)) : [];
  const signatures = Array.isArray(data.signatures) ? data.signatures.map(p => mapLegacyPower(p, true)) : [];
  doc.powers = powers;
  doc.signatures = signatures;

  return doc;
}
