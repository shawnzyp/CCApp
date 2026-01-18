import React from 'react';
import { loginWithGoogle, logout } from '../auth';
import { useAppStore } from '../state/store';
import { manualSave } from '../state/syncEngine';

export default function HeaderBar() {
  const uid = useAppStore(s => s.uid);
  const heroId = useAppStore(s => s.heroId);
  const sync = useAppStore(s => s.sync);
  const conflict = useAppStore(s => s.conflict);

  const status = !uid ? 'Signed out' : conflict ? 'Conflict' : !sync.online ? 'Offline' : sync.dirty ? 'Unsaved changes' : 'Saved';
  const cls = !uid ? 'badge' : conflict ? 'badge danger' : !sync.online ? 'badge warn' : sync.dirty ? 'badge warn' : 'badge ok';

  return (
    <div className="header">
      <div className="row">
        <div style={{ fontWeight: 700 }}>Catalyst Core Tracker</div>
        <span className={cls}>{status}</span>
        {sync.lastError ? <span className="badge danger">{sync.lastError}</span> : null}
      </div>

      <div className="row">
        {uid ? (
          <>
            <button className="ghost" onClick={() => manualSave('manual')} disabled={!heroId || !!conflict}>
              Save
            </button>
            <button className="ghost" onClick={() => logout()}>Sign out</button>
          </>
        ) : (
          <button className="primary" onClick={() => loginWithGoogle()}>Sign in with Google</button>
        )}
      </div>
    </div>
  );
}
