'use client';

import { useState, useEffect } from 'react';
import { Database, ref, onValue, off } from 'firebase/database';

/**
 * Hook untuk mendengarkan perubahan pada satu dokumen Realtime Database secara real-time.
 */
export function useDoc<T = any>(db: Database | null, path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!db || !path) {
      setLoading(false);
      setData(null);
      return;
    }

    setLoading(true);
    const dbRef = ref(db, path);

    const handleValue = (snapshot: any) => {
      if (snapshot.exists()) {
        setData({ ...snapshot.val(), id: snapshot.key });
      } else {
        setData(null);
      }
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
