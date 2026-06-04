"use client"

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Product } from '@/lib/types';
import { addProduct, updateProduct } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, AlertCircle, TrendingUp } from 'lucide-react';
import { suggestProfitMargin } from '@/ai/flows/profit-margin-suggester';

const schema = z.object({
  namaProduk: z.string().min(1, 'Nama produk wajib diisi'),
  hargaBeli: z.coerce.number().min(0, 'Harga beli tidak boleh negatif'),
  hargaJual: z.coerce.number().min(0, 'Harga jual tidak boleh negatif'),
});

interface ProductFormProps {
  product?: Product;
  onSuccess: () => void;
}

export function ProductForm({ product, onSuccess }: ProductFormProps) {
  const [loading, setLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: product ? {
      namaProduk: product.namaProduk,
      hargaBeli: product.hargaBeli,
      hargaJual: product.hargaJual,
    } : {
      namaProduk: '',
      hargaBeli: 0,
      hargaJual: 0,
    }
  });

  const watchHargaBeli = watch('hargaBeli');
  const watchHargaJual = watch('hargaJual');
  const watchNamaProduk = watch('namaProduk');

  useEffect(() => {
    const evaluate = async () => {
      if (watchHargaBeli > 0 && watchHargaJual > 0 && watchNamaProduk) {
        setEvaluating(true);
        try {
          const result = await suggestProfitMargin({
            namaProduk: watchNamaProduk,
            hargaBeli: watchHargaBeli,
            hargaJual: watchHargaJual,
          });
          setAiSuggestion(result.suggestion);
        } catch (error) {
          console.error("AI Evaluation failed", error);
        } finally {
          setEvaluating(false);
        }
      } else {
        setAiSuggestion(null);
      }
    };

    const timer = setTimeout(evaluate, 500);
    return () => clearTimeout(timer);
  }, [watchHargaBeli, watchHargaJual, watchNamaProduk]);

  const onSubmit = (data: z.infer<typeof schema>) => {
    setLoading(true);
    if (product) {
      updateProduct(product.id, data);
    } else {
      addProduct(data);
    }
    setLoading(false);
    onSuccess();
  };

  const isLowMargin = aiSuggestion?.toLowerCase().includes('terlalu rendah');

  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{product ? 'Edit Produk' : 'Tambah Produk Baru'}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="namaProduk">Nama Produk</Label>
          <Input id="namaProduk" {...register('namaProduk')} placeholder="Contoh: Beras 5kg" />
          {errors.namaProduk && <p className="text-xs text-destructive">{errors.namaProduk.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="hargaBeli">Harga Beli (Rp)</Label>
            <Input id="hargaBeli" type="number" {...register('hargaBeli')} />
            {errors.hargaBeli && <p className="text-xs text-destructive">{errors.hargaBeli.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="hargaJual">Harga Jual (Rp)</Label>
            <Input id="hargaJual" type="number" {...register('hargaJual')} />
            {errors.hargaJual && <p className="text-xs text-destructive">{errors.hargaJual.message}</p>}
          </div>
        </div>

        {evaluating && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
            <Loader2 className="h-3 w-3 animate-spin" />
            Mengevaluasi margin keuntungan...
          </div>
        )}

        {aiSuggestion && !evaluating && (
          <div className={`p-3 rounded-lg text-sm flex gap-3 ${isLowMargin ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>
            {isLowMargin ? <AlertCircle className="h-5 w-5 shrink-0" /> : <TrendingUp className="h-5 w-5 shrink-0" />}
            <p className="leading-tight">{aiSuggestion}</p>
          </div>
        )}

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