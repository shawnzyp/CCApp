import React from 'react';
import { useAppStore } from '../state/store';
import { scheduleCloudPush, scheduleLocalSave } from '../state/syncEngine';
import { clamp } from '../lib/math';

export default function StoryTab() {
  const doc = useAppStore(s => s.doc);
  const setDoc = useAppStore(s => s.setDoc);
  const markDirty = useAppStore(s => s.markDirty);

  if (!doc) return <div className="panel">Open or create a hero first.</div>;

  const update = (fn: (d: typeof doc) => typeof doc) => {
    setDoc(fn);
    markDirty();
    scheduleLocalSave();
    scheduleCloudPush();
  };

  const repKeys = Object.keys(doc.story.reputation) as Array<keyof typeof doc.story.reputation>;

  const repClamp = (v: number) => Math.max(0, Math.min(400, v));

  const quick = {
    startRound: () => update(d => ({
      ...d,
      combat: {
        ...d.combat,
        sp: { ...d.combat.sp, current: d.combat.sp.max + d.combat.sp.temp }
      }
    })),
    shortRest: () => update(d => ({
      ...d,
      combat: {
        ...d.combat,
        deathSaves: { ...d.combat.deathSaves, success: 0, fail: 0 },
        capUsed: false
      }
    })),
    longRest: () => update(d => ({
      ...d,
      combat: {
        ...d.combat,
        hp: { ...d.combat.hp, current: d.combat.hp.max + d.combat.hp.temp },
        sp: { ...d.combat.sp, current: d.combat.sp.max + d.combat.sp.temp },
        deathSaves: { ...d.combat.deathSaves, success: 0, fail: 0 },
        conditions: Object.fromEntries(Object.keys(d.combat.conditions).map(k => [k, false])),
        capUsed: false
      },
      resonance: {
        ...d.resonance,
        nextCombatRegenPenalty: false,
        surge: { ...d.resonance.surge, aftermathPending: false }
      }
    })),
    clearConditions: () => update(d => ({
      ...d,
      combat: { ...d.combat, conditions: Object.fromEntries(Object.keys(d.combat.conditions).map(k => [k, false])) }
    }))
  };

  return (
    <div className="panel">
      <div className="panel">
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Quick Actions</div>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <button className="ghost" onClick={quick.startRound}>Start Combat Round (refill SP)</button>
          <button className="ghost" onClick={quick.shortRest}>Short Rest Reset</button>
          <button className="primary" onClick={quick.longRest}>Long Rest</button>
          <button className="ghost" onClick={quick.clearConditions}>Clear Conditions</button>
        </div>
        <div className="small" style={{ marginTop: 6 }}>These are convenience buttons. Use what matches your table rules.</div>
      </div>

      <hr />

      <div className="grid">
        <div className="panel">
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Identity</div>
          <label>
            Hero name
            <input value={doc.meta.heroName} onChange={e => update(d => ({ ...d, meta: { ...d.meta, heroName: e.target.value } }))} />
          </label>
          <label>
            Alter ego
            <input value={doc.meta.alterEgo ?? ''} onChange={e => update(d => ({ ...d, meta: { ...d.meta, alterEgo: e.target.value } }))} />
          </label>
          <label>
            Player name
            <input value={doc.meta.playerName ?? ''} onChange={e => update(d => ({ ...d, meta: { ...d.meta, playerName: e.target.value } }))} />
          </label>
        </div>

        <div className="panel">
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Profile</div>
          <label>
            Classification
            <input value={doc.profile.classification ?? ''} onChange={e => update(d => ({ ...d, profile: { ...d.profile, classification: e.target.value } }))} />
          </label>
          <label>
            Origin
            <input value={doc.profile.origin ?? ''} onChange={e => update(d => ({ ...d, profile: { ...d.profile, origin: e.target.value } }))} />
          </label>
          <label>
            Alignment
            <input value={doc.profile.alignment ?? ''} onChange={e => update(d => ({ ...d, profile: { ...d.profile, alignment: e.target.value } }))} />
          </label>
          <label>
            Power Style (Primary)
            <input value={doc.profile.powerStylePrimary ?? ''} onChange={e => update(d => ({ ...d, profile: { ...d.profile, powerStylePrimary: e.target.value } }))} />
          </label>
          <label>
            Power Style (Secondary)
            <input value={doc.profile.powerStyleSecondary ?? ''} onChange={e => update(d => ({ ...d, profile: { ...d.profile, powerStyleSecondary: e.target.value } }))} />
          </label>
        </div>
      </div>

      <hr />

      <div className="grid">
        <div className="panel">
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Augments</div>
          <div className="small">Simple list for now. Add a UI later to pull from an augment catalog.</div>
          <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
            {doc.progression.augments.map((a, idx) => (
              <div key={`${a}-${idx}`} className="row" style={{ justifyContent: 'space-between' }}>
                <div>{a}</div>
                <button className="ghost" onClick={() => update(d => ({ ...d, progression: { ...d.progression, augments: d.progression.augments.filter((_, i) => i !== idx) } }))}>Remove</button>
              </div>
            ))}
            {doc.progression.augments.length === 0 ? <div className="small">No augments yet.</div> : null}
          </div>
          <button
            className="ghost"
            onClick={() => {
              const name = prompt('Augment name');
              if (!name) return;
              update(d => ({ ...d, progression: { ...d.progression, augments: [name.trim(), ...d.progression.augments] } }));
            }}
          >
            Add Augment
          </button>
        </div>

        <div className="panel">
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Resonance</div>
          <label>
            Resonance Points
            <input type="number" value={doc.resonance.points} onChange={e => update(d => ({ ...d, resonance: { ...d.resonance, points: clamp(Number(e.target.value || 0), 0, 999) } }))} />
          </label>
          <label>
            Banked
            <input type="number" value={doc.resonance.banked} onChange={e => update(d => ({ ...d, resonance: { ...d.resonance, banked: clamp(Number(e.target.value || 0), 0, 999) } }))} />
          </label>
          <label>
            Next Combat Regen Penalty
            <input type="checkbox" checked={doc.resonance.nextCombatRegenPenalty} onChange={e => update(d => ({ ...d, resonance: { ...d.resonance, nextCombatRegenPenalty: e.target.checked } }))} />
          </label>
          <label>
            Surge Active
            <input type="checkbox" checked={doc.resonance.surge.active} onChange={e => update(d => ({ ...d, resonance: { ...d.resonance, surge: { ...d.resonance.surge, active: e.target.checked } } }))} />
          </label>
          <label>
            Aftermath Pending
            <input type="checkbox" checked={doc.resonance.surge.aftermathPending} onChange={e => update(d => ({ ...d, resonance: { ...d.resonance, surge: { ...d.resonance.surge, aftermathPending: e.target.checked } } }))} />
          </label>
        </div>
      </div>

      <label>
        Backstory
        <textarea value={doc.story.backstory} onChange={e => update(d => ({ ...d, story: { ...d.story, backstory: e.target.value } }))} />
      </label>

      <label>
        Session notes
        <textarea value={doc.story.notes} onChange={e => update(d => ({ ...d, story: { ...d.story, notes: e.target.value } }))} />
      </label>

      <hr />

      <div style={{ fontWeight: 800, marginBottom: 8 }}>Reputation (0 to 400)</div>
      <div className="grid">
        {repKeys.map(k => (
          <div key={k} className="panel">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 700 }}>{k.toUpperCase()}</div>
              <div className="row">
                <button className="ghost" onClick={() => update(d => ({ ...d, story: { ...d.story, reputation: { ...d.story.reputation, [k]: repClamp(d.story.reputation[k] - 10) } } }))}>-10</button>
                <button className="ghost" onClick={() => update(d => ({ ...d, story: { ...d.story, reputation: { ...d.story.reputation, [k]: repClamp(d.story.reputation[k] + 10) } } }))}>+10</button>
              </div>
            </div>
            <input type="range" min={0} max={400} value={doc.story.reputation[k]} onChange={e => update(d => ({ ...d, story: { ...d.story, reputation: { ...d.story.reputation, [k]: repClamp(Number(e.target.value || 0)) } } }))} />
            <div className="small">{doc.story.reputation[k]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
