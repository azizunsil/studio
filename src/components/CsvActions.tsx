"use client"

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';
import { getProducts, saveProducts } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { Product } from '@/lib/types';

export function CsvActions({ onRefresh }: { onRefresh: () => void }) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const products = getProducts();
    if (products.length === 0) {
      toast({ title: "Gagal", description: "Tidak ada data untuk diekspor." });
      return;
    }

    const headers = ["Nama Produk", "Harga Beli", "Harga Jual", "Dibuat Pada"];
    const csvContent = [
      headers.join(","),
      ...products.map(p => `"${p.namaProduk}",${p.hargaBeli},${p.hargaJual},${new Date(p.createdAt).toISOString()}`)
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
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n");
        const products: Product[] = [];
        
        // Skip header
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          
          // Basic CSV parsing
          const parts = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
          if (parts && parts.length >= 3) {
            products.push({
              id: crypto.randomUUID(),
              namaProduk: parts[0].replace(/"/g, ""),
              hargaBeli: parseFloat(parts[1]),
              hargaJual: parseFloat(parts[2]),
              createdAt: parts[3] ? new Date(parts[3]).getTime() : Date.now(),
            });
          }
        }

        if (products.length > 0) {
          const existing = getProducts();
          const merged = [...existing];
          products.forEach(newP => {
            if (!existing.some(e => e.namaProduk === newP.namaProduk)) {
              merged.push(newP);
            }
          });
          
          saveProducts(merged);
          onRefresh();
          toast({ title: "Berhasil", description: `${products.length} produk diimpor.` });
        }
      } catch (error) {
        toast({ title: "Gagal", description: "Format file CSV tidak valid." });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={handleExport} className="flex-1">
        <Download className="mr-2 h-4 w-4" /> Ekspor
      </Button>
      <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="flex-1">
        <Upload className="mr-2 h-4 w-4" /> Impor
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
