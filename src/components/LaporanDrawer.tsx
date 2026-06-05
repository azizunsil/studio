
"use client"

import React, { useState, useEffect } from 'react';
import { SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Product, Category } from '@/lib/types';
import { CsvActions } from '@/components/CsvActions';
import { useDatabase, useDoc } from '@/firebase';
import { ref, set } from 'firebase/database';
import { Wallet, Target, ArrowRightLeft, TrendingUp, TrendingDown, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LaporanDrawerProps {
  products: Product[];
}

export function LaporanDrawer({ products }: LaporanDrawerProps) {
  const database = useDatabase();
  const { toast } = useToast();
  const { data: settingsData } = useDoc(database, 'settings');
  const [targetInput, setTargetInput] = useState<string>('');
  
  const modalTarget = (settingsData as any)?.modalTarget ?? 0;

  useEffect(() => {
    // Sinkronkan input dengan data dari database saat data dimuat
    if (modalTarget !== undefined && modalTarget !== null) {
      setTargetInput(modalTarget.toString());
    }
  }, [modalTarget]);

  const handleSaveTarget = () => {
    if (!database) return;
    
    const val = parseFloat(targetInput) || 0;
    
    // Simpan langsung ke path spesifik settings/modalTarget
    const targetRef = ref(database, 'settings/modalTarget');
    
    set(targetRef, val)
      .then(() => {
        toast({
          title: "Target Diperbarui",
          description: `Target modal baru berhasil disimpan: ${formatCurrency(val)}`,
        });
      })
      .catch((error) => {
        toast({
          variant: "destructive",
          title: "Gagal Simpan",
          description: error.message || "Terjadi kesalahan saat menyimpan ke database.",
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

  const categories: Category[] = ['Rokok', 'Sembako', 'Minuman', 'Sachet', 'Titipan', 'Lainnya'];

  const getStatsByCategory = (cat: Category) => {
    const filtered = products.filter(p => p.kategori === cat);
    const stok = filtered.reduce((acc, p) => acc + p.stok, 0);
    const count = filtered.length;

    if (cat === 'Titipan') {
      const totalNilaiTerjual = filtered.reduce((acc, p) => {
        const stokAwal = p.stokAwalTitipan || 0;
        const terjual = Math.max(0, stokAwal - p.stok);
        return acc + (terjual * p.modal);
      }, 0);
      return { modal: 0, stok, count, titipanTerjual: totalNilaiTerjual };
    }

    const modal = filtered.reduce((acc, p) => acc + (p.modal * p.stok), 0);
    return { modal, stok, count };
  };

  const totalModalBiasa = products
    .filter(p => p.kategori !== 'Titipan')
    .reduce((acc, p) => acc + (p.modal * p.stok), 0);

  const totalNilaiTitipanTerjual = products
    .filter(p => p.kategori === 'Titipan')
    .reduce((acc, p) => {
      const terjual = Math.max(0, (p.stokAwalTitipan || 0) - p.stok);
      return acc + (terjual * p.modal);
    }, 0);

  const totalModalAkhir = totalModalBiasa - totalNilaiTitipanTerjual;
  const totalNilaiJual = products.reduce((acc, p) => acc + (p.hargaJual * p.stok), 0);
  const totalStok = products.reduce((acc, p) => acc + p.stok, 0);

  // Perhitungan Cek Modal
  const selisih = totalModalAkhir - modalTarget;
  let status = 'Aman';
  let statusColor = 'text-blue-600';
  let StatusIcon = CheckCircle2;

  if (selisih > 0) {
    status = 'Surplus';
    statusColor = 'text-emerald-600';
    StatusIcon = TrendingUp;
  } else if (selisih < 0) {
    status = 'Kurang';
    statusColor = 'text-destructive';
    StatusIcon = TrendingDown;
  }

  return (
    <SheetContent side="left" className="w-[85%] sm:w-[350px] p-0 border-r-0">
      <SheetHeader className="p-6 bg-primary text-white">
        <SheetTitle className="text-white text-xl font-black">LAPORAN USAHA</SheetTitle>
        <SheetDescription className="text-primary-foreground/80 font-medium">
          Ringkasan modal dan inventaris.
        </SheetDescription>
      </SheetHeader>
      
      <ScrollArea className="h-[calc(100vh-140px)] px-6 py-4">
        <div className="space-y-6 pb-20">
          
          {/* RINGKASAN STOK */}
          <section>
            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
              Informasi Stok
            </h3>
            <div className="space-y-2">
              {categories.map(cat => (
                <div key={cat} className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">{cat}</span>
                  <span className="font-bold text-slate-700">{getStatsByCategory(cat).stok} item</span>
                </div>
              ))}
              <Separator className="my-2" />
              <div className="flex justify-between text-sm font-bold text-slate-600">
                <span>Total Jenis Produk</span>
                <span>{products.length}</span>
              </div>
              <div className="flex justify-between font-black text-slate-800">
                <span>Total Stok Gudang</span>
                <span>{totalStok} item</span>
              </div>
            </div>
          </section>

          {/* LAPORAN MODAL */}
          <section>
            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
              Rincian Modal Stok
            </h3>
            <div className="space-y-2">
              {categories.filter(c => c !== 'Titipan').map(cat => (
                <div key={cat} className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">{cat}</span>
                  <span className="font-bold text-slate-700">{formatCurrency(getStatsByCategory(cat).modal)}</span>
                </div>
              ))}
              
              <div className="flex justify-between text-sm pt-2">
                <span className="text-blue-600 font-bold italic">Titipan Terjual (-)</span>
                <span className="font-bold text-destructive">-{formatCurrency(totalNilaiTitipanTerjual)}</span>
              </div>

              <Separator className="my-2" />
              <div className="flex justify-between font-black text-primary text-base">
                <span>Total Modal Net</span>
                <span>{formatCurrency(totalModalAkhir)}</span>
              </div>
            </div>
          </section>

          {/* NILAI INVENTARIS */}
          <section className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3">Nilai Inventaris</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total Modal</span>
                <span className="font-bold">{formatCurrency(totalModalAkhir)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total Nilai Jual</span>
                <span className="font-bold">{formatCurrency(totalNilaiJual)}</span>
              </div>
            </div>
          </section>

          {/* CEK MODAL SECTION */}
          <section className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Wallet className="h-3 w-3" />
              Cek Modal Toko
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 font-bold uppercase">Target Modal</span>
                <span className="font-black text-slate-700">{formatCurrency(modalTarget)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 font-bold uppercase">Modal Saat Ini</span>
                <span className="font-black text-primary">{formatCurrency(totalModalAkhir)}</span>
              </div>
              
              <Separator className="bg-slate-200" />
              
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-black uppercase">Selisih</span>
                  <span className={`text-sm font-black ${statusColor}`}>
                    {selisih >= 0 ? '+' : ''}{formatCurrency(selisih)}
                  </span>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-100 shadow-sm ${statusColor}`}>
                  <StatusIcon className="h-3.5 w-3.5" />
                  <span className="text-xs font-black uppercase tracking-tight">{status}</span>
                </div>
              </div>

              <div className="pt-4 space-y-2">
                <Label htmlFor="modalTarget" className="text-[10px] font-black text-slate-400 uppercase">Update Target Modal</Label>
                <div className="flex gap-2">
                  <Input 
                    id="modalTarget"
                    type="number"
                    value={targetInput}
                    onChange={(e) => setTargetInput(e.target.value)}
                    placeholder="Masukkan angka..."
                    className="h-9 text-xs font-bold border-slate-200 bg-white"
                  />
                  <Button 
                    onClick={handleSaveTarget}
                    className="h-9 px-3 text-[10px] font-black uppercase shrink-0"
                  >
                    Simpan
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* TINDAKAN DATA */}
          <section>
            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3">Cadangan Data</h3>
            <div className="pt-2">
              <CsvActions />
            </div>
          </section>
        </div>
      </ScrollArea>
    </SheetContent>
  );
}
