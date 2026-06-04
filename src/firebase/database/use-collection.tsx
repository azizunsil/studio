'use client';

import { useState, useEffect, useMemo } from 'react';
import { Database, ref, onValue, off } from 'firebase/database';

/**
 * Hook untuk mendengarkan perubahan pada koleksi Realtime Database (RTDB) secara real-time.
 */
export function useCollection<T = any>(db: Database | null, path: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!db || !path) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const dbRef = ref(db, path);

    const handleValue = (snapshot: any) => {
      const items: T[] = [];
      snapshot.forEach((childSnapshot: any) => {
        items.push({
          ...(childSnapshot.val() as any),
          id: childSnapshot.key,
        });
      });
      setData(items);
      setLoading(false);
      setError(null);
    };

    const handleError = (err: Error) => {
      setError(err);
      setLoading(false);
    };

    onValue(dbRef, handleValue, handleError);

    return () => {
      off(dbRef, 'value', handleValue);
    };
  }, [db, path]);

  return { data, loading, error };
}

export function useMemoFirebase<T>(factory: () => T, deps: any[]): T {
  return useMemo(factory, deps);
}
