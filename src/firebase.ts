import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getDatabase, type Database } from 'firebase/database';

export type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  appId: string;
  storageBucket?: string;
  messagingSenderId?: string;
};

const STORAGE_KEY = 'ccapp:firebaseConfig';

function readEnvConfig(): Partial<FirebaseConfig> {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  };
}

export function loadRuntimeFirebaseConfig(): Partial<FirebaseConfig> {
  // Priority:
  // 1) localStorage runtime config (lets the app work on GitHub Pages without build-time secrets)
  // 2) build-time VITE_* env vars
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed as Partial<FirebaseConfig>;
    }
  } catch {
    // ignore
  }
  return readEnvConfig();
}

export function saveRuntimeFirebaseConfig(cfg: FirebaseConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

export function clearRuntimeFirebaseConfig() {
  localStorage.removeItem(STORAGE_KEY);
}

export function isConfigValid(cfg: Partial<FirebaseConfig>): cfg is FirebaseConfig {
  return Boolean(
    cfg.apiKey &&
    cfg.authDomain &&
    cfg.databaseURL &&
    cfg.projectId &&
    cfg.appId
  );
}

export let firebaseReady = false;
export let firebaseInitError: string | null = null;

let app: FirebaseApp | null = null;
export let auth: Auth | null = null;
export let db: Database | null = null;

export function initFirebase(): { ready: boolean; error: string | null } {
  const cfg = loadRuntimeFirebaseConfig();
  if (!isConfigValid(cfg)) {
    firebaseReady = false;
    firebaseInitError = 'Firebase is not configured.';
    return { ready: false, error: firebaseInitError };
  }

  try {
    app = initializeApp(cfg);
    auth = getAuth(app);
    db = getDatabase(app);
    firebaseReady = true;
    firebaseInitError = null;
    return { ready: true, error: null };
  } catch (e: any) {
    firebaseReady = false;
    firebaseInitError = String(e?.message ?? e);
    auth = null;
    db = null;
    return { ready: false, error: firebaseInitError };
  }
}

export function requireDb(): Database {
  if (!db) throw new Error(firebaseInitError || 'Firebase database is not available.');
  return db;
}

export function requireAuth(): Auth {
  if (!auth) throw new Error(firebaseInitError || 'Firebase auth is not available.');
  return auth;
}
