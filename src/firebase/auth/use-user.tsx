'use client';

import { useState, useEffect } from 'react';
import { User, onAuthStateChanged, Auth, signInAnonymously, getRedirectResult } from 'firebase/auth';

/**
 * Hook untuk memantau status autentikasi pengguna.
 * Memastikan sesi anonim aktif sebelum mengizinkan akses ke database bagi user umum.
 * Juga menangani hasil dari login redirect Google.
 */
export function useUser(auth: Auth) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Menangani hasil dari signInWithRedirect jika user baru saja kembali dari login Google
    getRedirectResult(auth)
      .then((result) => {
        if (isMounted && result?.user) {
          // Jika ada hasil redirect, biarkan onAuthStateChanged menanganinya
          console.log("Redirect result success");
        }
      })
      .catch((error) => {
        if (isMounted && error.code !== 'auth/no-auth-event') {
          console.error("Redirect Login Error:", error);
        }
      });

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!isMounted) return;

      if (currentUser) {
        setUser(currentUser);
        setLoading(false);
      } else {
        // Hanya login anonymous jika benar-benar tidak ada user (anonim atau google)
        try {
          console.log("No user found, signing in anonymously...");
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
