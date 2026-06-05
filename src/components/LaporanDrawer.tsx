"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Product, Category } from '@/lib/types';
import { CsvActions } from '@/components/CsvActions';
import { FullBackupActions } from '@/components/FullBackupActions';
import { useDatabase, useDoc, useCollection } from '@/firebase';
import { ref, set, push, remove } from 'firebase/database';
import { Wallet, Target, ArrowRightLeft, TrendingUp, TrendingDown, CheckCircle2, History, Trash2, Clock, FileText, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { exportLaporanModalPdf } from '@/lib/pdf-generator';

interface LaporanDrawerProps {
  products: Product[];
}

export function LaporanDrawer({ products }: LaporanDrawerProps) {
  const database = useDatabase();
  const { toast } = useToast();
  const { data: settingsData } = useDoc(database, 'settings');
  const { data: historyData = [] } = useCollection(database, 'modalChecks');
  const [targetInput, setTargetInput] = useState<string>('');
  
  const modalTarget = (settingsData as any)?.modalTarget ?? 0;

  useEffect(() => {
    if (modalTarget !== undefined && modalTarget !== null) {
      setTargetInput(modalTarget.toString());
    }
  }, [modalTarget]);

  const sortedHistory = useMemo(() => {
    return [...historyData]
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, 5);
  }, [historyData]);

  const handleSaveTarget = () => {
    if (!database) return;
    const val = parseFloat(targetInput) || 0;
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
          description: error.message,
        });
      });
  };

  const handleSaveHistory = () => {
    if (!database) return;
    
    const historyRef = ref(database, 'modalChecks');
    const payload = {
      tanggal: Date.now(),
      modalTarget,
      modalSaatIni: totalModalAkhir,
      selisih,
      status,
      totalStok,
      totalJenisProduk: products.length,
      createdAt: Date.now()
    };

    push(historyRef, payload).then(() => {
      toast({
        title: "Riwayat Disimpan",
        description: "Hasil pengecekan modal telah dicatat ke riwayat.",
      });
    });
  };

  const handleDeleteHistory = (id: string) => {
    if (!database) return;
    if (confirm('Hapus catatan riwayat ini?')) {
      const itemRef = ref(database, `modalChecks/${id}`);
      remove(itemRef);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  const formatDate = (timestamp: number) => {
    return format(new Date(timestamp), 'dd MMM yyyy, HH:mm', { locale: id });
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

  const getStatusColor = (statusName: string) => {
    if (statusName === 'Surplus') return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (statusName === 'Kurang') return 'text-destructive bg-red-50 border-red-100';
    return 'text-blue-600 bg-blue-50 border-blue-100';
  };

  const handleExportPdf = () => {
    try {
      exportLaporanModalPdf({
        products,
        modalTarget,
        totalModalAkhir,
        totalModalBiasa,
        totalNilaiTitipanTerjual,
        selisih,
        status,
        modalHistory: historyData
      });
      toast({
        title: "PDF Berhasil Dibuat",
        description: "Laporan modal telah diunduh.",
      });
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast({
        variant: "destructive",
        title: "Gagal Export PDF",
        description: "Terjadi kesalahan saat membuat file PDF.",
      });
    }
  };

  return (
    <SheetContent side="left" className="w-[85%] sm:w-[350px] p-0 border-r-0">
      <SheetHeader className="p-6 bg-primary text-white">
        <SheetTitle className="text-white text-xl font-black">LAPORAN USAHA</SheetTitle>
        <SheetDescription className="text-primary-foreground/80 font-medium">
          Ringkasan modal dan inventaris.
        </SheetDescription>
      </SheetHeader>
      
      <ScrollArea className="h-[calc(100vh-80px)] px-6 py-4">
        <div className="space-y-6 pb-20">
          
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

              <div className="pt-2">
                <Button 
                  onClick={handleSaveHistory}
                  className="w-full h-10 gap-2 text-[10px] font-black uppercase bg-white text-primary border border-primary/20 hover:bg-slate-100 shadow-none"
                  variant="outline"
                >
                  <History className="h-3.5 w-3.5" /> Simpan Riwayat Modal
                </Button>
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

            {sortedHistory.length > 0 && (
              <div className="mt-6 space-y-3">
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Clock className="h-2.5 w-2.5" /> 5 Riwayat Terakhir
                </h4>
                <div className="space-y-2">
                  {sortedHistory.map((item: any) => (
                    <div key={item.id} className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm relative group">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[9px] font-bold text-slate-400">{formatDate(item.tanggal)}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5 text-slate-300 hover:text-destructive absolute top-1 right-1"
                          onClick={() => handleDeleteHistory(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-700">{formatCurrency(item.modalSaatIni)}</span>
                          <span className={`text-[9px] font-bold ${item.selisih >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                            {item.selisih >= 0 ? '+' : ''}{formatCurrency(item.selisih)}
                          </span>
                        </div>
                        <div className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase ${getStatusColor(item.status)}`}>
                          {item.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="space-y-6">
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
              <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                <FileText className="h-3.5 w-3.5" /> Ekspor Dokumen
              </h3>
              <Button 
                onClick={handleExportPdf}
                className="w-full h-11 gap-3 text-[11px] font-black uppercase bg-white text-blue-600 border-blue-200 hover:bg-blue-50 shadow-sm"
                variant="outline"
              >
                <FileText className="h-4 w-4" /> Export Laporan PDF
              </Button>
            </div>

            <div>
              <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3">Cadangan Data Produk</h3>
              <div className="pt-1">
                <CsvActions />
              </div>
            </div>
            
            <Separator className="opacity-50" />

            <div>
              <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3">Backup Lengkap (Semua Data)</h3>
              <div className="pt-1">
                <FullBackupActions />
              </div>
            </div>
          </section>
        </div>
      </ScrollArea>
    </SheetContent>
  );
}