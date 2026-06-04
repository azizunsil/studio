
'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { firebaseConfig } from './config';

/**
 * Inisialisasi Firebase App, Database (RTDB), dan Auth.
 */
export function initializeFirebase() {
  const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  const database = getDatabase(firebaseApp);
  const auth = getAuth(firebaseApp);

  return { firebaseApp, database, auth };
}

export * from './provider';
export * from './client-provider';
export * from './database/use-collection';
export * from './database/use-doc';
export * from './auth/use-user';
