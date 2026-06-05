'use client';

/**
 * Konfigurasi Firebase App untuk proyek Barang dan Roris.
 * Mengutamakan variabel lingkungan (Environment Variables) jika tersedia.
 */
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCDyaki9Pwn8WTA4ro4FMz--RuVasXGwnk",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "barang-dan-roris-2609868-cd231.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "barang-dan-roris-2609868-cd231",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "barang-dan-roris-2609868-cd231.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "500162245898",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:500162245898:web:f484a8df45f95d352476f3",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://barang-dan-roris-2609868-cd231-default-rtdb.asia-southeast1.firebasedatabase.app/"
};
