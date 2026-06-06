
"use client"

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Product, ModalAdjustment } from "./types";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface PdfExportOptions {
  products: Product[];
  modalTarget: number;
  totalModalAkhir: number;
  totalModalBiasa: number;
  totalNilaiTitipanTerjual: number;
  ralatBersih: number;
  rorisLiability: number;
  selisih: number;
  status: string;
  modalHistory: any[];
  adjustments: ModalAdjustment[];
  warungName: string;
}

export const exportLaporanModalPdf = ({
  products,
  modalTarget,
  totalModalAkhir,
  totalModalBiasa,
  totalNilaiTitipanTerjual,
  ralatBersih,
  rorisLiability,
  selisih,
  status,
  modalHistory,
  adjustments,
  warungName
}: PdfExportOptions) => {
  const doc = new jsPDF();
  const now = new Date();
  const dateStr = format(now, "dd MMMM yyyy", { locale: id });
  const timeStr = format(now, "HH:mm");

  const formatCurrency = (val: number, showSign = false) => {
    const formatted = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(Math.abs(val));
    
    if (val === 0) return "Rp 0";
    const sign = val > 0 ? (showSign ? "+" : "") : "-";
    return `${sign}${formatted}`;
  };

  // 1. JUDUL
  doc.setFontSize(18);
  doc.setTextColor(37, 99, 235);
  doc.text(`Laporan Roris - ${warungName}`, 14, 20);
  
  // 2. INFO LAPORAN
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Dicetak pada: ${dateStr}, pukul ${timeStr} WIB`, 14, 28);
  doc.line(14, 32, 196, 32);

  // 3. RINGKASAN MODAL & INVENTARIS
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text("Ringkasan Hasil Roris", 14, 40);

  const summaryData = [
    ["Total Jenis Produk", `${products.length} jenis`],
    ["Total Stok Gudang", `${products.reduce((acc, p) => acc + p.stok, 0)} item`],
    ["Total Modal Barang", formatCurrency(totalModalAkhir)],
    ["Target Modal Toko", formatCurrency(modalTarget)],
    ["Ralat Modal Bersih", formatCurrency(ralatBersih, true)],
    ["Tanggungan Roris", formatCurrency(rorisLiability, false)],
    ["Selisih Akhir", formatCurrency(selisih, true)],
    ["Status Roris", status.toUpperCase()],
  ];

  autoTable(doc, {
    startY: 45,
    body: summaryData,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: 'bold', width: 60 } },
    didParseCell: (data) => {
      if (data.row.index === 6) { // Baris Selisih Akhir
        data.cell.styles.fontStyle = 'bold';
        if (selisih < 0) data.cell.styles.textColor = [220, 38, 38];
        else if (selisih > 0) data.cell.styles.textColor = [5, 150, 105];
      }
    }
  });

  // 4. RINCIAN PER KATEGORI
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

  // 5. RINCIAN RALAT MODAL
  currentY = (doc as any).lastAutoTable.finalY + 15;
  if (currentY > 240) { doc.addPage(); currentY = 20; }
  
  doc.setFontSize(12);
  doc.setTextColor(37, 99, 235);
  doc.text("Rincian Ralat Modal", 14, currentY);

  if (adjustments && adjustments.length > 0) {
    const adjTableData = [...adjustments]
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .map(adj => [
        format(new Date(adj.tanggal), "dd/MM/yy"),
        adj.jenis,
        formatCurrency(adj.nominal, adj.jenis === 'Tambah'),
        adj.keterangan
      ]);

    autoTable(doc, {
      startY: currentY + 5,
      head: [['Tanggal', 'Jenis', 'Nominal', 'Keterangan']],
      body: adjTableData,
      headStyles: { fillColor: [71, 85, 105] },
      styles: { fontSize: 9 },
    });
  } else {
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("Tidak ada ralat modal.", 14, currentY + 10);
    (doc as any).lastAutoTable = { finalY: currentY + 10 };
  }

  // 6. DETAIL BARANG TITIPAN
  const titipanProducts = products.filter(p => p.kategori === 'Titipan');
  if (titipanProducts.length > 0) {
    currentY = (doc as any).lastAutoTable.finalY + 15;
    if (currentY > 240) { doc.addPage(); currentY = 20; }

    doc.setFontSize(12);
    doc.setTextColor(37, 99, 235);
    doc.text("Detail Barang Titipan (Pengurang Modal)", 14, currentY);
    
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
  }

  // 7. DAFTAR LENGKAP PRODUK
  currentY = (doc as any).lastAutoTable.finalY + 15;
  if (currentY > 240) { doc.addPage(); currentY = 20; }
  
  doc.setFontSize(12);
  doc.setTextColor(37, 99, 235);
  doc.text("Daftar Lengkap Barang", 14, currentY);

  const fullProductList = [...products].sort((a, b) => {
    if (a.kategori !== b.kategori) return a.kategori.localeCompare(b.kategori);
    return a.namaBarang.localeCompare(b.namaBarang);
  });

  const fullProductTableData = fullProductList.map((p, index) => [
    index + 1,
    p.namaBarang,
    p.kategori,
    p.stok,
    formatCurrency(p.modal),
    formatCurrency(p.hargaJual),
    formatCurrency(p.stok * p.modal)
  ]);

  autoTable(doc, {
    startY: currentY + 5,
    head: [['No', 'Nama Barang', 'Kategori', 'Stok', 'Modal', 'Jual', 'Total']],
    body: fullProductTableData,
    headStyles: { fillColor: [51, 65, 85] },
    styles: { fontSize: 8 },
    columnStyles: { 
      0: { cellWidth: 10 },
      2: { cellWidth: 20 },
      3: { cellWidth: 15 },
      4: { cellWidth: 25 },
      5: { cellWidth: 25 },
      6: { cellWidth: 25 }
    },
  });

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

  doc.save(`laporan-roris-${warungName.toLowerCase().replace(/\s+/g, '-')}-${format(now, "yyyy-MM-dd")}.pdf`);
};
