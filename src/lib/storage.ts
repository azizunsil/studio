import { Product } from './types';

const STORAGE_KEY = 'sakuproduk_data';

export const getProducts = (): Product[] => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveProducts = (products: Product[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
};

export const addProduct = (product: Omit<Product, 'id' | 'createdAt'>): Product => {
  const products = getProducts();
  const newProduct: Product = {
    ...product,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  saveProducts([newProduct, ...products]);
  return newProduct;
};

export const updateProduct = (id: string, updates: Partial<Product>) => {
  const products = getProducts();
  const updated = products.map((p) => (p.id === id ? { ...p, ...updates } : p));
  saveProducts(updated);
};

export const deleteProduct = (id: string) => {
  const products = getProducts();
  saveProducts(products.filter((p) => p.id !== id));
};