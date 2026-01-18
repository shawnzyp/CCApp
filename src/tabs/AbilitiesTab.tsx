import React from 'react';
import { useAppStore } from '../state/store';
import { abilityMod } from '../lib/math';
import { SKILLS } from '../state/skills';
import { scheduleCloudPush, scheduleLocalSave } from '../state/syncEngine';
import { levelForXp, nextLevelRow } from '../state/levels';

export default function AbilitiesTab() {
  const doc = useAppStore(s => s.doc);
  const setDoc = useAppStore(s => s.setDoc);
  const markDirty = useAppStore(s => s.markDirty);

  if (!doc) return <div className="panel">Open or create a hero first.</div>;

  const locked = doc.ui.editLock;

  const update = (fn: (d: typeof doc) => typeof doc) => {
    setDoc(fn);
    markDirty();
    scheduleLocalSave();
    scheduleCloudPush();
  };

  const statKeys = ['str','dex','con','int','wis','cha'] as const;

  const levelRow = levelForXp(doc.progression.xp);
  const next = nextLevelRow(levelRow.level);

  return (
    <div className="panel">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 800 }}>Abilities</div>
          <div className="small">Toggle Edit-Lock to avoid accidental changes.</div>
        </div>
        <label className="row">
          <span>Edit-Lock</span>
          <input type="checkbox" checked={locked} onChange={e => update(d => ({ ...d, ui: { ...d.ui, editLock: e.target.checked } }))} />
        </label>
      </div>

      <hr />

      <div className="grid">
        {statKeys.map(k => (
          <div className="panel" key={k}>
            <div style={{ fontWeight: 800, textTransform: 'uppercase' }}>{k}</div>
            <div className="small">Modifier: {abilityMod(doc.stats[k]) >= 0 ? '+' : ''}{abilityMod(doc.stats[k])}</div>
            <input
              type="number"
              value={doc.stats[k]}
              disabled={locked}
              onChange={e => update(d => ({ ...d, stats: { ...d.stats, [k]: Number(e.target.value || 0) } }))}
            />
          </div>
        ))}
      </div>

      <hr />

      <div className="grid">
        <div className="panel">
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Saves</div>
          {Object.entries(doc.proficiencies.saves).map(([k,v]) => (
            <label key={k} className="row" style={{ justifyContent: 'space-between' }}>
              <span style={{ textTransform: 'uppercase' }}>{k}</span>
              <input type="checkbox" checked={v} disabled={locked} onChange={e => update(d => ({ ...d, proficiencies: { ...d.proficiencies, saves: { ...d.proficiencies.saves, [k]: e.target.checked } } }))} />
            </label>
          ))}
        </div>

        <div className="panel">
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Skills</div>
          {SKILLS.map((s) => (
            <label key={s} className="row" style={{ justifyContent: 'space-between' }}>
              <span>{s}</span>
              <input type="checkbox" checked={doc.proficiencies.skills[s]} disabled={locked} onChange={e => update(d => ({ ...d, proficiencies: { ...d.proficiencies, skills: { ...d.proficiencies.skills, [s]: e.target.checked } } }))} />
            </label>
          ))}
        </div>

        <div className="panel">
          <div style={{ fontWeight: 800, marginBottom: 8 }}>XP and Level</div>
          <label>
            XP
            <input type="number" value={doc.progression.xp} disabled={locked} onChange={e => update(d => ({ ...d, progression: { ...d.progression, xp: Number(e.target.value || 0) } }))} />
          </label>
          <div className="small">Derived level: {levelRow.level} (Tier {levelRow.tier}{levelRow.subTier})</div>
          {next ? <div className="small">Next: Level {next.level} at {next.xpRequired} XP. {next.gainsSummary}</div> : <div className="small">Max table reached in app scaffold.</div>}
          <label>
            Proficiency Bonus
            <input type="number" value={doc.progression.profBonus} disabled={locked} onChange={e => update(d => ({ ...d, progression: { ...d.progression, profBonus: Number(e.target.value || 0) } }))} />
          </label>
        </div>
      </div>
    </div>
  );
}
