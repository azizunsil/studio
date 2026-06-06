"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Product, Category } from '@/lib/types';
import { BACKUP_PIN } from '@/lib/constants';
import { CsvActions } from '@/components/CsvActions';
import { FullBackupActions } from '@/components/FullBackupActions';
import { useDatabase, useDoc, useCollection } from '@/firebase';
import { ref, set, push, remove } from 'firebase/database';
import { Wallet, CheckCircle2, History, Trash2, Clock, FileText, Lock, TrendingUp, TrendingDown, Package, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { exportLaporanModalPdf } from '@/lib/pdf-generator';

interface LaporanDrawerProps {
  products: Product[];
  warungId: string;
  warungName: string;
}

export function LaporanDrawer({ products, warungId, warungName }: LaporanDrawerProps) {
  const database = useDatabase();
  const { toast } = useToast();
  
  const { data: settingsData } = useDoc(database, `warungs/${warungId}/settings`);
  const { data: historyData = [] } = useCollection(database, `warungs/${warungId}/modalChecks`);
  
  const [targetInput, setTargetInput] = useState<string>('');
  const [isBackupUnlocked, setIsBackupUnlocked] = useState(false);
  
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

  const checkBackupPin = () => {
    if (isBackupUnlocked) return true;
    const input = prompt("Masukkan PIN BACKUP untuk fitur ini:");
    if (input === BACKUP_PIN) {
      setIsBackupUnlocked(true);
      return true;
    } else if (input !== null) {
      alert("PIN BACKUP Salah!");
    }
    return false;
  };

  const handleSaveTarget = () => {
    if (!database) return;
    const val = parseFloat(targetInput) || 0;
    const targetRef = ref(database, `warungs/${warungId}/settings/modalTarget`);
    set(targetRef, val).then(() => {
      toast({ title: "Target Diperbarui", description: `Target modal baru: ${formatCurrency(val)}` });
    });
  };

  const handleSaveHistory = () => {
    if (!database) return;
    const historyRef = ref(database, `warungs/${warungId}/modalChecks`);
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
      toast({ title: "Riwayat Disimpan", description: "Catatan riwayat modal berhasil disimpan." });
    });
  };

  const handleDeleteHistory = (id: string) => {
    if (!database) return;
    if (confirm('Hapus catatan riwayat ini?')) {
      remove(ref(database, `warungs/${warungId}/modalChecks/${id}`));
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  };

  const formatDate = (timestamp: number) => format(new Date(timestamp), 'dd MMM yyyy, HH:mm', { locale: id });

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

  const totalModalBiasa = products.filter(p => p.kategori !== 'Titipan').reduce((acc, p) => acc + (p.modal * p.stok), 0);
  const totalNilaiTitipanTerjual = products.filter(p => p.kategori === 'Titipan').reduce((acc, p) => {
    const terjual = Math.max(0, (p.stokAwalTitipan || 0) - p.stok);
    return acc + (terjual * p.modal);
  }, 0);
  
  const totalModalAkhir = totalModalBiasa - totalNilaiTitipanTerjual;
  const totalNilaiJual = products.reduce((acc, p) => acc + (p.hargaJual * p.stok), 0);
  const totalStok = products.reduce((acc, p) => acc + p.stok, 0);

  const selisih = totalModalAkhir - modalTarget;
  let status = 'Aman', statusColor = 'text-blue-600', StatusIcon = CheckCircle2;
  if (selisih > 0) { status = 'Surplus'; statusColor = 'text-emerald-600'; StatusIcon = TrendingUp; }
  else if (selisih < 0) { status = 'Kurang'; statusColor = 'text-destructive'; StatusIcon = TrendingDown; }

  return (
    <SheetContent side="left" className="w-[85%] sm:w-[350px] p-0 border-r-0">
      <SheetHeader className="p-6 bg-primary text-white">
        <SheetTitle className="text-white text-xl font-black uppercase">LAPORAN USAHA</SheetTitle>
        <SheetDescription className="text-primary-foreground/80 font-medium">{warungName}</SheetDescription>
      </SheetHeader>
      
      <ScrollArea className="h-[calc(100vh-140px)] px-6 py-4">
        <div className="space-y-6 pb-24">
          {/* 1. INFORMASI STOK */}
          <section>
            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div> Informasi Stok
            </h3>
            <div className="space-y-2">
              {categories.map(cat => (
                <div key={cat} className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">{cat}</span>
                  <span className="font-bold text-slate-700">{getStatsByCategory(cat).count} barang</span>
                </div>
              ))}
              <Separator className="my-2" />
              <div className="flex justify-between text-sm font-bold text-slate-600">
                <span>Total Jenis Produk</span>
                <span>{products.length} barang</span>
              </div>
            </div>
          </section>

          {/* 2. RINCIAN MODAL STOK */}
          <section>
            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary"></div> Rincian Modal Stok
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

          {/* 3. NILAI INVENTARIS */}
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

          {/* 4. CEK MODAL TOKO */}
          <section className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Wallet className="h-3 w-3" /> Cek Modal Toko</h3>
            <div className="space-y-4">
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
                    <span className={`text-sm font-black ${statusColor}`}>{selisih >= 0 ? '+' : ''}{formatCurrency(selisih)}</span>
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-100 shadow-sm ${statusColor}`}>
                    <StatusIcon className="h-3.5 w-3.5" />
                    <span className="text-xs font-black uppercase tracking-tight">{status}</span>
                  </div>
                </div>
              </div>

              {/* UPDATE TARGET MODAL */}
              <div className="pt-2 border-t border-slate-200/50 space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase">Update Target</Label>
                <div className="flex gap-2">
                  <input type="number" value={targetInput} onChange={(e) => setTargetInput(e.target.value)} className="h-9 w-full px-3 text-xs font-bold bg-white border border-slate-200 rounded-md" placeholder="0" />
                  <Button onClick={handleSaveTarget} className="h-9 px-3 text-[10px] font-black uppercase">Simpan</Button>
                </div>
              </div>

              {/* TOMBOL SIMPAN RIWAYAT */}
              <Button onClick={handleSaveHistory} className="w-full h-10 text-[10px] font-black uppercase bg-white text-primary border border-primary/20 hover:bg-slate-100 shadow-none" variant="outline"><History className="h-3.5 w-3.5 mr-2" /> Simpan Riwayat</Button>
              
              {/* LIST RIWAYAT */}
              {sortedHistory.length > 0 && (
                <div className="mt-4 space-y-3 border-t border-slate-200 pt-6">
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Clock className="h-2.5 w-2.5" /> 5 Riwayat Terakhir
                  </h4>
                  <div className="space-y-2">
                    {sortedHistory.map((item: any) => (
                      <div key={item.id} className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm relative group">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-[9px] font-bold text-slate-400">{formatDate(item.tanggal)}</span>
                          <Button variant="ghost" size="icon" className="h-5 w-5 text-slate-300 hover:text-destructive absolute top-1 right-1 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteHistory(item.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-700">{formatCurrency(item.modalSaatIni)}</span>
                            <span className={`text-[9px] font-bold ${item.selisih >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>{item.selisih >= 0 ? '+' : ''}{formatCurrency(item.selisih)}</span>
                          </div>
                          <div className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase ${
                            item.status === 'Surplus' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                            item.status === 'Kurang' ? 'bg-red-50 text-destructive border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                          }`}>{item.status}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* 5. EKSPOR & BACKUP */}
          <section className="space-y-6">
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
              <h3 className="text-xs font-black text-blue-600 uppercase mb-3 flex items-center gap-2"><FileText className="h-3.5 w-3.5" /> Ekspor Dokumen</h3>
              <Button 
                onClick={() => exportLaporanModalPdf({ products, modalTarget, totalModalAkhir, totalModalBiasa, totalNilaiTitipanTerjual, selisih, status, modalHistory: historyData, warungName })} 
                className="w-full h-11 text-[11px] font-black uppercase bg-white text-blue-600 border-blue-200" 
                variant="outline"
              >
                <FileText className="h-4 w-4 mr-2" /> Export PDF
              </Button>
            </div>

            <div className="border-2 border-dashed border-slate-100 p-4 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2"><Database className="h-3 w-3" /> Fitur Backup</h3>
                {!isBackupUnlocked && <Lock className="h-3 w-3 text-slate-300" />}
              </div>
              <div onClickCapture={(e) => !isBackupUnlocked && !checkBackupPin() && e.stopPropagation()} className="space-y-4">
                <CsvActions warungId={warungId} />
                <FullBackupActions warungId={warungId} />
              </div>
            </div>
          </section>
        </div>
      </ScrollArea>
    </SheetContent>
  );
}
