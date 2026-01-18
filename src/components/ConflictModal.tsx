import React from 'react';
import { useAppStore } from '../state/store';
import { resolveConflictDuplicate, resolveConflictKeepLocal, resolveConflictUseCloud } from '../state/syncEngine';

export default function ConflictModal() {
  const conflict = useAppStore(s => s.conflict);
  if (!conflict) return null;

  const formatStamp = (value: unknown) => {
    if (typeof value === 'number') return new Date(value).toLocaleString();
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) return new Date(parsed).toLocaleString();
    }
    return new Date(Date.now()).toLocaleString();
  };
  const cloudStamp = formatStamp(conflict.cloud.meta.updatedAt);
  const localStamp = formatStamp(conflict.local.__local?.savedAt);

  return (
    <div className="modalBackdrop">
      <div className="modal">
        <div style={{ fontWeight: 800, marginBottom: 6 }}>Conflict detected</div>
        <div className="small" style={{ marginBottom: 10 }}>
          Cloud updates landed after local changes. Choose how to resolve.
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div className="panel">
            <div style={{ fontWeight: 700 }}>Local version</div>
            <div className="small">Last local save: {localStamp}</div>
            <div className="row" style={{ marginTop: 8 }}>
              <button className="primary" onClick={() => resolveConflictKeepLocal()}>Keep Local</button>
              <button className="ghost" onClick={() => resolveConflictDuplicate()}>Duplicate</button>
            </div>
          </div>
          <div className="panel">
            <div style={{ fontWeight: 700 }}>Cloud version</div>
            <div className="small">Last cloud update: {cloudStamp}</div>
            <div className="row" style={{ marginTop: 8 }}>
              <button className="primary" onClick={() => resolveConflictUseCloud()}>Use Cloud</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
