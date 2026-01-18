import React from 'react';
import { useAppStore } from '../state/store';
import { clamp } from '../lib/math';
import { scheduleCloudPush, scheduleLocalSave } from '../state/syncEngine';

function Stepper({ label, value, onChange, min = 0, max = 9999 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="row" style={{ justifyContent: 'space-between' }}>
      <div style={{ fontWeight: 700 }}>{label}</div>
      <div className="row">
        <button className="ghost" onClick={() => onChange(clamp(value - 1, min, max))}>-</button>
        <div style={{ minWidth: 60, textAlign: 'center' }}>{value}</div>
        <button className="ghost" onClick={() => onChange(clamp(value + 1, min, max))}>+</button>
      </div>
    </div>
  );
}

export default function CombatTab() {
  const doc = useAppStore(s => s.doc);
  const setDoc = useAppStore(s => s.setDoc);
  const markDirty = useAppStore(s => s.markDirty);

  if (!doc) return <div className="panel">Open or create a hero first.</div>;

  const c = doc.combat;

  const update = (fn: (d: typeof doc) => typeof doc) => {
    setDoc(fn);
    markDirty();
    scheduleLocalSave();
    scheduleCloudPush();
  };

  const condKeys = Object.keys(c.conditions);

  return (
    <div className="panel">
      <div className="grid">
        <div className="panel">
          <div style={{ fontWeight: 800, marginBottom: 8 }}>HP</div>
          <Stepper label="Current" value={c.hp.current} onChange={(v) => update(d => ({ ...d, combat: { ...d.combat, hp: { ...d.combat.hp, current: v } } }))} max={c.hp.max + c.hp.temp} />
          <Stepper label="Max" value={c.hp.max} onChange={(v) => update(d => ({ ...d, combat: { ...d.combat, hp: { ...d.combat.hp, max: v, current: Math.min(d.combat.hp.current, v + d.combat.hp.temp) } } }))} />
          <Stepper label="Temp" value={c.hp.temp} onChange={(v) => update(d => ({ ...d, combat: { ...d.combat, hp: { ...d.combat.hp, temp: v, current: Math.min(d.combat.hp.current, d.combat.hp.max + v) } } }))} />
          <div className="small">Quick actions: long rest and full reset are handled in Story tab for now.</div>
        </div>

        <div className="panel">
          <div style={{ fontWeight: 800, marginBottom: 8 }}>SP</div>
          <Stepper label="Current" value={c.sp.current} onChange={(v) => update(d => ({ ...d, combat: { ...d.combat, sp: { ...d.combat.sp, current: v } } }))} max={c.sp.max + c.sp.temp} />
          <Stepper label="Max" value={c.sp.max} onChange={(v) => update(d => ({ ...d, combat: { ...d.combat, sp: { ...d.combat.sp, max: v, current: Math.min(d.combat.sp.current, v + d.combat.sp.temp) } } }))} />
          <Stepper label="Temp" value={c.sp.temp} onChange={(v) => update(d => ({ ...d, combat: { ...d.combat, sp: { ...d.combat.sp, temp: v, current: Math.min(d.combat.sp.current, d.combat.sp.max + v) } } }))} />
          <div className="small">Catalyst Core rule: SP fully refreshes at the start of each combat round.</div>
        </div>

        <div className="panel">
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Initiative & Round</div>
          <label>
            Initiative Roll
            <input type="number" value={c.initiative} onChange={e => update(d => ({ ...d, combat: { ...d.combat, initiative: Number(e.target.value || 0) } }))} />
          </label>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700 }}>Round {c.round}</div>
            <div className="row">
              <button className="ghost" onClick={() => update(d => ({ ...d, combat: { ...d.combat, round: Math.max(1, (d.combat.round ?? 1) - 1) } }))}>-1</button>
              <button
                className="primary"
                onClick={() => update(d => ({
                  ...d,
                  combat: {
                    ...d.combat,
                    round: (d.combat.round ?? 1) + 1,
                    sp: { ...d.combat.sp, current: d.combat.sp.max + d.combat.sp.temp }
                  }
                }))}
              >
                Next Round
              </button>
            </div>
          </div>
          <div className="small">Advancing the round auto-refills SP to max.</div>
        </div>

        <div className="panel">
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Death Saves</div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
            <label>
              Mode
              <select value={c.deathSaves.mode} onChange={e => update(d => ({ ...d, combat: { ...d.combat, deathSaves: { ...d.combat.deathSaves, mode: e.target.value as any } } }))}>
                <option value="normal">Normal</option>
                <option value="adv">Adv</option>
                <option value="dis">Dis</option>
              </select>
            </label>
            <label>
              Modifier
              <input type="number" value={c.deathSaves.mod} onChange={e => update(d => ({ ...d, combat: { ...d.combat, deathSaves: { ...d.combat.deathSaves, mod: Number(e.target.value || 0) } } }))} />
            </label>
          </div>
          <Stepper label="Success" value={c.deathSaves.success} onChange={(v) => update(d => ({ ...d, combat: { ...d.combat, deathSaves: { ...d.combat.deathSaves, success: clamp(v, 0, 3) } } }))} max={3} />
          <Stepper label="Fail" value={c.deathSaves.fail} onChange={(v) => update(d => ({ ...d, combat: { ...d.combat, deathSaves: { ...d.combat.deathSaves, fail: clamp(v, 0, 3) } } }))} max={3} />
          <button className="ghost" onClick={() => update(d => ({ ...d, combat: { ...d.combat, deathSaves: { ...d.combat.deathSaves, success: 0, fail: 0 } } }))}>Reset</button>
        </div>

        <div className="panel">
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Stats</div>
          <label>
            TC (Toughness Class)
            <input type="number" value={c.tc} onChange={e => update(d => ({ ...d, combat: { ...d.combat, tc: Number(e.target.value || 0) } }))} />
          </label>
          <label>
            Speed
            <input type="number" value={c.speed} onChange={e => update(d => ({ ...d, combat: { ...d.combat, speed: Number(e.target.value || 0) } }))} />
          </label>
          <label>
            Passive Perception
            <input type="number" value={c.passivePerception} onChange={e => update(d => ({ ...d, combat: { ...d.combat, passivePerception: Number(e.target.value || 0) } }))} />
          </label>
          <label>
            Cinematic Action Point (CAP) used
            <input type="checkbox" checked={c.capUsed} onChange={e => update(d => ({ ...d, combat: { ...d.combat, capUsed: e.target.checked } }))} />
          </label>
        </div>
      </div>

      <hr />

      <div style={{ fontWeight: 800, marginBottom: 8 }}>Conditions</div>
      <div className="grid">
        {condKeys.map(k => (
          <label key={k}>
            <span>{k}</span>
            <input type="checkbox" checked={c.conditions[k]} onChange={e => update(d => ({ ...d, combat: { ...d.combat, conditions: { ...d.combat.conditions, [k]: e.target.checked } } }))} />
          </label>
        ))}
      </div>
    </div>
  );
}
