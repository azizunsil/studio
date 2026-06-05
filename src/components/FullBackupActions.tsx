
"use client"

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Database, FileUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDatabase } from '@/firebase';
import { ref, get, set } from 'firebase/database';

interface FullBackupActionsProps {
  warungId: string;
}

export function FullBackupActions({ warungId }: FullBackupActionsProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const database = useDatabase();

  const handleBackup = async () => {
    if (!database || !warungId) return;
    try {
      const snapshot = await get(ref(database, `warungs/${warungId}`));
      const backupData = {
        app: "Oya Apps / Barang & Roris",
        warungId: warungId,
        exportedAt: new Date().toISOString(),
        data: snapshot.val() || {}
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Backup_Lengkap_${warungId}_${new Date().toISOString().split('T')[0]}.json`);
      link.click();
      toast({ title: "Berhasil", description: "Backup JSON berhasil diunduh." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal", description: error.message });
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
        if (!confirm(`Hapus data warung ${warungId} saat ini dan ganti dengan isi file backup?`)) return;

        await set(ref(database, `warungs/${warungId}`), backup.data);
        toast({ title: "Berhasil", description: "Data warung berhasil dipulihkan." });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Gagal Restore", description: error.message });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="grid grid-cols-2 gap-2 w-full">
      <Button variant="outline" onClick={handleBackup} className="h-9 bg-white text-primary font-bold text-[10px] gap-1.5"><Database className="h-3.5 w-3.5" /> BACKUP FULL</Button>
      <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="h-9 bg-white text-primary font-bold text-[10px] gap-1.5"><FileUp className="h-3.5 w-3.5" /> RESTORE FULL</Button>
      <input type="file" ref={fileInputRef} onChange={handleRestore} accept=".json" className="hidden" />
    </div>
  );
}
