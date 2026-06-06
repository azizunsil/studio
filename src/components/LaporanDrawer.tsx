
"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Product, Category, ModalAdjustment, RorisLiability } from '@/lib/types';
import { BACKUP_PIN, STOCK_OPNAME_PIN } from '@/lib/constants';
import { CsvActions } from '@/components/CsvActions';
import { FullBackupActions } from '@/components/FullBackupActions';
import { useDatabase, useDoc, useCollection } from '@/firebase';
import { ref, set, push, remove, update } from 'firebase/database';
import { Wallet, CheckCircle2, History, Trash2, Clock, FileText, Lock, TrendingUp, TrendingDown, Package, Database, Power, ShieldCheck, Plus, Minus, User, Info, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { exportLaporanModalPdf } from '@/lib/pdf-generator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const { data: adjustmentsData = [] } = useCollection<ModalAdjustment>(database, `warungs/${warungId}/modalAdjustments`);
  const { data: liabilitiesData = [] } = useCollection<RorisLiability>(database, `warungs/${warungId}/rorisLiabilities`);
  
  const [targetInput, setTargetInput] = useState<string>('');
  const [isBackupUnlocked, setIsBackupUnlocked] = useState(false);

  // Form State Ralat
  const [adjDesc, setAdjDesc] = useState('');
  const [adjType, setAdjType] = useState<'Tambah' | 'Kurang'>('Tambah');
  const [adjNominal, setAdjNominal] = useState('');

  // Form State Tanggungan
  const [liaManager, setLiaManager] = useState('');
  const [liaDesc, setLiaDesc] = useState('');
  const [liaType, setLiaType] = useState<'Tambah Tanggungan' | 'Bayar Tanggungan'>('Tambah Tanggungan');
  const [liaNominal, setLiaNominal] = useState('');
  
  const modalTarget = (settingsData as any)?.modalTarget ?? 0;
  const isStockOpnameMode = (settingsData as any)?.stockOpnameMode === true;

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

  const sortedAdjustments = useMemo(() => {
    return [...adjustmentsData].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [adjustmentsData]);

  const sortedLiabilities = useMemo(() => {
    return [...liabilitiesData].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [liabilitiesData]);

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

  const handleToggleStockOpname = () => {
    if (!database) return;
    
    const pin = prompt(`Masukkan PIN STOCK OPNAME untuk ${isStockOpnameMode ? 'menonaktifkan' : 'mengaktifkan'} mode edit stok:`);
    if (pin === null) return;

    if (pin === STOCK_OPNAME_PIN) {
      const settingsRef = ref(database, `warungs/${warungId}/settings`);
      const newStatus = !isStockOpnameMode;

      if (!newStatus) {
        if (!confirm('Yakin ingin menonaktifkan Mode Stock Opname? Edit stok akan kembali terkunci.')) return;
      }

      update(settingsRef, { stockOpnameMode: newStatus }).then(() => {
        toast({ 
          title: newStatus ? "Mode Opname Aktif" : "Mode Normal Aktif", 
          description: newStatus ? "Sekarang stok barang dapat diubah secara cepat." : "Edit stok telah dikunci kembali." 
        });
      });
    } else {
      alert("PIN Stock Opname Salah!");
    }
  };

  const handleSaveTarget = () => {
    if (!database) return;
    if (!checkBackupPin()) return;

    const val = parseFloat(targetInput) || 0;
    const targetRef = ref(database, `warungs/${warungId}/settings/modalTarget`);
    set(targetRef, val).then(() => {
      toast({ title: "Target Diperbarui", description: `Target modal baru: ${formatCurrency(val)}` });
    });
  };

  const handleSaveHistory = () => {
    if (!database) return;
    if (!checkBackupPin()) return;

    const historyRef = ref(database, `warungs/${warungId}/modalChecks`);
    const payload = {
      tanggal: Date.now(),
      modalTarget,
      modalSaatIni: totalModalAkhir,
      selisih: selisihFinal,
      status: statusFinal,
      totalJenisProduk: products.length,
      createdAt: Date.now()
    };
    push(historyRef, payload).then(() => {
      toast({ title: "Riwayat Disimpan", description: "Catatan riwayat modal berhasil disimpan." });
    });
  };

  const handleDeleteHistory = (id: string) => {
    if (!database) return;
    if (!checkBackupPin()) return;

    if (confirm('Yakin hapus riwayat ini?')) {
      remove(ref(database, `warungs/${warungId}/modalChecks/${id}`)).then(() => {
        toast({ title: "Dihapus", description: "Catatan riwayat telah dihapus." });
      });
    }
  };

  // Logic Ralat
  const handleAddAdjustment = () => {
    if (!database) return;
    const nominal = parseFloat(adjNominal);
    if (!adjDesc || isNaN(nominal)) {
      toast({ variant: "destructive", title: "Gagal", description: "Lengkapi keterangan dan nominal." });
      return;
    }
    if (!checkBackupPin()) return;

    const adjRef = ref(database, `warungs/${warungId}/modalAdjustments`);
    const payload = {
      tanggal: Date.now(),
      keterangan: adjDesc,
      jenis: adjType,
      nominal,
      createdAt: Date.now()
    };
    push(adjRef, payload).then(() => {
      setAdjDesc('');
      setAdjNominal('');
      toast({ title: "Ralat Ditambahkan" });
    });
  };

  const handleDeleteAdjustment = (id: string) => {
    if (!database) return;
    if (!checkBackupPin()) return;
    if (confirm('Hapus ralat modal ini?')) {
      remove(ref(database, `warungs/${warungId}/modalAdjustments/${id}`));
    }
  };

  // Logic Tanggungan
  const handleAddLiability = () => {
    if (!database) return;
    const nominal = parseFloat(liaNominal);
    if (!liaManager || !liaDesc || isNaN(nominal)) {
      toast({ variant: "destructive", title: "Gagal", description: "Lengkapi data tanggungan." });
      return;
    }
    if (!checkBackupPin()) return;

    const liaRef = ref(database, `warungs/${warungId}/rorisLiabilities`);
    const payload = {
      tanggal: Date.now(),
      pengelola: liaManager,
      keterangan: liaDesc,
      jenis: liaType,
      nominal,
      createdAt: Date.now()
    };
    push(liaRef, payload).then(() => {
      setLiaManager('');
      setLiaDesc('');
      setLiaNominal('');
      toast({ title: "Tanggungan Dicatat" });
    });
  };

  const handleDeleteLiability = (id: string) => {
    if (!database) return;
    if (!checkBackupPin()) return;
    if (confirm('Hapus catatan tanggungan ini?')) {
      remove(ref(database, `warungs/${warungId}/rorisLiabilities/${id}`));
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  };

  const formatDate = (timestamp: number) => format(new Date(timestamp), 'dd/MM/yy HH:mm', { locale: id });

  const categories: Category[] = ['Rokok', 'Sembako', 'Minuman', 'Sachet', 'Titipan', 'Lainnya'];

  const getStatsByCategory = (cat: Category) => {
    const filtered = products.filter(p => p.kategori === cat);
    const count = filtered.length;
    const modal = cat === 'Titipan' ? 0 : filtered.reduce((acc, p) => acc + (p.modal * p.stok), 0);
    return { modal, count };
  };

  const totalModalBiasa = products.filter(p => p.kategori !== 'Titipan').reduce((acc, p) => acc + (p.modal * p.stok), 0);
  const totalNilaiTitipanTerjual = products.filter(p => p.kategori === 'Titipan').reduce((acc, p) => {
    const terjual = Math.max(0, (p.stokAwalTitipan || 0) - p.stok);
    return acc + (terjual * p.modal);
  }, 0);
  
  const totalModalAkhir = totalModalBiasa - totalNilaiTitipanTerjual;
  
  const ralatBersih = adjustmentsData.reduce((acc, adj) => {
    return adj.jenis === 'Tambah' ? acc + adj.nominal : acc - adj.nominal;
  }, 0);

  const selisihFinal = totalModalAkhir + ralatBersih - modalTarget;
  let statusFinal = 'Aman', statusColor = 'text-blue-600', StatusIcon = CheckCircle2;
  if (selisihFinal > 0) { statusFinal = 'Surplus'; statusColor = 'text-emerald-600'; StatusIcon = TrendingUp; }
  else if (selisihFinal < 0) { statusFinal = 'Kurang'; statusColor = 'text-destructive'; StatusIcon = TrendingDown; }

  // Stats Tanggungan
  const totalLiability = liabilitiesData.filter(l => l.jenis === 'Tambah Tanggungan').reduce((acc, l) => acc + l.nominal, 0);
  const totalPaid = liabilitiesData.filter(l => l.jenis === 'Bayar Tanggungan').reduce((acc, l) => acc + l.nominal, 0);
  const sisaTanggungan = totalLiability - totalPaid;

  return (
    <SheetContent side="left" className="w-[90%] sm:w-[400px] p-0 border-r-0">
      <SheetHeader className="p-6 bg-primary text-white">
        <SheetTitle className="text-white text-xl font-black uppercase">LAPORAN USAHA</SheetTitle>
        <SheetDescription className="text-primary-foreground/80 font-medium">{warungName}</SheetDescription>
      </SheetHeader>
      
      <ScrollArea className="h-[calc(100vh-140px)] px-6 py-4">
        <div className="space-y-6 pb-24">
          {/* 1. KONTROL ADMIN */}
          <section className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm">
            <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-2">
              <ShieldCheck className="h-3 w-3" /> Kontrol Admin Toko
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-slate-600">Mode Stock Opname</span>
                <Badge variant={isStockOpnameMode ? "default" : "secondary"} className={`text-[8px] font-black uppercase ${isStockOpnameMode ? 'bg-emerald-500' : 'bg-slate-200 text-slate-500'}`}>
                  {isStockOpnameMode ? 'AKTIF' : 'MATI'}
                </Badge>
              </div>
              <Button 
                onClick={handleToggleStockOpname} 
                className={`w-full h-11 text-[11px] font-black uppercase gap-2 shadow-sm ${isStockOpnameMode ? 'bg-amber-500 hover:bg-amber-600' : 'bg-primary'}`}
              >
                <Power className="h-4 w-4" />
                {isStockOpnameMode ? 'Nonaktifkan Mode Opname' : 'Aktifkan Mode Opname'}
              </Button>
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
              <div className="flex justify-between text-sm pt-1">
                <span className="text-blue-600 font-bold italic">Titipan Terjual (-)</span>
                <span className="font-bold text-destructive">-{formatCurrency(totalNilaiTitipanTerjual)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-black text-primary text-base">
                <span>Modal Stok Net</span>
                <span>{formatCurrency(totalModalAkhir)}</span>
              </div>
            </div>
          </section>

          {/* 3. CEK MODAL TOKO */}
          <section className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Wallet className="h-3 w-3" /> Hasil Roris Toko</h3>
              {!isBackupUnlocked && <Lock className="h-2.5 w-2.5 text-slate-300" />}
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Target Modal</span>
                  <span className="font-black text-slate-700">{formatCurrency(modalTarget)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Modal Barang</span>
                  <span className="font-bold text-slate-700">{formatCurrency(totalModalAkhir)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-blue-600 font-bold uppercase text-[10px]">Ralat Modal Bersih</span>
                  <span className={`font-bold ${ralatBersih >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                    {ralatBersih >= 0 ? '+' : ''}{formatCurrency(ralatBersih)}
                  </span>
                </div>
                <Separator className="bg-slate-200" />
                <div className="flex justify-between items-center pt-1">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-black uppercase">Selisih Akhir</span>
                    <span className={`text-base font-black ${statusColor}`}>{selisihFinal >= 0 ? '+' : ''}{formatCurrency(selisihFinal)}</span>
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-100 shadow-sm ${statusColor}`}>
                    <StatusIcon className="h-4 w-4" />
                    <span className="text-xs font-black uppercase tracking-tight">{statusFinal}</span>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="grid gap-2 pt-2">
                <div className="flex gap-2">
                  <Input type="number" value={targetInput} onChange={(e) => setTargetInput(e.target.value)} className="h-9 text-xs font-bold bg-white" placeholder="Target..." />
                  <Button onClick={handleSaveTarget} className="h-9 px-4 text-[10px] font-black uppercase shrink-0">Set Target</Button>
                </div>
                <Button onClick={handleSaveHistory} className="w-full h-10 text-[10px] font-black uppercase bg-white text-primary border border-primary/20 hover:bg-slate-100 shadow-none" variant="outline"><History className="h-3.5 w-3.5 mr-2" /> Simpan Riwayat Roris</Button>
              </div>
              
              {/* LIST RIWAYAT MODAL */}
              {sortedHistory.length > 0 && (
                <div className="mt-4 space-y-2 border-t border-slate-200 pt-4">
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Clock className="h-2.5 w-2.5" /> 5 Riwayat Terakhir</h4>
                  {sortedHistory.map((item: any) => (
                    <div key={item.id} className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm relative pr-10">
                      <p className="text-[9px] font-bold text-slate-400 mb-1">{formatDate(item.tanggal)}</p>
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-700">Modal: {formatCurrency(item.modalSaatIni)}</span>
                          <span className={`text-[10px] font-bold ${item.selisih >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>{item.selisih >= 0 ? '+' : ''}{formatCurrency(item.selisih)}</span>
                        </div>
                        <Badge variant="outline" className={`text-[8px] uppercase ${item.status === 'Surplus' ? 'border-emerald-200 text-emerald-600' : item.status === 'Kurang' ? 'border-red-200 text-destructive' : ''}`}>{item.status}</Badge>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-red-50 bg-red-50/50 border border-red-100 rounded-full absolute top-2.5 right-2 shadow-sm" onClick={() => handleDeleteHistory(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* 4. RALAT MODAL SECTION */}
          <section className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Plus className="h-3 w-3" /> Tambah Ralat Modal</h3>
            <div className="space-y-3">
              <Input placeholder="Keterangan Ralat..." className="h-9 text-xs bg-white" value={adjDesc} onChange={(e) => setAdjDesc(e.target.value)} />
              <div className="flex gap-2">
                <Select value={adjType} onValueChange={(val: any) => setAdjType(val)}>
                  <SelectTrigger className="h-9 text-xs bg-white w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tambah" className="text-xs">Tambah</SelectItem>
                    <SelectItem value="Kurang" className="text-xs">Kurang</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" placeholder="Nominal Rp..." className="h-9 text-xs bg-white" value={adjNominal} onChange={(e) => setAdjNominal(e.target.value)} />
              </div>
              <Button onClick={handleAddAdjustment} className="w-full h-9 text-[10px] font-black uppercase gap-2 bg-blue-600">Simpan Ralat</Button>
              
              {/* LIST RIWAYAT RALAT */}
              {sortedAdjustments.length > 0 && (
                <div className="mt-4 space-y-2 pt-2 border-t border-slate-200">
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Clock className="h-2.5 w-2.5" /> Daftar Ralat</h4>
                  {sortedAdjustments.slice(0, 3).map((item) => (
                    <div key={item.id} className="bg-white p-2 rounded-lg border border-slate-100 shadow-sm relative pr-10">
                      <p className="text-[9px] font-black text-slate-700 truncate">{item.keterangan}</p>
                      <div className="flex justify-between items-center">
                        <span className={`text-[10px] font-bold ${item.jenis === 'Tambah' ? 'text-emerald-600' : 'text-destructive'}`}>
                          {item.jenis === 'Tambah' ? '+' : '-'}{formatCurrency(item.nominal)}
                        </span>
                        <span className="text-[8px] text-slate-400">{formatDate(item.tanggal)}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-red-50 bg-red-50/50 border border-red-100 rounded-full absolute top-2 right-2" onClick={() => handleDeleteAdjustment(item.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* 5. TANGGUNGAN RORIS SECTION */}
          <section className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><User className="h-3 w-3" /> Tanggungan Roris</h3>
            <div className="space-y-3">
              {/* STATS TANGGUNGAN */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-2 mb-2">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-slate-400 uppercase">Sisa Tanggungan</span>
                  <span className="text-destructive font-black">{formatCurrency(sisaTanggungan)}</span>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <p className="text-[8px] text-slate-400 font-bold uppercase">Total Utang</p>
                    <p className="text-[10px] font-bold text-slate-700">{formatCurrency(totalLiability)}</p>
                  </div>
                  <div className="flex-1 text-right">
                    <p className="text-[8px] text-slate-400 font-bold uppercase">Total Bayar</p>
                    <p className="text-[10px] font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 bg-white/50 p-2 rounded-lg border border-dashed border-slate-200">
                <Input placeholder="Nama Pengelola..." className="h-8 text-[11px] bg-white" value={liaManager} onChange={(e) => setLiaManager(e.target.value)} />
                <Input placeholder="Keterangan..." className="h-8 text-[11px] bg-white" value={liaDesc} onChange={(e) => setLiaDesc(e.target.value)} />
                <div className="flex gap-2">
                  <Select value={liaType} onValueChange={(val: any) => setLiaType(val)}>
                    <SelectTrigger className="h-8 text-[10px] bg-white flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tambah Tanggungan" className="text-[10px]">Tambah Utang</SelectItem>
                      <SelectItem value="Bayar Tanggungan" className="text-[10px]">Bayar Utang</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="number" placeholder="Nominal Rp..." className="h-8 text-[11px] bg-white flex-1" value={liaNominal} onChange={(e) => setLiaNominal(e.target.value)} />
                </div>
                <Button onClick={handleAddLiability} className="w-full h-8 text-[9px] font-black uppercase gap-2 bg-slate-700">Simpan Tanggungan</Button>
              </div>

              {/* LIST TANGGUNGAN */}
              {sortedLiabilities.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Clock className="h-2.5 w-2.5" /> 5 Transaksi Terakhir</h4>
                  {sortedLiabilities.slice(0, 5).map((item) => (
                    <div key={item.id} className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm relative pr-10">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Badge variant="outline" className="text-[7px] h-3 px-1 border-slate-200 bg-slate-50 uppercase font-black text-slate-500">{item.pengelola}</Badge>
                        <span className="text-[8px] text-slate-400 font-bold">{formatDate(item.tanggal)}</span>
                      </div>
                      <p className="text-[9px] font-bold text-slate-700 mb-1">{item.keterangan}</p>
                      <div className="flex justify-between items-center">
                        <span className={`text-[10px] font-black ${item.jenis === 'Tambah Tanggungan' ? 'text-destructive' : 'text-emerald-600'}`}>
                          {item.jenis === 'Tambah Tanggungan' ? '+' : '-'}{formatCurrency(item.nominal)}
                        </span>
                        <span className="text-[8px] text-slate-400 font-bold uppercase">{item.jenis.split(' ')[0]}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-red-50 bg-red-50/50 border border-red-100 rounded-full absolute bottom-2.5 right-2" onClick={() => handleDeleteLiability(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* 6. EKSPOR & BACKUP */}
          <section className="space-y-6">
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
              <h3 className="text-xs font-black text-blue-600 uppercase mb-3 flex items-center gap-2"><FileText className="h-3.5 w-3.5" /> Ekspor Dokumen</h3>
              <Button 
                onClick={() => exportLaporanModalPdf({ products, modalTarget, totalModalAkhir, totalModalBiasa, totalNilaiTitipanTerjual, selisih: selisihFinal, status: statusFinal, modalHistory: historyData, warungName })} 
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
