"use client"

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Database, FileUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDatabase } from '@/firebase';
import { ref, get, set } from 'firebase/database';

export function FullBackupActions() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const database = useDatabase();

  const handleBackup = async () => {
    if (!database) return;
    try {
      // Ambil seluruh data root untuk mencakup products, settings, dan modalChecks
      const snapshot = await get(ref(database));
      const allData = snapshot.val() || {};

      const backupData = {
        app: "Oya Apps / Barang & Roris",
        version: 1,
        exportedAt: new Date().toISOString(),
        data: {
          products: allData.products || {},
          settings: allData.settings || {},
          modalChecks: allData.modalChecks || {}
        }
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().split('T')[0];
      link.setAttribute("href", url);
      link.setAttribute("download", `backup-oya-apps-${dateStr}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({ title: "Berhasil", description: "Backup JSON berhasil diunduh." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal", description: error.message });
    }
  };

  const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !database) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const backup = JSON.parse(text);

        if (!backup.data) {
          throw new Error("Format file backup tidak valid (Objek 'data' tidak ditemukan).");
        }

        if (!confirm("Peringatan: Restore ini akan menimpa data produk, pengaturan, dan riwayat modal yang ada saat ini. Lanjutkan?")) {
          return;
        }

        // Restore masing-masing node jika ada di file backup
        if (backup.data.products) {
          await set(ref(database, 'products'), backup.data.products);
        }
        if (backup.data.settings) {
          await set(ref(database, 'settings'), backup.data.settings);
        }
        if (backup.data.modalChecks) {
          await set(ref(database, 'modalChecks'), backup.data.modalChecks);
        }

        toast({ title: "Berhasil", description: "Seluruh data berhasil dipulihkan dari file JSON." });
      } catch (error: any) {
        console.error("Restore Error:", error);
        toast({ 
          variant: "destructive", 
          title: "Gagal Restore", 
          description: error.message || "Format file tidak valid." 
        });
      }
    };
    reader.readAsText(file);
    // Reset input agar bisa upload file yang sama jika perlu
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="grid grid-cols-2 gap-2 w-full">
      <Button 
        variant="outline" 
        onClick={handleBackup}
        className="h-9 bg-white border-slate-200 shadow-sm rounded-lg hover:bg-slate-50 text-primary font-bold gap-1.5 text-[10px]"
      >
        <Database className="h-3.5 w-3.5" /> BACKUP LENGKAP JSON
      </Button>

      <Button 
        variant="outline" 
        onClick={() => fileInputRef.current?.click()}
        className="h-9 bg-white border-slate-200 shadow-sm rounded-lg hover:bg-slate-50 text-primary font-bold gap-1.5 text-[10px]"
      >
        <FileUp className="h-3.5 w-3.5" /> RESTORE LENGKAP JSON
      </Button>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleRestore}
        accept=".json"
        className="hidden"
      />
    </div>
  );
}
