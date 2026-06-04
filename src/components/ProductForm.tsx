"use client"

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { collection, doc, addDoc, updateDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const schema = z.object({
  namaProduk: z.string().min(1, 'Nama produk wajib diisi'),
  kategori: z.enum(['Rokok', 'Sembako', 'Minuman', 'Sachet', 'Lainnya']),
  modal: z.coerce.number().min(0, 'Modal tidak boleh negatif'),
  hargaJual: z.coerce.number().min(0, 'Harga jual tidak boleh negatif'),
  stok: z.coerce.number().min(0, 'Stok tidak boleh negatif'),
});

interface ProductFormProps {
  product?: Product;
  onSuccess: () => void;
}

export function ProductForm({ product, onSuccess }: ProductFormProps) {
  const [loading, setLoading] = useState(false);
  const firestore = useFirestore();

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: product ? {
      namaProduk: product.namaProduk,
      kategori: product.kategori,
      modal: product.modal,
      hargaJual: product.hargaJual,
      stok: product.stok,
    } : {
      namaProduk: '',
      kategori: 'Lainnya',
      // @ts-ignore
      modal: '',
      // @ts-ignore
      hargaJual: '',
      // @ts-ignore
      stok: '',
    }
  });

  const onSubmit = (data: z.infer<typeof schema>) => {
    if (!firestore) return;
    setLoading(true);

    if (product) {
      const docRef = doc(firestore, 'products', product.id);
      updateDoc(docRef, { ...data })
        .catch(async () => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: data,
          }));
        })
        .finally(() => {
          setLoading(false);
          onSuccess();
        });
    } else {
      const colRef = collection(firestore, 'products');
      addDoc(colRef, { ...data, createdAt: Date.now() })
        .catch(async () => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: colRef.path,
            operation: 'create',
            requestResourceData: data,
          }));
        })
        .finally(() => {
          setLoading(false);
          onSuccess();
        });
    }
  };

  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{product ? 'Edit Produk' : 'Tambah Produk Baru'}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="namaProduk">Nama Barang</Label>
          <Input id="namaProduk" {...register('namaProduk')} placeholder="Contoh: Signature" />
          {errors.namaProduk && <p className="text-xs text-destructive">{errors.namaProduk.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="kategori">Kategori</Label>
          <Select 
            defaultValue={watch('kategori')} 
            onValueChange={(val) => setValue('kategori', val as any)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Rokok">Rokok</SelectItem>
              <SelectItem value="Sembako">Sembako</SelectItem>
              <SelectItem value="Minuman">Minuman</SelectItem>
              <SelectItem value="Sachet">Sachet</SelectItem>
              <SelectItem value="Lainnya">Lainnya</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="modal">Modal (Rp)</Label>
            <Input id="modal" type="number" {...register('modal')} onFocus={(e) => e.target.select()} placeholder="0" />
            {errors.modal && <p className="text-xs text-destructive">{errors.modal.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="hargaJual">Harga Jual (Rp)</Label>
            <Input id="hargaJual" type="number" {...register('hargaJual')} onFocus={(e) => e.target.select()} placeholder="0" />
            {errors.hargaJual && <p className="text-xs text-destructive">{errors.hargaJual.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="stok">Stok (Item)</Label>
          <Input id="stok" type="number" {...register('stok')} onFocus={(e) => e.target.select()} placeholder="0" />
          {errors.stok && <p className="text-xs text-destructive">{errors.stok.message}</p>}
        </div>

        <DialogFooter className="pt-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {product ? 'Simpan Perubahan' : 'Simpan Produk'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
