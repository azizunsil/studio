
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
import { Wallet, CheckCircle2, History, Trash2, Clock, FileText, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { exportLaporanModalPdf } from '@/lib/pdf-generator';

interface LaporanDrawerProps {
  products: Product[];
  warungId: string;
}

export function LaporanDrawer({ products, warungId }: LaporanDrawerProps) {
  const database = useDatabase();
  const { toast } = useToast();
  
  // Baca pengaturan dan riwayat spesifik per toko
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
    if (cat === 'Titipan') {
      const totalTerjual = filtered.reduce((acc, p) => acc + (Math.max(0, (p.stokAwalTitipan || 0) - p.stok) * p.modal), 0);
      return { modal: 0, stok, count: filtered.length, titipanTerjual: totalTerjual };
    }
    return { modal: filtered.reduce((acc, p) => acc + (p.modal * p.stok), 0), stok, count: filtered.length };
  };

  const totalModalBiasa = products.filter(p => p.kategori !== 'Titipan').reduce((acc, p) => acc + (p.modal * p.stok), 0);
  const totalNilaiTitipanTerjual = products.filter(p => p.kategori === 'Titipan').reduce((acc, p) => acc + (Math.max(0, (p.stokAwalTitipan || 0) - p.stok) * p.modal), 0);
  const totalModalAkhir = totalModalBiasa - totalNilaiTitipanTerjual;
  const totalStok = products.reduce((acc, p) => acc + p.stok, 0);

  const selisih = totalModalAkhir - modalTarget;
  let status = 'Aman', statusColor = 'text-blue-600';
  if (selisih > 0) { status = 'Surplus'; statusColor = 'text-emerald-600'; }
  else if (selisih < 0) { status = 'Kurang'; statusColor = 'text-destructive'; }

  return (
    <SheetContent side="left" className="w-[85%] sm:w-[350px] p-0 border-r-0">
      <SheetHeader className="p-6 bg-primary text-white">
        <SheetTitle className="text-white text-xl font-black uppercase">LAPORAN USAHA</SheetTitle>
        <SheetDescription className="text-primary-foreground/80 font-medium">Ringkasan modal dan inventaris.</SheetDescription>
      </SheetHeader>
      
      <ScrollArea className="h-[calc(100vh-80px)] px-6 py-4">
        <div className="space-y-6 pb-20">
          <section>
            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div> Informasi Stok
            </h3>
            <div className="space-y-2">
              {categories.map(cat => (
                <div key={cat} className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">{cat}</span>
                  <span className="font-bold text-slate-700">{getStatsByCategory(cat).stok} item</span>
                </div>
              ))}
              <Separator className="my-2" />
              <div className="flex justify-between font-black text-slate-800">
                <span>Total Stok Gudang</span>
                <span>{totalStok} item</span>
              </div>
            </div>
          </section>

          <section className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Wallet className="h-3 w-3" /> Cek Modal Toko</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center"><span className="text-xs text-slate-500 font-bold uppercase">Target Modal</span><span className="font-black text-slate-700">{formatCurrency(modalTarget)}</span></div>
              <div className="flex justify-between items-center"><span className="text-xs text-slate-500 font-bold uppercase">Modal Saat Ini</span><span className="font-black text-primary">{formatCurrency(totalModalAkhir)}</span></div>
              <Separator />
              <div className="flex justify-between items-center">
                <div className="flex flex-col"><span className="text-[10px] text-slate-400 font-black uppercase">Selisih</span><span className={`text-sm font-black ${statusColor}`}>{selisih >= 0 ? '+' : ''}{formatCurrency(selisih)}</span></div>
                <div className={`px-3 py-1 rounded-full bg-white border border-slate-100 shadow-sm text-xs font-black uppercase ${statusColor}`}>{status}</div>
              </div>
              <Button onClick={handleSaveHistory} className="w-full h-10 text-[10px] font-black uppercase" variant="outline"><History className="h-3.5 w-3.5 mr-2" /> Simpan Riwayat</Button>
              
              <div className="pt-4 space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase">Update Target</Label>
                <div className="flex gap-2">
                  <Input type="number" value={targetInput} onChange={(e) => setTargetInput(e.target.value)} className="h-9 text-xs font-bold" />
                  <Button onClick={handleSaveTarget} className="h-9 px-3 text-[10px] font-black uppercase">Simpan</Button>
                </div>
              </div>

              {/* LIST RIWAYAT (BAGIAN YANG DIPERBAIKI) */}
              {sortedHistory.length > 0 && (
                <div className="mt-6 space-y-3 border-t border-slate-200 pt-6">
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
                            className="h-5 w-5 text-slate-300 hover:text-destructive absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
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
                          <div className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase ${
                            item.status === 'Surplus' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                            item.status === 'Kurang' ? 'bg-red-50 text-destructive border-red-100' : 
                            'bg-blue-50 text-blue-600 border-blue-100'
                          }`}>
                            {item.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-6">
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
              <h3 className="text-xs font-black text-blue-600 uppercase mb-3 flex items-center gap-2"><FileText className="h-3.5 w-3.5" /> Ekspor Dokumen</h3>
              <Button onClick={() => exportLaporanModalPdf({ products, modalTarget, totalModalAkhir, totalModalBiasa, totalNilaiTitipanTerjual, selisih, status, modalHistory: historyData })} className="w-full h-11 text-[11px] font-black uppercase" variant="outline"><FileText className="h-4 w-4 mr-2" /> Export PDF</Button>
            </div>

            <div className="border-2 border-dashed border-slate-100 p-4 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Fitur Backup</h3>
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
