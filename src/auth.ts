import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User
} from 'firebase/auth';
import { requireAuth } from './firebase';

export function observeAuth(cb: (u: User | null) => void) {
  try {
    const auth = requireAuth();
    return onAuthStateChanged(auth, cb);
  } catch {
    // Firebase not configured yet. Report signed-out state.
    cb(null);
    return () => {};
  }
}

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  const auth = requireAuth();
  await signInWithPopup(auth, provider);
}

export async function logout() {
  const auth = requireAuth();
  await signOut(auth);
}
