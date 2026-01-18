import React, { useMemo, useState } from 'react';
import {
  clearRuntimeFirebaseConfig,
  initFirebase,
  isConfigValid,
  loadRuntimeFirebaseConfig,
  saveRuntimeFirebaseConfig,
  type FirebaseConfig
} from '../firebase';

type Props = {
  onConfigured: () => void;
};

export default function FirebaseSetup({ onConfigured }: Props) {
  const existing = useMemo(() => loadRuntimeFirebaseConfig(), []);
  const [cfg, setCfg] = useState<Partial<FirebaseConfig>>(existing);
  const [msg, setMsg] = useState<string | null>(null);

  const setField = (k: keyof FirebaseConfig, v: string) => {
    setCfg(prev => ({ ...prev, [k]: v.trim() }));
  };

  const save = () => {
    if (!isConfigValid(cfg)) {
      setMsg('Missing required fields. Paste the full Firebase Web App config values.');
      return;
    }
    saveRuntimeFirebaseConfig(cfg);
    const r = initFirebase();
    if (!r.ready) {
      setMsg(r.error ?? 'Firebase init failed.');
      return;
    }
    setMsg(null);
    onConfigured();
  };

  const clear = () => {
    clearRuntimeFirebaseConfig();
    setCfg({});
    setMsg('Cleared local Firebase config.');
  };

  return (
    <div className="panel">
      <div style={{ fontWeight: 800, marginBottom: 6 }}>Firebase Setup</div>
      <div className="small" style={{ marginBottom: 10 }}>
        This build is designed to work on GitHub Pages without build-time secrets.
        Paste your Firebase Web App config once and it will be stored locally on this device.
      </div>

      {msg ? <div className="badge warn" style={{ borderRadius: 10, padding: 10 }}>{msg}</div> : null}

      <div className="grid">
        <label>
          API Key
          <input value={cfg.apiKey ?? ''} onChange={e => setField('apiKey', e.target.value)} placeholder="AIza..." />
        </label>
        <label>
          Auth Domain
          <input value={cfg.authDomain ?? ''} onChange={e => setField('authDomain', e.target.value)} placeholder="yourapp.firebaseapp.com" />
        </label>
        <label>
          Database URL
          <input value={cfg.databaseURL ?? ''} onChange={e => setField('databaseURL', e.target.value)} placeholder="https://<project>.firebaseio.com" />
        </label>
        <label>
          Project ID
          <input value={cfg.projectId ?? ''} onChange={e => setField('projectId', e.target.value)} placeholder="ccccg-7d6b6" />
        </label>
        <label>
          App ID
          <input value={cfg.appId ?? ''} onChange={e => setField('appId', e.target.value)} placeholder="1:123:web:abc..." />
        </label>
        <label>
          Storage Bucket (optional)
          <input value={cfg.storageBucket ?? ''} onChange={e => setField('storageBucket', e.target.value)} />
        </label>
        <label>
          Messaging Sender ID (optional)
          <input value={cfg.messagingSenderId ?? ''} onChange={e => setField('messagingSenderId', e.target.value)} />
        </label>
      </div>

      <div className="row" style={{ marginTop: 10 }}>
        <button className="primary" onClick={save}>Save Firebase Config</button>
        <button className="ghost" onClick={clear}>Clear</button>
      </div>

      <div className="small" style={{ marginTop: 10, opacity: 0.85 }}>
        Reminder: in Firebase Console, add shawnzyp.github.io to Authorized domains for Auth.
      </div>
    </div>
  );
}
