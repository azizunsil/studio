
"use client"

import React, { useState, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2, Package, Store, MoreVertical, Loader2, AlertCircle, Clock, ArrowUpDown } from 'lucide-react';
import { Product } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ProductForm } from '@/components/ProductForm';
import { LaporanDrawer } from '@/components/LaporanDrawer';
import { useCollection, useDatabase, useAuth, useUser } from '@/firebase';
import { ref, remove, update } from 'firebase/database';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { format, isToday } from 'date-fns';
import { id } from 'date-fns/locale';

export default function Home() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [sortBy, setSortBy] = useState<string>('A-Z');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  
  // State untuk Quick Stock Edit
  const [quickStockProduct, setQuickStockProduct] = useState<Product | null>(null);
  const [isQuickStockOpen, setIsQuickStockOpen] = useState(false);
  const [newStokInput, setNewStokInput] = useState('');

  const { toast } = useToast();
  const database = useDatabase();
  const auth = useAuth();
  const { user, loading: authLoading } = useUser(auth);

  const { data: rawProducts = [], loading: dataLoading, error: dbError } = useCollection<Product>(database, 'products');

  const categories = ['Semua', 'Rokok', 'Sembako', 'Minuman', 'Sachet', 'Titipan', 'Lainnya'];

  const filteredAndSortedProducts = useMemo(() => {
    let result = rawProducts.filter(p => {
      const nama = p.namaBarang || '';
      const matchSearch = nama.toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCategory === 'Semua' || p.kategori === selectedCategory;
      return matchSearch && matchCat;
    });

    switch (sortBy) {
      case 'A-Z':
        result.sort((a, b) => (a.namaBarang || '').localeCompare(b.namaBarang || ''));
        break;
      case 'Terbaru':
        result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        break;
      case 'Stok Terendah':
        result.sort((a, b) => (a.stok || 0) - (b.stok || 0));
        break;
      case 'Modal Terbesar':
        result.sort((a, b) => {
          const valA = (a.stok || 0) * (a.modal || 0);
          const valB = (b.stok || 0) * (b.modal || 0);
          return valB - valA;
        });
        break;
      default:
        result.sort((a, b) => (a.namaBarang || '').localeCompare(b.namaBarang || ''));
    }

    return result;
  }, [rawProducts, search, selectedCategory, sortBy]);

  const handleDelete = (id: string) => {
    if (!database) return;
    if (confirm('Hapus barang ini?')) {
      const itemRef = ref(database, `products/${id}`);
      remove(itemRef).catch((err) => {
        console.error("Delete Error:", err);
      });
    }
  };

  const handleQuickUpdateStock = () => {
    if (!database || !quickStockProduct) return;
    const stokNum = parseInt(newStokInput);
    if (isNaN(stokNum) || stokNum < 0) {
      toast({
        variant: "destructive",
        title: "Input Tidak Valid",
        description: "Stok harus berupa angka positif."
      });
      return;
    }

    const itemRef = ref(database, `products/${quickStockProduct.id}`);
    update(itemRef, {
      stok: stokNum,
      lastStockUpdateAt: Date.now()
    }).then(() => {
      toast({
        title: "Stok Diperbarui",
        description: `Stok ${quickStockProduct.namaBarang} sekarang ${stokNum}.`
      });
      setIsQuickStockOpen(false);
    }).catch(err => {
      toast({
        variant: "destructive",
        title: "Gagal Update",
        description: err.message
      });
    });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    if (isToday(date)) return 'Hari ini';
    return format(date, 'dd MMM yyyy', { locale: id });
  };

  const isLoading = authLoading || (user && dataLoading);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <header className="pt-4 pb-2 bg-white/95 backdrop-blur-md sticky top-0 z-10 border-b flex flex-col gap-2 shadow-sm">
        <div className="px-4 flex items-center justify-between">
          <Sheet>
            <SheetTrigger asChild>
              <button className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0 text-left">
                <div className="bg-primary p-1.5 rounded-lg shrink-0 shadow-sm shadow-primary/20">
                  <Store className="h-4 w-4 text-white" />
                </div>
                <h1 className="text-sm font-black tracking-tight text-primary truncate uppercase">BARANG & RORIS</h1>
              </button>
            </SheetTrigger>
            <LaporanDrawer products={rawProducts} />
          </Sheet>
        </div>
        
        <div className="px-4 flex flex-col gap-2">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
            <Input 
              placeholder="Cari nama barang..." 
              className="pl-10 h-10 bg-slate-50 border-slate-200 shadow-sm rounded-lg focus-visible:ring-primary w-full text-sm font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 shrink-0 px-1">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[10px] font-black text-slate-400 uppercase">Urutkan:</span>
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-8 border-slate-200 bg-white text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-sm focus:ring-primary">
                <SelectValue placeholder="Pilih Urutan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A-Z" className="text-[10px] font-bold uppercase">A-Z</SelectItem>
                <SelectItem value="Terbaru" className="text-[10px] font-bold uppercase">Terbaru</SelectItem>
                <SelectItem value="Stok Terendah" className="text-[10px] font-bold uppercase">Stok Terendah</SelectItem>
                <SelectItem value="Modal Terbesar" className="text-[10px] font-bold uppercase">Modal Terbesar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="w-full max-w-full overflow-x-auto no-scrollbar">
          <div className="px-4 pb-2">
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
              <TabsList className="h-auto bg-transparent p-0 justify-start flex flex-nowrap w-max gap-2">
                {categories.map(cat => (
                  <TabsTrigger 
                    key={cat} 
                    value={cat}
                    className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-white text-[10px] px-3 h-7 whitespace-nowrap border border-slate-200 shadow-sm shrink-0 bg-white font-bold uppercase tracking-wider"
                  >
                    {cat}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-28">
        {dbError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Database</AlertTitle>
            <AlertDescription>
              {dbError.message}
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Sinkronisasi Cloud...</p>
          </div>
        ) : filteredAndSortedProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
            <Package className="h-16 w-16 mb-4 text-muted-foreground/30" />
            <p className="text-lg font-bold text-slate-800">Tidak ada barang</p>
            <p className="text-sm">Mulai tambahkan barang dagangan Anda.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredAndSortedProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden border border-slate-100 shadow-sm relative w-full hover:border-primary/20 transition-colors">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0 pr-8">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-bold text-slate-800 truncate text-base leading-tight max-w-[200px]">{product.namaBarang}</h3>
                        <Badge variant="secondary" className={`text-[9px] h-3.5 px-1.5 py-0 font-bold shrink-0 ${product.kategori === 'Titipan' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                          {product.kategori}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-y-2 mb-2">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Harga Jual</p>
                          <p className="text-base font-black text-primary leading-tight">
                            {formatCurrency(product.hargaJual)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Modal</p>
                          <p className="text-xs font-bold text-slate-600">
                            {formatCurrency(product.modal)}
                          </p>
                        </div>
                        <div 
                          className="cursor-pointer group/stok"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuickStockProduct(product);
                            setNewStokInput(product.stok.toString());
                            setIsQuickStockOpen(true);
                          }}
                        >
                          <p className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1 group-hover/stok:text-primary transition-colors">
                            Stok <Edit2 className="h-2 w-2 opacity-40" />
                          </p>
                          <p className="text-sm font-bold text-slate-800 border-b border-dashed border-slate-200 group-hover/stok:border-primary/50 transition-colors inline-block">
                            <span className={product.stok < 5 ? 'text-destructive font-black' : ''}>{product.stok}</span>
                            {product.kategori === 'Titipan' && product.stokAwalTitipan && (
                              <span className="text-[10px] text-slate-400 ml-1 font-medium">(dari {product.stokAwalTitipan})</span>
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Update Stok</p>
                          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                            <Clock className="h-2.5 w-2.5" />
                            {formatDate(product.lastStockUpdateAt)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="absolute top-2 right-1">
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-slate-400 active:bg-slate-100">
                            <MoreVertical className="h-5 w-5" />
                          </Button>
                        </SheetTrigger>
                        <SheetContent side="bottom" className="rounded-t-2xl px-6 pb-10 pt-4 border-t-0 shadow-2xl">
                          <SheetHeader className="mb-6 text-left">
                            <SheetTitle className="text-lg font-black flex items-center gap-2">
                              <Package className="h-5 w-5 text-primary" />
                              {product.namaBarang}
                            </SheetTitle>
                          </SheetHeader>
                          <div className="grid gap-3">
                            <Button 
                              variant="outline" 
                              className="w-full h-14 justify-start gap-4 text-base font-bold bg-slate-50 border-slate-200"
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
                              className="w-full h-14 justify-start gap-4 text-base font-bold"
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

      {/* FAB - Tambah Barang */}
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

      {/* Dialog Edit Barang Lengkap */}
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

      {/* Dialog Quick Stock Edit */}
      <Dialog open={isQuickStockOpen} onOpenChange={setIsQuickStockOpen}>
        <DialogContent className="sm:max-w-[350px] rounded-t-3xl sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-800">Edit Stok Cepat</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Nama Barang</p>
              <p className="text-sm font-bold text-slate-700">{quickStockProduct?.namaBarang}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quickStok" className="text-xs font-bold text-slate-600">Stok Baru</Label>
              <Input 
                id="quickStok"
                type="number"
                value={newStokInput}
                onChange={(e) => setNewStokInput(e.target.value)}
                className="h-12 text-lg font-black border-slate-200 focus:ring-primary"
                autoFocus
                onFocus={(e) => e.target.select()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleQuickUpdateStock}
              className="w-full h-12 font-black shadow-lg shadow-primary/20"
            >
              SIMPAN STOK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
