import React from 'react';
import { loginWithGoogle, logout } from '../auth';
import { useAppStore } from '../state/store';
import { manualSave } from '../state/syncEngine';
import { firebaseReady, firebaseInitError } from '../firebase';

export default function HeaderBar() {
  const uid = useAppStore(s => s.uid);
  const heroId = useAppStore(s => s.heroId);
  const sync = useAppStore(s => s.sync);

  const status = !firebaseReady ? 'Firebase not configured' : !uid ? 'Signed out' : !sync.online ? 'Offline' : sync.dirty ? 'Unsaved changes' : 'Saved';
  const cls = !firebaseReady ? 'badge warn' : !uid ? 'badge' : !sync.online ? 'badge warn' : sync.dirty ? 'badge warn' : 'badge ok';

  return (
    <div className="header">
      <div className="row">
        <div style={{ fontWeight: 700 }}>Catalyst Core Tracker</div>
        <span className={cls}>{status}</span>
        {sync.lastError ? <span className="badge danger">{sync.lastError}</span> : null}
      </div>

      <div className="row">
        {firebaseReady ? (
          uid ? (
          <>
            <button className="ghost" onClick={() => manualSave('manual')} disabled={!heroId}>
              Save
            </button>
            <button className="ghost" onClick={() => logout()}>Sign out</button>
          </>
          ) : (
            <button className="primary" onClick={async () => {
              try {
                await loginWithGoogle();
              } catch (e: any) {
                // handled by App setup panel; keep UI stable
                console.error(e);
              }
            }}>Sign in with Google</button>
          )
        ) : (
          <span className="small" style={{ opacity: 0.85 }}>Configure Firebase below to enable sign-in and cloud save.</span>
        )}
      </div>
    </div>
  );
}
