"use client"

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Product } from '@/lib/types';
import { useDatabase, useCollection } from '@/firebase';
import { ref, push, set } from 'firebase/database';

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
        if (lines.length <= 1) return;

        // Deteksi format dari header
        const headerLine = lines[0].trim();
        const hasIdColumn = headerLine.toLowerCase().includes("id produk");
        
        if (!hasIdColumn) {
          toast({ 
            variant: "destructive",
            title: "Peringatan CSV Lama", 
            description: "File tidak memiliki kolom ID. Mengimpor data ini dapat menyebabkan duplikasi produk." 
          });
        }

        const existingIds = new Set(products.map(p => p.id));
        let updatedCount = 0;
        let restoredCount = 0;
        let newCount = 0;
        const now = Date.now();
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          // Regex untuk menangani kolom yang diapit tanda kutip
          const parts = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
          if (!parts) continue;

          let idCsv = "";
          let namaBarang = "";
          let kategori = "Lainnya";
          let modal = 0;
          let hargaJual = 0;
          let stok = 0;
          let stokAwalTitipanCsv = 0;
          let lastUpdateRaw = "";
          let createdRaw = "";

          if (hasIdColumn) {
            idCsv = parts[0].replace(/"/g, "").trim();
            namaBarang = (parts[1] || "").replace(/"/g, "").trim();
            kategori = (parts[2] || "Lainnya").replace(/"/g, "").trim() as any;
            modal = parseFloat(parts[3]) || 0;
            hargaJual = parseFloat(parts[4]) || 0;
            stok = parseFloat(parts[5]) || 0;
            stokAwalTitipanCsv = parts[6] ? parseFloat(parts[6]) : 0;
            lastUpdateRaw = parts[7] ? parts[7].replace(/"/g, "").trim() : "";
            createdRaw = parts[8] ? parts[8].replace(/"/g, "").trim() : "";
          } else {
            // Format lama tanpa ID
            namaBarang = parts[0].replace(/"/g, "").trim();
            kategori = (parts[1] || "Lainnya").replace(/"/g, "").trim() as any;
            modal = parseFloat(parts[2]) || 0;
            hargaJual = parseFloat(parts[3]) || 0;
            stok = parseFloat(parts[4]) || 0;
            stokAwalTitipanCsv = parts[5] ? parseFloat(parts[5]) : 0;
            lastUpdateRaw = parts[6] ? parts[6].replace(/"/g, "").trim() : "";
            createdRaw = parts[7] ? parts[7].replace(/"/g, "").trim() : "";
          }

          if (!namaBarang) continue;

          // Bangun payload
          const payload: any = {
            namaBarang,
            kategori,
            modal,
            hargaJual,
            stok,
          };

          // Logika Titipan
          if (kategori === 'Titipan') {
            payload.stokAwalTitipan = isNaN(stokAwalTitipanCsv) ? stok : stokAwalTitipanCsv;
          } else {
            payload.stokAwalTitipan = null;
          }

          // Tanggal Update
          if (lastUpdateRaw) {
            const d = new Date(lastUpdateRaw).getTime();
            payload.lastStockUpdateAt = isNaN(d) ? now : d;
          } else {
            payload.lastStockUpdateAt = now;
          }

          // Tanggal Dibuat
          if (createdRaw) {
            const d = new Date(createdRaw).getTime();
            payload.createdAt = isNaN(d) ? now : d;
          } else {
            payload.createdAt = now;
          }

          // Pembersihan payload dari undefined
          Object.keys(payload).forEach(key => {
            if (payload[key] === undefined) delete payload[key];
          });

          // Simpan ke Firebase
          if (idCsv) {
            if (existingIds.has(idCsv)) {
              updatedCount++;
            } else {
              restoredCount++;
            }
            // Update data yang sudah ada atau pulihkan yang sudah dihapus
            const itemRef = ref(database, `products/${idCsv}`);
            set(itemRef, payload);
          } else {
            // Tambah data baru
            const productsRef = ref(database, 'products');
            push(productsRef, payload);
            newCount++;
          }
        }

        toast({ 
          title: "Proses Selesai", 
          description: `${updatedCount} produk diperbarui, ${restoredCount} produk dipulihkan, ${newCount} produk baru ditambahkan.` 
        });
      } catch (error) {
        console.error("Import Error:", error);
        toast({ variant: "destructive", title: "Gagal", description: "Format file CSV tidak valid." });
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
