import React, { useEffect, useState } from 'react';
import { useAppStore } from '../state/store';
import { bootstrapHeroes, createHero, loadHero } from '../state/syncEngine';

export default function HeroPicker() {
  const uid = useAppStore(s => s.uid);
  const heroId = useAppStore(s => s.heroId);
  const doc = useAppStore(s => s.doc);

  const [ids, setIds] = useState<string[]>([]);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!uid) return;
      const list = await bootstrapHeroes(uid);
      if (alive) setIds(list);
    })();
    return () => { alive = false; };
  }, [uid, heroId]);

  if (!uid) return null;

  return (
    <div className="panel">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 700 }}>Hero</div>
          <div className="small">Create or load a character. Local autosave always runs.</div>
        </div>

        <div className="row">
          <select value={heroId ?? ''} onChange={async (e) => {
            const id = e.target.value;
            if (!id) return;
            await loadHero(uid, id);
          }}>
            <option value="">Select...</option>
            {ids.map(id => (
              <option key={id} value={id}>{id === heroId ? `${id} (open)` : id}</option>
            ))}
          </select>
        </div>
      </div>

      <hr />

      <div className="row">
        <label style={{ minWidth: 280 }}>
          New hero name
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Specter, Surge, Flex..." />
        </label>
        <button className="primary" onClick={async () => {
          if (!uid) return;
          const name = newName.trim();
          if (!name) return;
          const id = await createHero(uid, name);
          setNewName('');
          setIds(prev => Array.from(new Set([id, ...prev])));
        }}>
          Create
        </button>
        {doc ? <div className="small">Open: <b>{doc.meta.heroName}</b></div> : null}
      </div>
    </div>
  );
}
