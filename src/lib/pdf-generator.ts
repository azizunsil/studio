"use client"

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Product } from "./types";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface PdfExportOptions {
  products: Product[];
  modalTarget: number;
  totalModalAkhir: number;
  totalModalBiasa: number;
  totalNilaiTitipanTerjual: number;
  selisih: number;
  status: string;
  modalHistory: any[];
}

export const exportLaporanModalPdf = ({
  products,
  modalTarget,
  totalModalAkhir,
  totalModalBiasa,
  totalNilaiTitipanTerjual,
  selisih,
  status,
  modalHistory
}: PdfExportOptions) => {
  const doc = new jsPDF();
  const now = new Date();
  const dateStr = format(now, "dd MMMM yyyy", { locale: id });
  const timeStr = format(now, "HH:mm");

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  // 1. JUDUL
  doc.setFontSize(18);
  doc.setTextColor(37, 99, 235);
  doc.text("Laporan Modal Barang & Roris", 14, 20);
  
  // 2. INFO LAPORAN
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Dicetak pada: ${dateStr}, pukul ${timeStr} WIB`, 14, 28);
  doc.line(14, 32, 196, 32);

  // 3. RINGKASAN MODAL & INVENTARIS
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text("Ringkasan Modal & Inventaris", 14, 40);

  const summaryData = [
    ["Total Jenis Produk", `${products.length} jenis`],
    ["Total Stok Gudang", `${products.reduce((acc, p) => acc + p.stok, 0)} item`],
    ["Total Modal Kotor", formatCurrency(totalModalBiasa)],
    ["Target Modal Toko", formatCurrency(modalTarget)],
    ["Modal Saat Ini (Net)", formatCurrency(totalModalAkhir)],
    ["Selisih Modal", `${selisih >= 0 ? '+' : ''}${formatCurrency(selisih)}`],
    ["Status Modal", status.toUpperCase()],
  ];

  autoTable(doc, {
    startY: 45,
    body: summaryData,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: 'bold', width: 60 } }
  });

  // 4. RINGKASAN PER KATEGORI
  const categories: string[] = ['Rokok', 'Sembako', 'Minuman', 'Sachet', 'Titipan', 'Lainnya'];
  const categorySummaryData = categories.map(cat => {
    const filtered = products.filter(p => p.kategori === cat);
    const stok = filtered.reduce((acc, p) => acc + p.stok, 0);
    const count = filtered.length;
    const modal = cat === 'Titipan' ? 0 : filtered.reduce((acc, p) => acc + (p.modal * p.stok), 0);
    return [cat, `${count} jenis`, `${stok} item`, formatCurrency(modal)];
  });

  let currentY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text("Ringkasan Per Kategori", 14, currentY);
  
  autoTable(doc, {
    startY: currentY + 5,
    head: [['Kategori', 'Jenis', 'Stok', 'Total Modal']],
    body: categorySummaryData,
    headStyles: { fillColor: [51, 65, 85] },
  });

  // 5. RIWAYAT MODAL (Pindah ke posisi 4 dalam daftar PDF)
  currentY = (doc as any).lastAutoTable.finalY + 15;
  if (modalHistory && modalHistory.length > 0) {
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(12);
    doc.setTextColor(37, 99, 235);
    doc.text("Riwayat Pengecekan Modal (5 Terakhir)", 14, currentY);
    
    const historyTableData = [...modalHistory]
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, 5)
      .map(h => [
        format(new Date(h.tanggal), "dd/MM/yy HH:mm"),
        formatCurrency(h.modalTarget),
        formatCurrency(h.modalSaatIni),
        `${h.selisih >= 0 ? '+' : ''}${formatCurrency(h.selisih)}`,
        h.status
      ]);

    autoTable(doc, {
      startY: currentY + 5,
      head: [['Tanggal', 'Target', 'Modal Saat Ini', 'Selisih', 'Status']],
      body: historyTableData,
      headStyles: { fillColor: [100, 116, 139] },
      styles: { fontSize: 9 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;
  }

  // 6. DAFTAR PRODUK PER KATEGORI (Kecuali Titipan)
  const regularCategories = ['Rokok', 'Sembako', 'Minuman', 'Sachet', 'Lainnya'];

  regularCategories.forEach(cat => {
    const catProducts = products.filter(p => p.kategori === cat);
    if (catProducts.length > 0) {
      // Cek sisa ruang di halaman
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(11);
      doc.setTextColor(37, 99, 235);
      doc.text(`Daftar Produk ${cat}`, 14, currentY);

      const tableData = catProducts.map((p, index) => [
        index + 1,
        p.namaBarang,
        p.stok,
        formatCurrency(p.modal),
        formatCurrency(p.stok * p.modal)
      ]);

      autoTable(doc, {
        startY: currentY + 5,
        head: [['No', 'Nama Barang', 'Stok', 'Modal', 'Nilai Modal']],
        body: tableData,
        headStyles: { fillColor: [71, 85, 105] },
        styles: { fontSize: 9 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
    }
  });

  // 7. DETAIL BARANG TITIPAN (Tetap paling bawah)
  const titipanProducts = products.filter(p => p.kategori === 'Titipan');
  if (titipanProducts.length > 0) {
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(13);
    doc.setTextColor(37, 99, 235);
    doc.text("Detail Barang Titipan", 14, currentY);
    
    const titipanTableData = titipanProducts.map(p => {
      const stokAwal = p.stokAwalTitipan || 0;
      const terjual = Math.max(0, stokAwal - p.stok);
      return [
        p.namaBarang,
        stokAwal,
        p.stok,
        terjual,
        formatCurrency(p.modal),
        formatCurrency(terjual * p.modal)
      ];
    });

    autoTable(doc, {
      startY: currentY + 5,
      head: [['Nama Barang', 'Awal', 'Stok', 'Terjual', 'Modal Satuan', 'Nilai Terjual']],
      body: titipanTableData,
      headStyles: { fillColor: [2, 132, 199] },
      styles: { fontSize: 9 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(`Total Nilai Titipan Terjual: ${formatCurrency(totalNilaiTitipanTerjual)}`, 14, currentY);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("* Nilai titipan terjual bersifat sebagai pengurang modal.", 14, currentY + 5);
  }

  // 8. FOOTER HALAMAN
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Oya Apps / Barang & Roris - Halaman ${i} dari ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  doc.save(`laporan-modal-barang-roris-${format(now, "yyyy-MM-dd")}.pdf`);
};