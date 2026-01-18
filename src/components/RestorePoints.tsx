import React, { useEffect, useMemo, useState } from 'react';
import { fetchHeroSnapshots, type SnapshotEntry } from '../storage/cloud';
import { manualSave, scheduleLocalSave } from '../state/syncEngine';
import { useAppStore } from '../state/store';

type Props = {
  uid: string;
  heroId: string;
};

export default function RestorePoints({ uid, heroId }: Props) {
  const [snapshots, setSnapshots] = useState<SnapshotEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const setDoc = useAppStore(s => s.setDoc);
  const markDirty = useAppStore(s => s.markDirty);

  const loadSnapshots = async () => {
    setLoading(true);
    try {
      const list = await fetchHeroSnapshots(uid, heroId);
      setSnapshots(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSnapshots();
  }, [uid, heroId]);

  const sorted = useMemo(() => {
    return [...snapshots].sort((a, b) => b.savedAt - a.savedAt);
  }, [snapshots]);

  const restore = async (snap: SnapshotEntry) => {
    setDoc(() => snap.doc);
    markDirty();
    scheduleLocalSave();
    await manualSave('snapshot');
  };

  return (
    <div className="panel">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 700 }}>Restore Points</div>
          <div className="small">Snapshots from cloud saves. Restores overwrite local edits.</div>
        </div>
        <button className="ghost" onClick={loadSnapshots} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
      <hr />
      {sorted.length === 0 ? (
        <div className="small">No snapshots yet.</div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {sorted.map(snap => (
            <div key={snap.id} className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{new Date(snap.savedAt || Date.now()).toLocaleString()}</div>
                <div className="small">Reason: {snap.reason}</div>
              </div>
              <button className="primary" onClick={() => restore(snap)}>Restore</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
