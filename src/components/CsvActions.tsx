"use client"

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Product } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, query } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function CsvActions() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const firestore = useFirestore();

  const productsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'products'));
  }, [firestore]);

  const { data: products = [] } = useCollection<Product>(productsQuery);

  const handleExport = () => {
    if (products.length === 0) {
      toast({ title: "Gagal", description: "Tidak ada data untuk diekspor." });
      return;
    }

    const headers = ["Nama Produk", "Kategori", "Modal", "Harga Jual", "Stok", "Dibuat Pada"];
    const csvContent = [
      headers.join(","),
      ...products.map(p => `"${p.namaProduk}","${p.kategori}",${p.modal},${p.hargaJual},${p.stok},${new Date(p.createdAt).toISOString()}`)
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
    if (!file || !firestore) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n");
        let importedCount = 0;
        const colRef = collection(firestore, 'products');
        
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          
          const parts = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
          if (parts && parts.length >= 5) {
            const newProduct = {
              namaProduk: parts[0].replace(/"/g, ""),
              kategori: (parts[1] || 'Lainnya').replace(/"/g, "") as any,
              modal: parseFloat(parts[2]),
              hargaJual: parseFloat(parts[3]),
              stok: parseFloat(parts[4]),
              createdAt: parts[5] ? new Date(parts[5].replace(/"/g, "")).getTime() : Date.now(),
            };

            addDoc(colRef, newProduct)
              .catch(async () => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                  path: colRef.path,
                  operation: 'create',
                  requestResourceData: newProduct,
                }));
              });
            importedCount++;
          }
        }

        toast({ title: "Proses Berhasil", description: `${importedCount} produk sedang diimpor.` });
      } catch (error) {
        toast({ title: "Gagal", description: "Format file CSV tidak valid." });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex items-center gap-1.5">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleExport}
              className="h-9 w-9 bg-white border-slate-200 shadow-sm rounded-lg hover:bg-slate-50 text-primary"
            >
              <Download className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Ekspor CSV</p></TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => fileInputRef.current?.click()}
              className="h-9 w-9 bg-white border-slate-200 shadow-sm rounded-lg hover:bg-slate-50 text-primary"
            >
              <Upload className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Impor CSV</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>

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