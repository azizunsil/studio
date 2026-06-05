
"use client"

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDatabase } from '@/firebase';
import { ref, push, update } from 'firebase/database';
import { useToast } from '@/hooks/use-toast';

const schema = z.object({
  namaBarang: z.string().min(1, 'Nama barang wajib diisi'),
  kategori: z.enum(['Rokok', 'Sembako', 'Minuman', 'Sachet', 'Titipan', 'Lainnya']),
  modal: z.coerce.number().min(0, 'Modal tidak boleh negatif'),
  hargaJual: z.coerce.number().min(0, 'Harga jual tidak boleh negatif'),
  stok: z.coerce.number().min(0, 'Stok tidak boleh negatif'),
  stokAwalTitipan: z.coerce.number().optional(),
});

interface ProductFormProps {
  product?: Product;
  onSuccess: () => void;
}

export function ProductForm({ product, onSuccess }: ProductFormProps) {
  const database = useDatabase();
  const { toast } = useToast();

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: product ? {
      namaBarang: product.namaBarang,
      kategori: product.kategori,
      modal: product.modal,
      hargaJual: product.hargaJual,
      stok: product.stok,
      stokAwalTitipan: product.stokAwalTitipan,
    } : {
      namaBarang: '',
      kategori: 'Lainnya',
      // @ts-ignore
      modal: '',
      // @ts-ignore
      hargaJual: '',
      // @ts-ignore
      stok: '',
      stokAwalTitipan: 0,
    }
  });

  const selectedCategory = watch('kategori');

  const onSubmit = (data: z.infer<typeof schema>) => {
    if (!database) return;

    let updatePayload: any = { ...data };
    const now = Date.now();

    // Logika update stok terakhir
    if (product) {
      if (data.stok !== product.stok) {
        updatePayload.lastStockUpdateAt = now;
      }
      const itemRef = ref(database, `products/${product.id}`);
      update(itemRef, updatePayload).catch((err) => {
        toast({ variant: "destructive", title: "Gagal memperbarui", description: err.message });
      });
    } else {
      updatePayload.createdAt = now;
      updatePayload.lastStockUpdateAt = now;
      const productsRef = ref(database, 'products');
      push(productsRef, updatePayload).catch((err) => {
        toast({ variant: "destructive", title: "Gagal menyimpan", description: err.message });
      });
    }
    
    onSuccess();
  };

  return (
    <DialogContent className="sm:max-w-[425px] rounded-t-3xl sm:rounded-2xl">
      <DialogHeader>
        <DialogTitle className="text-xl font-black text-slate-800">
          {product ? 'Edit Barang' : 'Tambah Barang Baru'}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="namaBarang" className="font-bold text-slate-700">Nama Barang</Label>
          <Input 
            id="namaBarang" 
            {...register('namaBarang')} 
            placeholder="Contoh: Signature" 
            className="h-12 border-slate-200 focus:ring-primary bg-slate-50"
          />
          {errors.namaBarang && <p className="text-xs text-destructive font-medium">{errors.namaBarang.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="kategori" className="font-bold text-slate-700">Kategori</Label>
          <Select 
            defaultValue={watch('kategori')} 
            onValueChange={(val) => setValue('kategori', val as any)}
          >
            <SelectTrigger className="h-12 border-slate-200 bg-slate-50">
              <SelectValue placeholder="Pilih Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Rokok">Rokok</SelectItem>
              <SelectItem value="Sembako">Sembako</SelectItem>
              <SelectItem value="Minuman">Minuman</SelectItem>
              <SelectItem value="Sachet">Sachet</SelectItem>
              <SelectItem value="Titipan">Titipan</SelectItem>
              <SelectItem value="Lainnya">Lainnya</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedCategory === 'Titipan' && (
          <div className="space-y-2 bg-blue-50 p-3 rounded-lg border border-blue-100">
            <Label htmlFor="stokAwalTitipan" className="font-bold text-blue-700">Stok Awal Titipan</Label>
            <Input 
              id="stokAwalTitipan" 
              type="number" 
              {...register('stokAwalTitipan')} 
              placeholder="Jumlah awal dititipkan" 
              className="h-12 border-blue-200 bg-white"
            />
            <p className="text-[10px] text-blue-500 italic">*Digunakan untuk menghitung pengurang modal.</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="modal" className="font-bold text-slate-700">Modal (Rp)</Label>
            <Input 
              id="modal" 
              type="number" 
              {...register('modal')} 
              onFocus={(e) => e.target.select()} 
              placeholder="0" 
              className="h-12 border-slate-200 bg-slate-50"
            />
            {errors.modal && <p className="text-xs text-destructive font-medium">{errors.modal.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="hargaJual" className="font-bold text-slate-700">Harga Jual (Rp)</Label>
            <Input 
              id="hargaJual" 
              type="number" 
              {...register('hargaJual')} 
              onFocus={(e) => e.target.select()} 
              placeholder="0" 
              className="h-12 border-slate-200 bg-slate-50"
            />
            {errors.hargaJual && <p className="text-xs text-destructive font-medium">{errors.hargaJual.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="stok" className="font-bold text-slate-700">Stok (Item)</Label>
          <Input 
            id="stok" 
            type="number" 
            {...register('stok')} 
            onFocus={(e) => e.target.select()} 
            placeholder="0" 
            className="h-12 border-slate-200 bg-slate-50"
          />
          {errors.stok && <p className="text-xs text-destructive font-medium">{errors.stok.message}</p>}
        </div>

        <DialogFooter className="pt-4">
          <Button type="submit" disabled={isSubmitting} className="w-full h-14 text-base font-black shadow-lg shadow-primary/20">
            {product ? 'SIMPAN PERUBAHAN' : 'SIMPAN BARANG'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
