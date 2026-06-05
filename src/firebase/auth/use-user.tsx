'use client';

import { useState, useEffect } from 'react';
import { User, onAuthStateChanged, Auth, signInAnonymously, getRedirectResult } from 'firebase/auth';

/**
 * Hook untuk memantau status autentikasi pengguna.
 * Memastikan sesi anonim aktif sebelum mengizinkan akses ke database.
 * Juga menangani hasil dari login redirect Google.
 */
export function useUser(auth: Auth) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Menangani hasil dari signInWithRedirect jika user baru saja kembali dari login Google
    // Ini dieksekusi setiap kali aplikasi dimuat ulang
    getRedirectResult(auth)
      .then((result) => {
        if (isMounted && result?.user) {
          setUser(result.user);
        }
      })
      .catch((error) => {
        if (isMounted) {
          // Hanya log error jika bukan error "no redirect in progress"
          if (error.code !== 'auth/no-auth-event') {
            console.error("Redirect Login Error:", error);
          }
        }
      });

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!isMounted) return;

      if (currentUser) {
        setUser(currentUser);
        setLoading(false);
      } else {
        // Jika tidak ada user sama sekali, lakukan sign-in anonim agar aplikasi tetap bisa digunakan
        try {
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
