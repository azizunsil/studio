"use client"

import React, { useState, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2, Package, Store, MoreVertical } from 'lucide-react';
import { Product } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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
      {/* Header Optimized to prevent horizontal overflow */}
      <header className="pt-4 pb-2 bg-white/95 backdrop-blur-md sticky top-0 z-10 border-b flex flex-col gap-2">
        {/* Row 1: Logo & Nav Trigger */}
        <div className="px-4 flex items-center justify-between">
          <Sheet>
            <SheetTrigger asChild>
              <button className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0">
                <div className="bg-primary p-1 rounded-lg shrink-0">
                  <Store className="h-4 w-4 text-white" />
                </div>
                <h1 className="text-sm font-bold tracking-tight text-primary truncate">Barang & Roris</h1>
              </button>
            </SheetTrigger>
            <LaporanDrawer products={products} />
          </Sheet>
        </div>
        
        {/* Row 2: Full Width Search */}
        <div className="px-4 relative w-full overflow-hidden">
          <Search className="absolute left-7 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
          <Input 
            placeholder="Cari nama barang..." 
            className="pl-10 h-10 bg-slate-50 border-slate-200 shadow-sm rounded-lg focus-visible:ring-primary w-full text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Row 3: Horizontal Scroll Category - Fixed Overflow */}
        <div className="w-full overflow-hidden">
          <div className="overflow-x-auto no-scrollbar touch-pan-x">
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
              <TabsList className="h-auto bg-transparent p-0 justify-start flex flex-nowrap w-max gap-1.5 pb-2 px-4">
                {categories.map(cat => (
                  <TabsTrigger 
                    key={cat} 
                    value={cat}
                    className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-white text-[10px] px-3.5 h-7 whitespace-nowrap border border-slate-200 shadow-sm shrink-0 bg-white"
                  >
                    {cat}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>
      </header>

      {/* Main Content: Product Cards */}
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
              <Card key={product.id} className="overflow-hidden border border-slate-100 shadow-sm relative w-full">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0 pr-8">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-bold text-slate-800 truncate text-base leading-tight max-w-[150px]">{product.namaProduk}</h3>
                        <Badge variant="secondary" className="text-[9px] h-3.5 px-1.5 py-0 font-normal shrink-0">
                          {product.kategori}
                        </Badge>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <p className="text-lg font-black text-primary">
                          {formatCurrency(product.hargaJual)}
                        </p>
                        <p className="text-xs font-semibold text-slate-500">
                          Stok: <span className={product.stok < 5 ? 'text-destructive font-bold' : 'text-slate-700'}>{product.stok}</span>
                        </p>
                      </div>
                    </div>

                    {/* Mobile Action Sheet Trigger */}
                    <div className="absolute top-2 right-1">
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-slate-400">
                            <MoreVertical className="h-5 w-5" />
                          </Button>
                        </SheetTrigger>
                        <SheetContent side="bottom" className="rounded-t-2xl px-6 pb-10 pt-4 border-t-0 shadow-2xl">
                          <SheetHeader className="mb-6 text-left">
                            <SheetTitle className="text-lg font-bold flex items-center gap-2">
                              <Package className="h-5 w-5 text-primary" />
                              {product.namaProduk}
                            </SheetTitle>
                          </SheetHeader>
                          <div className="grid gap-3">
                            <Button 
                              variant="outline" 
                              className="w-full h-14 justify-start gap-4 text-base font-semibold bg-slate-50 border-slate-200"
                              onClick={() => {
                                setEditingProduct(product);
                                setIsEditOpen(true);
                              }}
                            >
                              <div className="bg-blue-100 p-2 rounded-lg">
                                <Edit2 className="h-5 w-5 text-blue-600" />
                              </div>
                              Edit Data Barang
                            </Button>
                            <Button 
                              variant="destructive" 
                              className="w-full h-14 justify-start gap-4 text-base font-semibold"
                              onClick={() => handleDelete(product.id)}
                            >
                              <div className="bg-red-100/20 p-2 rounded-lg">
                                <Trash2 className="h-5 w-5 text-white" />
                              </div>
                              Hapus Barang Permanen
                            </Button>
                          </div>
                        </SheetContent>
                      </Sheet>
                    </div>
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
