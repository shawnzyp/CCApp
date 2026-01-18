import React, { useMemo, useState } from 'react';
import { useAppStore } from '../state/store';
import { uuid } from '../lib/ids';
import { scheduleCloudPush, scheduleLocalSave } from '../state/syncEngine';
import type { PowerCard } from '../state/models';

export default function PowersTab() {
  const doc = useAppStore(s => s.doc);
  const setDoc = useAppStore(s => s.setDoc);
  const markDirty = useAppStore(s => s.markDirty);

  const [selected, setSelected] = useState<string | null>(null);

  const update = (fn: (d: NonNullable<typeof doc>) => NonNullable<typeof doc>) => {
    setDoc(fn);
    markDirty();
    scheduleLocalSave();
    scheduleCloudPush();
  };

  if (!doc) return <div className="panel">Open or create a hero first.</div>;

  const cards = doc.powers;
  const current = useMemo(() => cards.find(c => c.id === selected) ?? null, [cards, selected]);

  const upsert = (patch: Partial<PowerCard>) => {
    if (!current) return;
    update(d => ({
      ...d,
      powers: d.powers.map(p => p.id === current.id ? { ...p, ...patch } : p)
    }));
  };

  const addNew = (signature: boolean) => {
    const id = uuid();
    const card: PowerCard = {
      id,
      name: signature ? 'New Signature Move' : 'New Power',
      signature,
      actionType: 'Action',
      range: 'Melee',
      duration: 'Instant',
      effectTag: 'Damage',
      spCost: 1,
      requiresSave: false,
      concentration: false,
      cooldown: 0,
      uses: 'At-will',
      description: ''
    };
    update(d => ({ ...d, powers: [card, ...d.powers] }));
    setSelected(id);
  };

  const remove = () => {
    if (!current) return;
    update(d => ({ ...d, powers: d.powers.filter(p => p.id !== current.id) }));
    setSelected(null);
  };

  const snapshotVersion = (note: string) => {
    if (!current) return;
    const at = Date.now();
    const snap = { ...current };
    delete (snap as any).history;
    const history = current.history ?? [];
    upsert({ history: [{ at, note, snapshot: snap }, ...history], versionNotes: '' });
  };

  return (
    <div className="panel">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 800 }}>Powers</div>
          <div className="small">Add custom powers and signature moves. Version notes create evolution history.</div>
        </div>
        <div className="row">
          <button className="ghost" onClick={() => addNew(false)}>New Power</button>
          <button className="primary" onClick={() => addNew(true)}>New Signature</button>
        </div>
      </div>

      <hr />

      <div className="grid" style={{ gridTemplateColumns: '320px 1fr' }}>
        <div className="panel">
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Cards</div>
          <div style={{ display: 'grid', gap: 6 }}>
            {cards.map(c => (
              <button
                key={c.id}
                className={c.id === selected ? 'tabBtn active' : 'tabBtn'}
                style={{ textAlign: 'left' }}
                onClick={() => setSelected(c.id)}
              >
                <div style={{ fontWeight: 700 }}>{c.name}</div>
                <div className="small">{c.signature ? 'Signature' : 'Power'} | {c.actionType ?? ''} | Cost {c.spCost ?? 0} SP</div>
              </button>
            ))}
            {cards.length === 0 ? <div className="small">No powers yet.</div> : null}
          </div>
        </div>

        <div className="panel">
          {!current ? (
            <div className="small">Select a power card to edit.</div>
          ) : (
            <>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 800 }}>{current.signature ? 'Signature Move' : 'Power'}</div>
                <button className="ghost" onClick={remove}>Delete</button>
              </div>

              <div className="grid">
                <label>
                  Name
                  <input value={current.name} onChange={e => upsert({ name: e.target.value })} />
                </label>
                <label>
                  Action Type
                  <select value={current.actionType ?? ''} onChange={e => upsert({ actionType: e.target.value })}>
                    <option>Action</option>
                    <option>Bonus Action</option>
                    <option>Reaction</option>
                    <option>Passive</option>
                  </select>
                </label>
                <label>
                  Range
                  <input value={current.range ?? ''} onChange={e => upsert({ range: e.target.value })} />
                </label>
                <label>
                  SP Cost
                  <input type="number" value={current.spCost ?? 0} onChange={e => upsert({ spCost: Number(e.target.value || 0) })} />
                </label>
                <label>
                  Requires Save
                  <input type="checkbox" checked={!!current.requiresSave} onChange={e => upsert({ requiresSave: e.target.checked })} />
                </label>
                <label>
                  Save Ability
                  <select value={current.saveAbilityTarget ?? ''} onChange={e => upsert({ saveAbilityTarget: e.target.value })}>
                    <option value="">None</option>
                    <option>STR</option>
                    <option>DEX</option>
                    <option>CON</option>
                    <option>INT</option>
                    <option>WIS</option>
                    <option>CHA</option>
                  </select>
                </label>
                <label>
                  Save DC
                  <input type="number" value={current.saveDC ?? 0} onChange={e => upsert({ saveDC: Number(e.target.value || 0) })} />
                </label>
                <label>
                  Cooldown (rounds)
                  <input type="number" value={current.cooldown ?? 0} onChange={e => upsert({ cooldown: Number(e.target.value || 0) })} />
                </label>
                <label>
                  Concentration
                  <input type="checkbox" checked={!!current.concentration} onChange={e => upsert({ concentration: e.target.checked })} />
                </label>
                <label>
                  Uses
                  <input value={current.uses ?? ''} onChange={e => upsert({ uses: e.target.value })} placeholder="At-will, 1/encounter, 1/session..." />
                </label>
              </div>

              <label>
                Description
                <textarea value={current.description ?? ''} onChange={e => upsert({ description: e.target.value })} />
              </label>

              <label>
                Version note (used to snapshot evolution)
                <input value={current.versionNotes ?? ''} onChange={e => upsert({ versionNotes: e.target.value })} placeholder="What changed and why" />
              </label>

              <div className="row">
                <button className="primary" onClick={() => snapshotVersion(current.versionNotes?.trim() || 'Update')}>Save Evolution Note</button>
              </div>

              {current.history?.length ? (
                <>
                  <hr />
                  <div style={{ fontWeight: 800 }}>Evolution History</div>
                  <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                    {current.history.map(h => (
                      <div key={h.at} className="badge" style={{ borderRadius: 10, padding: 10, display: 'grid', gap: 6 }}>
                        <div style={{ fontWeight: 700 }}>{new Date(h.at).toLocaleString()}</div>
                        <div>{h.note}</div>
                        <div className="small">Snapshot: {h.snapshot.name} | Cost {h.snapshot.spCost ?? 0} SP | {h.snapshot.range ?? ''}</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
