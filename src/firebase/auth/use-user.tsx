
'use client';

import { useState, useEffect } from 'react';
import { User, onAuthStateChanged, Auth, signInAnonymously } from 'firebase/auth';

/**
 * Hook untuk memantau status autentikasi pengguna.
 * Memastikan sesi anonim aktif sebelum mengizinkan akses ke database.
 */
export function useUser(auth: Auth) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!isMounted) return;

      if (currentUser) {
        setUser(currentUser);
        setLoading(false);
      } else {
        try {
          // Melakukan login anonim jika tidak ada user
          await signInAnonymously(auth);
        } catch (error) {
          if (isMounted) {
            console.error("Auth Error (Anonymous):", error);
            setLoading(false);
          }
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [auth]);

  return { user, loading };
}
