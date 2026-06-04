
export type Category = 'Rokok' | 'Sembako' | 'Minuman' | 'Sachet' | 'Lainnya';

export interface Product {
  id: string;
  namaProduk: string;
  kategori: Category;
  modal: number;
  hargaJual: number;
  stok: number;
  createdAt: number;
}
