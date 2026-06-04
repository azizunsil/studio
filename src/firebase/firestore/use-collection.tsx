
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Query,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
  FirestoreError,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

/**
 * Hook untuk mendengarkan perubahan pada koleksi Firestore secara real-time.
 */
export function useCollection<T = DocumentData>(query: Query<T> | null) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    if (!query) {
      setLoading(false);
      setData([]);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      query,
      { includeMetadataChanges: true },
      (snapshot: QuerySnapshot<T>) => {
        const items = snapshot.docs.map((doc) => ({
          ...(doc.data() as any),
          id: doc.id,
        }));
        setData(items);
        setLoading(false);
        setError(null);
      },
      async (err) => {
        let path = 'unknown';
        try {
          path = (query as any)?._query?.path?.toString() || 'products';
        } catch (e) {}

        const permissionError = new FirestorePermissionError({
          path: path,
          operation: 'list',
        } satisfies SecurityRuleContext);

        errorEmitter.emit('permission-error', permissionError);
        
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [query]);

  return { data, loading, error };
}

export function useMemoFirebase<T>(factory: () => T, deps: any[]): T {
  return useMemo(factory, deps);
}
