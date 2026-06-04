'use client';

import React, { createContext, useContext } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Database } from 'firebase/database';
import { Auth } from 'firebase/auth';

interface FirebaseContextType {
  firebaseApp: FirebaseApp;
  database: Database;
  auth: Auth;
}

const FirebaseContext = createContext<FirebaseContextType | null>(null);

export function FirebaseProvider({
  children,
  firebaseApp,
  database,
  auth,
}: {
  children: React.ReactNode;
  firebaseApp: FirebaseApp;
  database: Database;
  auth: Auth;
}) {
  return (
    <FirebaseContext.Provider value={{ firebaseApp, database, auth }}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (!context) throw new Error('useFirebase must be used within a FirebaseProvider');
  return context;
}

export function useFirebaseApp() {
  return useFirebase().firebaseApp;
}

export function useDatabase() {
  return useFirebase().database;
}

export function useAuth() {
  return useFirebase().auth;
}
