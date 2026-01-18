import React, { useMemo, useState } from 'react';
import { useAppStore } from '../state/store';
import { uuid } from '../lib/ids';
import { scheduleCloudPush, scheduleLocalSave } from '../state/syncEngine';
import type { GearItem } from '../state/models';

export default function GearTab() {
  const doc = useAppStore(s => s.doc);
  const setDoc = useAppStore(s => s.setDoc);
  const markDirty = useAppStore(s => s.markDirty);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<GearItem['category']>('Item');
  const [cost, setCost] = useState(0);
  const [tcBonus, setTcBonus] = useState(0);

  if (!doc) return <div className="panel">Open or create a hero first.</div>;

  const update = (fn: (d: typeof doc) => typeof doc) => {
    setDoc(fn);
    markDirty();
    scheduleLocalSave();
    scheduleCloudPush();
  };

  const equipped = doc.gear.equipped;
  const inv = doc.gear.inventory;

  const totalEquippedCost = useMemo(() => {
    const ids = new Set([equipped.armor, equipped.shield, equipped.utility, ...equipped.weapons].filter(Boolean) as string[]);
    return inv.filter(i => ids.has(i.id)).reduce((sum, i) => sum + (i.cost ?? 0), 0);
  }, [equipped, inv]);

  const equip = (slot: 'armor'|'shield'|'utility', id: string) => {
    update(d => ({ ...d, gear: { ...d.gear, equipped: { ...d.gear.equipped, [slot]: id } } }));
  };

  const toggleWeapon = (id: string) => {
    update(d => {
      const cur = d.gear.equipped.weapons;
      const has = cur.includes(id);
      return { ...d, gear: { ...d.gear, equipped: { ...d.gear.equipped, weapons: has ? cur.filter(x => x !== id) : [id, ...cur] } } };
    });
  };

  const addItem = () => {
    const n = name.trim();
    if (!n) return;
    const item: GearItem = { id: uuid(), name: n, category, cost, tcBonus, notes: '' };
    update(d => ({ ...d, gear: { ...d.gear, inventory: [item, ...d.gear.inventory] } }));
    setName('');
    setCost(0);
    setTcBonus(0);
  };

  const adjustCredits = (delta: number) => {
    update(d => ({ ...d, gear: { ...d.gear, credits: Math.max(0, d.gear.credits + delta) } }));
  };

  const removeItem = (id: string) => {
    update(d => ({ ...d, gear: { ...d.gear, inventory: d.gear.inventory.filter(i => i.id !== id), equipped: { ...d.gear.equipped, weapons: d.gear.equipped.weapons.filter(w => w !== id), armor: d.gear.equipped.armor === id ? undefined : d.gear.equipped.armor, shield: d.gear.equipped.shield === id ? undefined : d.gear.equipped.shield, utility: d.gear.equipped.utility === id ? undefined : d.gear.equipped.utility } } }));
  };

  return (
    <div className="panel">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 800 }}>Gear</div>
          <div className="small">Track inventory, equip items, and manage credits.</div>
        </div>
        <div className="row">
          <span className="badge">Credits: <b style={{ color: 'var(--text)' }}>{doc.gear.credits}</b></span>
          <span className="badge">Equipped cost: <b style={{ color: 'var(--text)' }}>{totalEquippedCost}</b></span>
          <button className="ghost" onClick={() => adjustCredits(-10)}>-10</button>
          <button className="ghost" onClick={() => adjustCredits(+10)}>+10</button>
        </div>
      </div>

      <hr />

      <div className="grid">
        <label>
          Item name
          <input value={name} onChange={e => setName(e.target.value)} />
        </label>
        <label>
          Category
          <select value={category} onChange={e => setCategory(e.target.value as any)}>
            <option>Weapon</option>
            <option>Armor</option>
            <option>Shield</option>
            <option>Utility</option>
            <option>Item</option>
          </select>
        </label>
        <label>
          Cost
          <input type="number" value={cost} onChange={e => setCost(Number(e.target.value || 0))} />
        </label>
        <label>
          TC Bonus
          <input type="number" value={tcBonus} onChange={e => setTcBonus(Number(e.target.value || 0))} />
        </label>
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <button className="primary" onClick={addItem}>Add</button>
      </div>

      <hr />

      <div style={{ fontWeight: 800, marginBottom: 8 }}>Inventory</div>
      <div style={{ display: 'grid', gap: 8 }}>
        {inv.map(i => {
          const isEquipped = i.id === equipped.armor || i.id === equipped.shield || i.id === equipped.utility || equipped.weapons.includes(i.id);
          return (
            <div key={i.id} className="panel">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{i.name}</div>
                  <div className="small">{i.category} | Cost {i.cost ?? 0} | TC +{i.tcBonus ?? 0}</div>
                </div>
                <div className="row">
                  {isEquipped ? <span className="badge ok">Equipped</span> : <span className="badge">Not equipped</span>}
                  <button className="ghost" onClick={() => removeItem(i.id)}>Delete</button>
                </div>
              </div>

              <div className="row" style={{ marginTop: 8 }}>
                {i.category === 'Armor' ? <button className="ghost" onClick={() => equip('armor', i.id)}>Equip Armor</button> : null}
                {i.category === 'Shield' ? <button className="ghost" onClick={() => equip('shield', i.id)}>Equip Shield</button> : null}
                {i.category === 'Utility' ? <button className="ghost" onClick={() => equip('utility', i.id)}>Equip Utility</button> : null}
                {i.category === 'Weapon' ? <button className="ghost" onClick={() => toggleWeapon(i.id)}>{equipped.weapons.includes(i.id) ? 'Unequip Weapon' : 'Equip Weapon'}</button> : null}
              </div>
            </div>
          );
        })}
        {inv.length === 0 ? <div className="small">No items yet.</div> : null}
      </div>
    </div>
  );
}
