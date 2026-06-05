
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
