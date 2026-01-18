import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../state/store';
import { bootstrapHeroes, createHero, importLegacyHero, loadHero, scheduleCloudPush } from '../state/syncEngine';
import RestorePoints from './RestorePoints';

export default function HeroPicker() {
  const uid = useAppStore(s => s.uid);
  const heroId = useAppStore(s => s.heroId);
  const doc = useAppStore(s => s.doc);

  const [ids, setIds] = useState<string[]>([]);
  const [newName, setNewName] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

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
    <div>
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

        <hr />

        <div className="row">
          <button className="ghost" onClick={() => fileRef.current?.click()}>
            Import Legacy JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file || !uid) return;
              setImportError(null);
              try {
                const text = await file.text();
                const raw = JSON.parse(text);
                const id = await importLegacyHero(uid, raw);
                setIds(prev => Array.from(new Set([id, ...prev])));
                scheduleCloudPush();
              } catch (err) {
                setImportError('Could not import legacy JSON. Check the file format.');
              } finally {
                e.target.value = '';
              }
            }}
          />
          {importError ? <div className="small">{importError}</div> : null}
        </div>
      </div>
      {uid && heroId && doc ? <RestorePoints uid={uid} heroId={heroId} /> : null}
    </div>
  );
}
