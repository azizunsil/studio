
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
      ...products.map(p => {
        const lastUpdate = p.lastStockUpdateAt ? new Date(p.lastStockUpdateAt).toISOString() : '';
        const created = p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString();
        const stokAwal = p.kategori === 'Titipan' ? (p.stokAwalTitipan || 0) : 0;
        
        return `"${p.namaBarang}","${p.kategori}",${p.modal},${p.hargaJual},${p.stok},${stokAwal},"${lastUpdate}","${created}"`;
      })
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
          const line = lines[i].trim();
          if (!line) continue;
          
          // Regex untuk menangani kolom yang diapit tanda kutip (bisa berisi koma)
          const parts = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
          
          if (parts && parts.length >= 5) {
            const namaBarang = parts[0].replace(/"/g, "").trim();
            const kategori = (parts[1] || 'Lainnya').replace(/"/g, "").trim() as any;
            const modal = parseFloat(parts[2]) || 0;
            const hargaJual = parseFloat(parts[3]) || 0;
            const stok = parseFloat(parts[4]) || 0;
            
            // Kolom opsional (mendukung CSV lama)
            let stokAwalTitipan = parts[5] ? parseFloat(parts[5]) : 0;
            let lastStockUpdateAtRaw = parts[6] ? parts[6].replace(/"/g, "").trim() : '';
            let createdAtRaw = parts[7] ? parts[7].replace(/"/g, "").trim() : '';

            const now = Date.now();
            
            // Membangun payload dasar
            const newProduct: any = {
              namaBarang,
              kategori,
              modal,
              hargaJual,
              stok,
            };

            // Logika khusus kategori 'Titipan'
            if (kategori === 'Titipan') {
              // Jika kolom Stok Awal Titipan kosong/tidak ada, gunakan nilai stok saat ini
              newProduct.stokAwalTitipan = (isNaN(stokAwalTitipan) || !parts[5]) ? stok : stokAwalTitipan;
            } else {
              // Set null agar field terhapus/tidak ada di database untuk kategori biasa
              newProduct.stokAwalTitipan = null;
            }

            // Logika Penanganan Tanggal
            if (lastStockUpdateAtRaw) {
              const date = new Date(lastStockUpdateAtRaw).getTime();
              newProduct.lastStockUpdateAt = isNaN(date) ? now : date;
            } else {
              newProduct.lastStockUpdateAt = now;
            }

            if (createdAtRaw) {
              const date = new Date(createdAtRaw).getTime();
              newProduct.createdAt = isNaN(date) ? now : date;
            } else {
              newProduct.createdAt = now;
            }

            // Pastikan tidak ada property undefined yang terkirim
            Object.keys(newProduct).forEach(key => {
              if (newProduct[key] === undefined) {
                delete newProduct[key];
              }
            });

            push(productsRef, newProduct);
            importedCount++;
          }
        }

        toast({ title: "Proses Berhasil", description: `${importedCount} barang sedang diimpor.` });
      } catch (error) {
        console.error("Import Error:", error);
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
