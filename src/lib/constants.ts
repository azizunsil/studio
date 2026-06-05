
import { Warung } from './types';

/**
 * PENGATURAN AKSES TOKO
 * Anda bisa menambah toko baru atau mengganti PIN di sini.
 */
export const WARUNG_LIST: Warung[] = [
  {
    id: "toko_oya",
    name: "Toko Oya",
    pin: "1111", // PIN Toko Oya
  },
  {
    id: "toko_sinday",
    name: "Toko Sinday",
    pin: "2222", // PIN Toko Sinday
  },
];

/**
 * PIN BACKUP GLOBAL
 * Digunakan untuk fitur: Ekspor CSV, Impor CSV, Backup JSON, Restore JSON.
 */
export const BACKUP_PIN = "9999"; 
