
"use client"

import React, { useState, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2, Package, Store } from 'lucide-react';
import { Product } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetTrigger } from '@/components/ui/sheet';
import { ProductForm } from '@/components/ProductForm';
import { LaporanDrawer } from '@/components/LaporanDrawer';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Home() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const firestore = useFirestore();

  const productsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'products'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: products = [], loading } = useCollection<Product>(productsQuery);

  const categories = ['Semua', 'Rokok', 'Sembako', 'Minuman', 'Sachet', 'Lainnya'];

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.namaProduk.toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCategory === 'Semua' || p.kategori === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [products, search, selectedCategory]);

  const handleDelete = (id: string) => {
    if (!firestore) return;
    if (confirm('Hapus produk ini?')) {
      deleteDoc(doc(firestore, 'products', id));
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Header Optimized for Mobile */}
      <header className="px-4 pt-4 pb-2 bg-white/95 backdrop-blur-md sticky top-0 z-10 border-b flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Sheet>
            <SheetTrigger asChild>
              <button className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0">
                <div className="bg-primary p-1.5 rounded-lg shrink-0">
                  <Store className="h-4 w-4 text-white" />
                </div>
                <h1 className="text-base font-bold tracking-tight text-primary truncate">Barang & Roris</h1>
              </button>
            </SheetTrigger>
            <LaporanDrawer products={products} />
          </Sheet>
        </div>
        
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input 
            placeholder="Cari nama barang..." 
            className="pl-9 h-10 bg-slate-50 border-slate-200 shadow-sm rounded-lg focus-visible:ring-primary w-full text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="w-full -mx-4 px-4 overflow-x-auto no-scrollbar touch-pan-x">
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
            <TabsList className="h-auto bg-transparent p-0 justify-start flex flex-nowrap w-max gap-1.5 pb-1">
              {categories.map(cat => (
                <TabsTrigger 
                  key={cat} 
                  value={cat}
                  className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-white text-[10px] px-3 h-7 whitespace-nowrap border border-slate-200 shadow-sm shrink-0 bg-white"
                >
                  {cat}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </header>

      {/* Main Content: Redesigned Product Cards */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-28">
        {loading ? (
          <div className="flex justify-center py-20">
            <Package className="h-8 w-8 animate-pulse text-muted-foreground opacity-20" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
            <Package className="h-16 w-16 mb-4 text-muted-foreground" />
            <p className="text-lg font-medium">Tidak ada produk</p>
            <p className="text-sm">Silakan tambahkan produk baru.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden border border-slate-100 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-slate-800 truncate text-base">{product.namaProduk}</h3>
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5 py-0 font-normal shrink-0">
                          {product.kategori}
                        </Badge>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <p className="text-xl font-black text-primary">
                          {formatCurrency(product.hargaJual)}
                        </p>
                        <p className="text-xs font-semibold text-slate-500">
                          Stok: <span className={product.stok < 5 ? 'text-destructive font-bold' : 'text-slate-700'}>{product.stok}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons: Directly visible for quick access */}
                  <div className="flex gap-2 border-t pt-3 mt-1">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 h-10 gap-2 font-semibold border-slate-200 text-slate-700 active:bg-slate-100"
                      onClick={() => {
                        setEditingProduct(product);
                        setIsEditOpen(true);
                      }}
                    >
                      <Edit2 className="h-4 w-4" /> Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 h-10 gap-2 font-semibold text-destructive border-destructive/20 active:bg-destructive/5 hover:text-destructive"
                      onClick={() => handleDelete(product.id)}
                    >
                      <Trash2 className="h-4 w-4" /> Hapus
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* FAB: Add Button */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogTrigger asChild>
          <Button 
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full fab-shadow z-20 p-0 shadow-lg shadow-primary/40 active:scale-95 transition-transform"
          >
            <Plus className="h-8 w-8" />
          </Button>
        </DialogTrigger>
        <ProductForm onSuccess={() => setIsAddOpen(false)} />
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        {editingProduct && (
          <ProductForm 
            product={editingProduct} 
            onSuccess={() => {
              setIsEditOpen(false);
              setEditingProduct(null);
            }} 
          />
        )}
      </Dialog>
    </div>
  );
}
