'use client';

import React, { useMemo } from 'react';
import { FirebaseProvider } from './provider';
import { initializeFirebase } from './index';

export function FirebaseClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const instances = useMemo(() => initializeFirebase(), []);

  return (
    <FirebaseProvider
      firebaseApp={instances.firebaseApp}
      database={instances.database}
      auth={instances.auth}
    >
      {children}
    </FirebaseProvider>
  );
}
