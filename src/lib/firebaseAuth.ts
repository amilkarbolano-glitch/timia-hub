// ─── Firebase Authentication (proveedor Google) ─────────────────────────────
// La configuración pública llega desde la API (/api/auth/config → firebase) o desde
// window.TIMIA_FIREBASE en public/config.js. Solo se carga el SDK cuando hay config.
import type { FirebaseApp } from 'firebase/app';

export interface FirebaseWebConfig { apiKey: string; authDomain: string; projectId: string; appId?: string }

declare global { interface Window { TIMIA_FIREBASE?: FirebaseWebConfig } }

let app: FirebaseApp | null = null;

async function getApp(cfg: FirebaseWebConfig): Promise<FirebaseApp> {
  if (app) return app;
  const { initializeApp, getApps } = await import('firebase/app');
  app = getApps()[0] ?? initializeApp({ apiKey: cfg.apiKey, authDomain: cfg.authDomain, projectId: cfg.projectId, appId: cfg.appId });
  return app;
}

/** Abre el popup de Google vía Firebase y devuelve el ID token de Firebase (para POST /api/auth/firebase). */
export async function signInWithGoogleFirebase(cfg: FirebaseWebConfig, hd?: string): Promise<{ idToken: string; email: string | null }> {
  const a = await getApp(cfg);
  const { getAuth, GoogleAuthProvider, signInWithPopup, setPersistence, browserSessionPersistence } = await import('firebase/auth');
  const auth = getAuth(a);
  await setPersistence(auth, browserSessionPersistence);     // la sesión real la lleva la cookie de la API
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account', ...(hd ? { hd } : {}) });
  const cred = await signInWithPopup(auth, provider);
  const idToken = await cred.user.getIdToken();
  return { idToken, email: cred.user.email };
}

export async function signOutFirebase(): Promise<void> {
  if (!app) return;
  try { const { getAuth, signOut } = await import('firebase/auth'); await signOut(getAuth(app)); } catch {}
}
