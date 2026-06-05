
import { Warung } from './types';

/**
 * PENGATURAN AKSES WARUNG
 * Anda bisa menambah warung baru atau mengganti PIN di sini.
 */
export const WARUNG_LIST: Warung[] = [
  {
    id: "roris",
    name: "Warung Roris",
    pin: "1111", // Ganti PIN Warung Roris di sini
  },
  {
    id: "barang",
    name: "Warung Barang",
    pin: "2222", // Ganti PIN Warung Barang di sini
  },
];

/**
 * PIN BACKUP GLOBAL
 * Digunakan untuk fitur: Ekspor CSV, Impor CSV, Backup JSON, Restore JSON.
 */
export const BACKUP_PIN = "9999"; 
