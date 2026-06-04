'use client';

import { useState, useEffect } from 'react';
import { User, onAuthStateChanged, Auth, signInAnonymously } from 'firebase/auth';

/**
 * Hook untuk memantau status autentikasi pengguna.
 * Memastikan pengguna selalu login (secara anonim) sebelum menghentikan status loading.
 */
export function useUser(auth: Auth) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Berlangganan ke perubahan status auth
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        // Jika tidak ada user, coba login anonim
        try {
          await signInAnonymously(auth);
          // onAuthStateChanged akan dipicu kembali setelah login berhasil
        } catch (error) {
          console.error("Gagal login anonim:", error);
          setLoading(false);
        }
      } else {
        // User berhasil didapat
        setUser(currentUser);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [auth]);

  return { user, loading };
}
