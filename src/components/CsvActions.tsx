
"use client"

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Product } from '@/lib/types';
import { useDatabase, useCollection } from '@/firebase';
import { ref, push, set, get, update } from 'firebase/database';

interface CsvActionsProps {
  warungId: string;
}

export function CsvActions({ warungId }: CsvActionsProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const database = useDatabase();

  const { data: products = [] } = useCollection<Product>(database, `warungs/${warungId}/products`);

  const normalize = (value: string) =>
    (value || "")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  const makeProductKey = (name: string, category: string) => {
    const n = normalize(name);
    const c = normalize(category) || "lainnya";
    if (!n) return null;
    return `${n}::${c}`;
  };

  const handleExport = () => {
    if (products.length === 0) {
      toast({ title: "Gagal", description: "Tidak ada data untuk diekspor." });
      return;
    }

    const headers = ["ID Produk", "Nama Barang", "Kategori", "Modal", "Harga Jual", "Stok", "Stok Awal Titipan", "Terakhir Update Stok", "Dibuat Pada"];
    const csvContent = [
      headers.join(","),
      ...products.map(p => {
        const lastUpdate = p.lastStockUpdateAt ? new Date(p.lastStockUpdateAt).toISOString() : '';
        const created = p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString();
        const stokAwal = p.kategori === 'Titipan' ? (p.stokAwalTitipan || 0) : 0;
        return `"${p.id}","${p.namaBarang}","${p.kategori}",${p.modal},${p.hargaJual},${p.stok},${stokAwal},"${lastUpdate}","${created}"`;
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Backup_${warungId}_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    toast({ title: "Berhasil", description: "Data berhasil diekspor ke CSV." });
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !database || !warungId) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n");
        if (lines.length <= 1) return;

        // 1. Ambil data produk lama untuk indexing
        const existingSnapshot = await get(ref(database, `warungs/${warungId}/products`));
        const existingData = existingSnapshot.val() || {};
        const existingIndex = new Map<string, string>(); // Key -> ID

        Object.entries(existingData).forEach(([id, p]: [string, any]) => {
          const key = makeProductKey(p.namaBarang, p.kategori);
          if (key) existingIndex.set(key, id);
        });

        let added = 0;
        let updated = 0;
        let skipped = 0;
        let failed = 0;
        const now = Date.now();

        // 2. Loop baris CSV (mulai dari baris ke-2 untuk skip header)
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Regex untuk menangani kolom yang mungkin mengandung koma di dalam tanda kutip
          const parts = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
          if (!parts || parts.length < 5) {
            failed++;
            continue;
          }

          // Pembersihan tanda kutip dan ekstraksi data
          const cleanPart = (idx: number) => (parts[idx] || "").replace(/^"|"$/g, "").trim();
          
          // Deteksi apakah CSV memiliki kolom ID di awal (hasil ekspor aplikasi ini sendiri) atau format manual
          const isExportFormat = parts.length >= 6 && lines[0].toLowerCase().includes("id produk");
          
          let rawNama, rawKategori, rawModal, rawHarga, rawStok, rawStokAwal;

          if (isExportFormat) {
            rawNama = cleanPart(1);
            rawKategori = cleanPart(2);
            rawModal = parseFloat(cleanPart(3)) || 0;
            rawHarga = parseFloat(cleanPart(4)) || 0;
            rawStok = parseFloat(cleanPart(5)) || 0;
            rawStokAwal = parseFloat(cleanPart(6)) || 0;
          } else {
            rawNama = cleanPart(0);
            rawKategori = cleanPart(1);
            rawModal = parseFloat(cleanPart(2)) || 0;
            rawHarga = parseFloat(cleanPart(3)) || 0;
            rawStok = parseFloat(cleanPart(4)) || 0;
            rawStokAwal = parseFloat(cleanPart(5)) || 0;
          }

          const key = makeProductKey(rawNama, rawKategori);
          if (!key) {
            skipped++;
            continue;
          }

          const payload: any = {
            namaBarang: rawNama,
            kategori: (rawKategori || "Lainnya") as any,
            modal: rawModal,
            hargaJual: rawHarga,
            stok: rawStok,
            lastStockUpdateAt: now
          };

          if (payload.kategori === 'Titipan') {
            payload.stokAwalTitipan = rawStokAwal || rawStok;
          }

          const existingId = existingIndex.get(key);

          if (existingId) {
            // UPDATE: Gunakan ID yang sudah ada
            const itemRef = ref(database, `warungs/${warungId}/products/${existingId}`);
            update(itemRef, {
              ...payload,
              // Tetap gunakan createdAt yang lama jika ada
              createdAt: existingData[existingId].createdAt || now
            });
            updated++;
          } else {
            // ADD: Buat ID baru
            const productsRef = ref(database, `warungs/${warungId}/products`);
            const newRef = push(productsRef);
            set(newRef, {
              ...payload,
              createdAt: now
            });
            // Update index agar baris selanjutnya di file yang sama tidak membuat duplikat
            existingIndex.set(key, newRef.key!);
            added++;
          }
        }

        // Susun teks notifikasi: X Ditambahkan, Y Diperbarui, Z Dilewati
        const reportParts = [
          `${added} Ditambahkan`,
          `${updated} Diperbarui`,
          `${skipped} Dilewati`
        ];
        if (failed > 0) reportParts.push(`${failed} Gagal`);

        toast({ 
          title: "Import Selesai", 
          description: reportParts.join(", ") 
        });
      } catch (error) {
        console.error("Import Error:", error);
        toast({ variant: "destructive", title: "Gagal", description: "Format CSV tidak valid atau terjadi kesalahan sistem." });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="grid grid-cols-2 gap-2 w-full">
      <Button variant="outline" onClick={handleExport} className="h-9 bg-white text-primary font-bold text-[10px] gap-1.5"><Download className="h-3.5 w-3.5" /> EKSPOR CSV</Button>
      <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="h-9 bg-white text-primary font-bold text-[10px] gap-1.5"><Upload className="h-3.5 w-3.5" /> IMPOR CSV</Button>
      <input type="file" ref={fileInputRef} onChange={handleImport} accept=".csv" className="hidden" />
    </div>
  );
}
