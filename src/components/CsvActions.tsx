
"use client"

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Product } from '@/lib/types';
import { useDatabase, useCollection } from '@/firebase';
import { ref, push } from 'firebase/database';

export function CsvActions() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const database = useDatabase();

  const { data: products = [] } = useCollection<Product>(database, 'products');

  const handleExport = () => {
    if (products.length === 0) {
      toast({ title: "Gagal", description: "Tidak ada data untuk diekspor." });
      return;
    }

    const headers = ["Nama Barang", "Kategori", "Modal", "Harga Jual", "Stok", "Stok Awal Titipan", "Terakhir Update Stok", "Dibuat Pada"];
    const csvContent = [
      headers.join(","),
      ...products.map(p => `"${p.namaBarang}","${p.kategori}",${p.modal},${p.hargaJual},${p.stok},${p.stokAwalTitipan || 0},"${p.lastStockUpdateAt ? new Date(p.lastStockUpdateAt).toISOString() : ''}","${new Date(p.createdAt).toISOString()}"`)
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `BarangDanRoris_Backup_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({ title: "Berhasil", description: "Data berhasil diekspor ke CSV." });
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !database) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n");
        let importedCount = 0;
        const productsRef = ref(database, 'products');
        
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          
          const parts = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
          if (parts && parts.length >= 5) {
            const newProduct = {
              namaBarang: parts[0].replace(/"/g, ""),
              kategori: (parts[1] || 'Lainnya').replace(/"/g, "") as any,
              modal: parseFloat(parts[2]),
              hargaJual: parseFloat(parts[3]),
              stok: parseFloat(parts[4]),
              stokAwalTitipan: parts[5] ? parseFloat(parts[5]) : 0,
              lastStockUpdateAt: parts[6] ? new Date(parts[6].replace(/"/g, "")).getTime() : Date.now(),
              createdAt: parts[7] ? new Date(parts[7].replace(/"/g, "")).getTime() : Date.now(),
            };

            push(productsRef, newProduct);
            importedCount++;
          }
        }

        toast({ title: "Proses Berhasil", description: `${importedCount} barang sedang diimpor.` });
      } catch (error) {
        toast({ title: "Gagal", description: "Format file CSV tidak valid." });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="grid grid-cols-2 gap-2 w-full">
      <Button 
        variant="outline" 
        onClick={handleExport}
        className="h-9 bg-white border-slate-200 shadow-sm rounded-lg hover:bg-slate-50 text-primary font-bold gap-1.5 text-[10px]"
      >
        <Download className="h-3.5 w-3.5" /> EKSPOR CSV
      </Button>

      <Button 
        variant="outline" 
        onClick={() => fileInputRef.current?.click()}
        className="h-9 bg-white border-slate-200 shadow-sm rounded-lg hover:bg-slate-50 text-primary font-bold gap-1.5 text-[10px]"
      >
        <Upload className="h-3.5 w-3.5" /> IMPOR CSV
      </Button>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImport}
        accept=".csv"
        className="hidden"
      />
    </div>
  );
}
