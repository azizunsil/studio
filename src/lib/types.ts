
export type Category = 'Rokok' | 'Sembako' | 'Minuman' | 'Sachet' | 'Titipan' | 'Lainnya';

export interface Product {
  id: string;
  namaBarang: string;
  kategori: Category;
  modal: number;
  hargaJual: number;
  stok: number;
  stokAwalTitipan?: number; // Khusus kategori Titipan
  lastStockUpdateAt?: number; // Waktu terakhir stok diubah
  createdAt: number;
}

export interface Warung {
  id: string;
  name: string;
  pin: string;
}

export interface ModalAdjustment {
  id: string;
  tanggal: number;
  keterangan: string;
  jenis: 'Tambah' | 'Kurang';
  nominal: number;
  createdAt: number;
}

export interface RorisLiability {
  id: string;
  tanggal: number;
  pengelola: string;
  keterangan: string;
  jenis: 'Tambah Tanggungan' | 'Bayar Tanggungan';
  nominal: number;
  createdAt: number;
}
