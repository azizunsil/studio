"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2, Package, MoreVertical, Store } from 'lucide-react';
import { Product } from '@/lib/types';
import { getProducts, deleteProduct } from '@/lib/storage';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { ProductForm } from '@/components/ProductForm';
import { CsvActions } from '@/components/CsvActions';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setProducts(getProducts());
  }, []);

  const refresh = () => {
    setProducts(getProducts());
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.namaProduk.toLowerCase().includes(search.toLowerCase())
    );
  }, [products, search]);

  const handleDelete = (id: string) => {
    if (confirm('Hapus produk ini?')) {
      deleteProduct(id);
      refresh();
    }
  };

  if (!isClient) return null;

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
      <header className="px-4 pt-6 pb-4 bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-2 rounded-xl">
              <Store className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-primary">SakuProduk</h1>
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
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        <div className="mb-4">
          <CsvActions onRefresh={refresh} />
        </div>

        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
            <Package className="h-16 w-16 mb-4 text-muted-foreground" />
            <p className="text-lg font-medium">Belum ada produk</p>
            <p className="text-sm">Klik tombol + untuk menambahkan produk baru.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className="font-semibold text-slate-800 truncate">{product.namaProduk}</h3>
                    <p className="text-lg font-bold text-secondary">
                      {formatCurrency(product.hargaJual)}
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
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full fab-shadow z-20 p-0"
          >
            <Plus className="h-8 w-8" />
          </Button>
        </DialogTrigger>
        <ProductForm onSuccess={() => {
          setIsAddOpen(false);
          refresh();
        }} />
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        {editingProduct && (
          <ProductForm 
            product={editingProduct} 
            onSuccess={() => {
              setIsEditOpen(false);
              setEditingProduct(null);
              refresh();
            }} 
          />
        )}
      </Dialog>
    </div>
  );
}