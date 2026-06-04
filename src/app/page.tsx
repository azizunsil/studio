
"use client"

import React, { useState, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2, Package, MoreVertical, Store } from 'lucide-react';
import { Product } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetTrigger } from '@/components/ui/sheet';
import { ProductForm } from '@/components/ProductForm';
import { CsvActions } from '@/components/CsvActions';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
      {/* Header & Search */}
      <header className="px-4 pt-6 pb-3 bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <button className="flex items-center gap-2 hover:opacity-80 transition-opacity overflow-hidden">
                <div className="bg-primary p-2 rounded-xl shrink-0">
                  <Store className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-primary truncate">Barang dan Roris</h1>
              </button>
            </SheetTrigger>
            <LaporanDrawer products={products} />
          </Sheet>
          <div className="shrink-0">
            <CsvActions />
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Cari produk..." 
            className="pl-10 h-11 bg-slate-50 border-none shadow-sm rounded-xl focus-visible:ring-primary"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto no-scrollbar -mx-4 px-4">
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
            <TabsList className="h-9 bg-transparent p-0 justify-start flex-nowrap w-max gap-1">
              {categories.map(cat => (
                <TabsTrigger 
                  key={cat} 
                  value={cat}
                  className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-white text-xs px-4 h-7 whitespace-nowrap border border-slate-100"
                >
                  {cat}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
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
              <Card key={product.id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-semibold text-slate-800 truncate">{product.namaProduk}</h3>
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5 py-0 font-normal">
                        {product.kategori}
                      </Badge>
                    </div>
                    <p className="text-lg font-bold text-primary">
                      {formatCurrency(product.hargaJual)}
                    </p>
                    <p className="text-xs text-muted-foreground font-medium">
                      Stok: <span className={product.stok < 5 ? 'text-destructive font-bold' : 'text-slate-600'}>{product.stok}</span>
                    </p>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => {
                        setEditingProduct(product);
                        setIsEditOpen(true);
                      }}>
                        <Edit2 className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(product.id)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Hapus
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full fab-shadow z-20 p-0 shadow-lg shadow-primary/40"
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
