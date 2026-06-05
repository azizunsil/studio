
"use client"

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Database, FileUp, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDatabase, useAuth } from '@/firebase';
import { ref, get, set } from 'firebase/database';

interface FullBackupActionsProps {
  warungId: string;
}

export function FullBackupActions({ warungId }: FullBackupActionsProps) {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const database = useDatabase();
  const auth = useAuth();

  const handleBackup = async () => {
    if (!database || !warungId) return;
    
    // Pastikan user sudah login (anonim) sebelum mencoba baca
    if (!auth.currentUser) {
      toast({ variant: "destructive", title: "Akses Ditolak", description: "Sesi Anda belum siap. Silakan refresh halaman." });
      return;
    }

    setIsProcessing(true);
    try {
      const dbRef = ref(database, `warungs/${warungId}`);
      const snapshot = await get(dbRef);
      
      if (!snapshot.exists()) {
        toast({ title: "Backup Kosong", description: "Tidak ada data untuk dibackup di toko ini." });
        setIsProcessing(false);
        return;
      }

      const backupData = {
        app: "Barang & Roris",
        warungId: warungId,
        exportedAt: new Date().toISOString(),
        data: snapshot.val()
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Backup_Lengkap_${warungId}_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({ title: "Berhasil", description: "Backup JSON berhasil diunduh." });
    } catch (error: any) {
      console.error("Backup Error:", error);
      toast({ 
        variant: "destructive", 
        title: "Gagal Backup", 
        description: error.message.includes("permission_denied") 
          ? "Izin ditolak oleh server. Pastikan Security Rules sudah benar." 
          : error.message 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !database || !warungId) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const backup = JSON.parse(text);

        if (!backup.data) throw new Error("Format file tidak valid.");
        
        const confirmRestore = confirm(`PERINGATAN: Seluruh data Toko ${warungId} saat ini akan DIHAPUS dan diganti dengan data dari file backup. Lanjutkan?`);
        if (!confirmRestore) return;

        setIsProcessing(true);
        await set(ref(database, `warungs/${warungId}`), backup.data);
        toast({ title: "Berhasil", description: "Data warung berhasil dipulihkan." });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Gagal Restore", description: error.message });
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="grid grid-cols-2 gap-2 w-full">
      <Button 
        variant="outline" 
        onClick={handleBackup} 
        disabled={isProcessing}
        className="h-9 bg-white text-primary font-bold text-[10px] gap-1.5"
      >
        {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
        BACKUP FULL
      </Button>
      <Button 
        variant="outline" 
        onClick={() => fileInputRef.current?.click()} 
        disabled={isProcessing}
        className="h-9 bg-white text-primary font-bold text-[10px] gap-1.5"
      >
        <FileUp className="h-3.5 w-3.5" /> RESTORE FULL
      </Button>
      <input type="file" ref={fileInputRef} onChange={handleRestore} accept=".json" className="hidden" />
    </div>
  );
}
