import React, { useEffect, useMemo, useState } from 'react';
import HeaderBar from './components/HeaderBar';
import HeroPicker from './components/HeroPicker';
import CombatTab from './tabs/CombatTab';
import AbilitiesTab from './tabs/AbilitiesTab';
import PowersTab from './tabs/PowersTab';
import GearTab from './tabs/GearTab';
import StoryTab from './tabs/StoryTab';
import { observeAuth } from './auth';
import { useAppStore } from './state/store';
import { manualSave, wireConnectivity } from './state/syncEngine';

const TABS = ['Combat', 'Abilities', 'Powers', 'Gear', 'Story'] as const;

export default function App() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Combat');
  const setUid = useAppStore(s => s.setUid);

  useEffect(() => {
    const unsubAuth = observeAuth((u) => {
      setUid(u?.uid ?? null);
    });
    const unwire = wireConnectivity();
    return () => {
      unsubAuth();
      unwire();
    };
  }, [setUid]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isSave = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's';
      if (!isSave) return;
      e.preventDefault();
      manualSave('manual');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const Current = useMemo(() => {
    switch (tab) {
      case 'Combat': return <CombatTab />;
      case 'Abilities': return <AbilitiesTab />;
      case 'Powers': return <PowersTab />;
      case 'Gear': return <GearTab />;
      case 'Story': return <StoryTab />;
      default: return <CombatTab />;
    }
  }, [tab]);

  return (
    <div className="container">
      <HeaderBar />
      <HeroPicker />

      <div className="tabs">
        {TABS.map(t => (
          <button
            key={t}
            className={t === tab ? 'tabBtn active' : 'tabBtn'}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {Current}

      <div className="small" style={{ marginTop: 12, opacity: 0.8 }}>
        Autosave: local is immediate. Cloud autosave runs on a short debounce when signed in.
      </div>
    </div>
  );
}
