
"use client"

import React from 'react';
import { SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Product, Category } from '@/lib/types';

interface LaporanDrawerProps {
  products: Product[];
}

export function LaporanDrawer({ products }: LaporanDrawerProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  const categories: Category[] = ['Rokok', 'Sembako', 'Minuman', 'Sachet', 'Lainnya'];

  const getStatsByCategory = (cat: Category) => {
    const filtered = products.filter(p => p.kategori === cat);
    const modal = filtered.reduce((acc, p) => acc + (p.modal * p.stok), 0);
    const stok = filtered.reduce((acc, p) => acc + p.stok, 0);
    const count = filtered.length;
    return { modal, stok, count };
  };

  const totalModal = products.reduce((acc, p) => acc + (p.modal * p.stok), 0);
  const totalNilaiJual = products.reduce((acc, p) => acc + (p.hargaJual * p.stok), 0);
  const totalStok = products.reduce((acc, p) => acc + p.stok, 0);
  const labaKotor = totalNilaiJual - totalModal;

  return (
    <SheetContent side="left" className="w-[85%] sm:w-[350px] p-0 border-r-0">
      <SheetHeader className="p-6 bg-primary text-white">
        <SheetTitle className="text-white text-xl">Laporan Inventaris</SheetTitle>
        <SheetDescription className="text-primary-foreground/80">
          Ringkasan modal dan stok barang.
        </SheetDescription>
      </SheetHeader>
      
      <ScrollArea className="h-[calc(100vh-140px)] px-6 py-4">
        <div className="space-y-6 pb-10">
          {/* LAPORAN MODAL */}
          <section>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">=== LAPORAN MODAL ===</h3>
            <div className="space-y-2">
              {categories.map(cat => (
                <div key={cat} className="flex justify-between text-sm">
                  <span>Modal {cat}</span>
                  <span className="font-medium">{formatCurrency(getStatsByCategory(cat).modal)}</span>
                </div>
              ))}
              <Separator className="my-2" />
              <div className="flex justify-between font-bold text-primary">
                <span>Total Modal</span>
                <span>{formatCurrency(totalModal)}</span>
              </div>
            </div>
          </section>

          {/* RINGKASAN STOK */}
          <section>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">=== RINGKASAN STOK ===</h3>
            <div className="space-y-2">
              {categories.map(cat => (
                <div key={cat} className="flex justify-between text-sm">
                  <span>Produk {cat}</span>
                  <span className="font-medium">{getStatsByCategory(cat).stok} item</span>
                </div>
              ))}
              <Separator className="my-2" />
              <div className="flex justify-between text-sm">
                <span>Total Jenis Produk</span>
                <span className="font-medium">{products.length}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total Stok Seluruh</span>
                <span>{totalStok} item</span>
              </div>
            </div>
          </section>

          {/* NILAI INVENTARIS */}
          <section className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">=== NILAI INVENTARIS ===</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Modal</span>
                <span className="font-medium">{formatCurrency(totalModal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total Nilai Jual</span>
                <span className="font-medium">{formatCurrency(totalNilaiJual)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-bold text-green-600">
                <span>Potensi Laba Kotor</span>
                <span>{formatCurrency(labaKotor)}</span>
              </div>
            </div>
          </section>
        </div>
      </ScrollArea>
    </SheetContent>
  );
}
