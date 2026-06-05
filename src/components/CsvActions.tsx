
"use client"

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Product } from '@/lib/types';
import { useDatabase, useCollection } from '@/firebase';
import { ref, push, set } from 'firebase/database';

interface CsvActionsProps {
  warungId: string;
}

export function CsvActions({ warungId }: CsvActionsProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const database = useDatabase();

  const { data: products = [] } = useCollection<Product>(database, `warungs/${warungId}/products`);

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

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !database || !warungId) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n");
        if (lines.length <= 1) return;

        const now = Date.now();
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const parts = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
          if (!parts || parts.length < 5) continue;

          const payload: any = {
            namaBarang: (parts[1] || "").replace(/"/g, "").trim(),
            kategori: (parts[2] || "Lainnya").replace(/"/g, "").trim() as any,
            modal: parseFloat(parts[3]) || 0,
            hargaJual: parseFloat(parts[4]) || 0,
            stok: parseFloat(parts[5]) || 0,
            createdAt: now,
            lastStockUpdateAt: now
          };

          if (payload.kategori === 'Titipan') {
            payload.stokAwalTitipan = parseFloat(parts[6]) || payload.stok;
          }

          push(ref(database, `warungs/${warungId}/products`), payload);
        }
        toast({ title: "Impor Selesai", description: "Data CSV telah ditambahkan ke database warung." });
      } catch (error) {
        toast({ variant: "destructive", title: "Gagal", description: "Format CSV tidak valid." });
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
