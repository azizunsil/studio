
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
    const isNegative = val < 0;
    const absVal = Math.abs(val);
    const formatted = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(absVal);
    
    if (val === 0) return "Rp 0";
    const sign = isNegative ? "-" : (showSign ? "+" : "");
    return `${sign}${formatted}`;
  };

  // Urutan Kategori Manual
  const categoryOrder = ['Rokok', 'Sembako', 'Minuman', 'Sachet', 'Lainnya', 'Titipan'];

  // HEADER
  doc.setFontSize(18);
  doc.setTextColor(37, 99, 235);
  doc.text(`Laporan Hasil Roris - ${warungName}`, 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Dicetak pada: ${dateStr}, pukul ${timeStr} WIB`, 14, 28);
  doc.line(14, 32, 196, 32);

  // SECTION 1: RINGKASAN PER KATEGORI (Pindah ke posisi pertama)
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text("1. Ringkasan Per Kategori", 14, 40);

  const categorySummaryData = categoryOrder.map(cat => {
    const catProducts = products.filter(p => p.kategori === cat);
    const totalStok = catProducts.reduce((acc, p) => acc + (p.stok || 0), 0);
    const totalModal = cat === 'Titipan' 
      ? 0 
      : catProducts.reduce((acc, p) => acc + ((p.stok || 0) * (p.modal || 0)), 0);
    return [cat, `${catProducts.length} barang`, `${totalStok} item`, formatCurrency(totalModal)];
  });

  autoTable(doc, {
    startY: 45,
    head: [['Kategori', 'Jumlah Jenis', 'Total Stok', 'Total Modal']],
    body: categorySummaryData,
    headStyles: { fillColor: [51, 65, 85] },
    styles: { fontSize: 9 },
  });

  // SECTION 2: RINGKASAN HASIL RORIS (Pindah ke posisi kedua)
  let currentY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text("2. Ringkasan Hasil Roris", 14, currentY);

  // Kalkulasi Titipan Terjual untuk baris baru
  const totalNilaiTitipanTerjual = products.filter(p => p.kategori === 'Titipan').reduce((acc, p) => {
    const terjual = Math.max(0, (p.stokAwalTitipan || 0) - p.stok);
    return acc + (terjual * p.modal);
  }, 0);

  const summaryData = [
    ["Total Jenis Produk", `${products.length} barang`],
    ["Total Modal Barang", formatCurrency(totalModalAkhir + totalNilaiTitipanTerjual)],
    ["Titipan Terjual (-)", `-${formatCurrency(totalNilaiTitipanTerjual)}`],
    ["Target Modal Toko", formatCurrency(modalTarget)],
    ["Ralat Modal Bersih", formatCurrency(ralatBersih, true)],
    ["Tanggungan Roris", `-${formatCurrency(rorisLiability)}`],
    ["Selisih Akhir", formatCurrency(selisih, true)],
    ["Status Modal", status.toUpperCase()],
  ];

  autoTable(doc, {
    startY: currentY + 5,
    body: summaryData,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: 'bold', width: 60 } },
    didParseCell: (data) => {
      if (data.row.index === 6) { // Selisih Akhir
        data.cell.styles.fontStyle = 'bold';
        if (selisih < 0) data.cell.styles.textColor = [220, 38, 38];
        else if (selisih > 0) data.cell.styles.textColor = [5, 150, 105];
      }
    }
  });

  // SECTION 3: RINCIAN RALAT MODAL
  currentY = (doc as any).lastAutoTable.finalY + 15;
  if (currentY > 240) { doc.addPage(); currentY = 20; }
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text("3. Rincian Ralat Modal", 14, currentY);

  if (adjustments && adjustments.length > 0) {
    const adjData = [...adjustments]
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .map(adj => [
        format(new Date(adj.tanggal), "dd/MM/yy HH:mm"),
        adj.jenis,
        formatCurrency(adj.nominal, adj.jenis === 'Tambah'),
        adj.keterangan
      ]);

    autoTable(doc, {
      startY: currentY + 5,
      head: [['Tanggal', 'Jenis', 'Nominal', 'Keterangan']],
      body: adjData,
      headStyles: { fillColor: [71, 85, 105] },
      styles: { fontSize: 9 },
    });
  } else {
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("Tidak ada ralat modal.", 14, currentY + 10);
    (doc as any).lastAutoTable = { finalY: currentY + 10 };
  }

  // SECTION 4: RIWAYAT MODAL 5 TERAKHIR
  currentY = (doc as any).lastAutoTable.finalY + 15;
  if (currentY > 240) { doc.addPage(); currentY = 20; }
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text("4. Riwayat Modal 5 Terakhir", 14, currentY);

  if (modalHistory && modalHistory.length > 0) {
    const historyData = [...modalHistory]
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, 5)
      .map(h => [
        format(new Date(h.tanggal), "dd/MM/yy HH:mm"),
        formatCurrency(h.modalSaatIni),
        formatCurrency(h.selisih, true),
        h.status.toUpperCase()
      ]);

    autoTable(doc, {
      startY: currentY + 5,
      head: [['Tanggal', 'Modal', 'Selisih', 'Status']],
      body: historyData,
      headStyles: { fillColor: [100, 116, 139] },
      styles: { fontSize: 9 },
    });
  } else {
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("Belum ada riwayat modal.", 14, currentY + 10);
    (doc as any).lastAutoTable = { finalY: currentY + 10 };
  }

  // SECTION 5: DAFTAR PRODUK LENGKAP
  currentY = (doc as any).lastAutoTable.finalY + 20;
  
  // A. KATEGORI BIASA
  const regularCategories = ['Rokok', 'Sembako', 'Minuman', 'Sachet', 'Lainnya'];
  regularCategories.forEach(cat => {
    const catProducts = products
      .filter(p => p.kategori === cat)
      .sort((a, b) => a.namaBarang.localeCompare(b.namaBarang));
    
    if (catProducts.length > 0) {
      if (currentY > 250) { doc.addPage(); currentY = 20; }

      doc.setFontSize(11);
      doc.setTextColor(37, 99, 235);
      doc.text(`Daftar Produk ${cat}`, 14, currentY);
      currentY += 5;

      const tableData = catProducts.map((p, idx) => [
        idx + 1,
        p.namaBarang,
        p.stok,
        formatCurrency(p.modal),
        formatCurrency((p.stok || 0) * (p.modal || 0))
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['No', 'Nama Barang', 'Stok', 'Modal', 'Nilai Modal']],
        body: tableData,
        headStyles: { fillColor: [51, 65, 85] },
        styles: { fontSize: 8 },
        margin: { bottom: 20 },
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    }
  });

  // B. KATEGORI TITIPAN (KHUSUS)
  const titipanProducts = products
    .filter(p => p.kategori === 'Titipan')
    .sort((a, b) => a.namaBarang.localeCompare(b.namaBarang));
  
  if (titipanProducts.length > 0) {
    if (currentY > 240) { doc.addPage(); currentY = 20; }

    doc.setFontSize(12);
    doc.setTextColor(37, 99, 235);
    doc.text("Detail Barang Titipan", 14, currentY);
    currentY += 5;

    let totalTitipanTerjualVal = 0;
    const titipanTableData = titipanProducts.map(p => {
      const stokAwal = p.stokAwalTitipan || 0;
      const terjual = Math.max(0, stokAwal - p.stok);
      const nilaiTerjual = terjual * p.modal;
      totalTitipanTerjualVal += nilaiTerjual;
      
      return [
        p.namaBarang,
        stokAwal,
        p.stok,
        terjual,
        formatCurrency(p.modal),
        formatCurrency(nilaiTerjual)
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Nama Barang', 'Awal', 'Stok', 'Terjual', 'Modal Satuan', 'Nilai Terjual']],
      body: titipanTableData,
      headStyles: { fillColor: [2, 132, 199] },
      styles: { fontSize: 8 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.text(`Total Nilai Titipan Terjual: ${formatCurrency(totalTitipanTerjualVal)}`, 14, currentY);
    doc.setFont("helvetica", "normal");
  }

  // FOOTER HALAMAN
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Oya Apps / Hasil Roris - Halaman ${i} dari ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  const fileName = `Laporan_Roris_${warungName.replace(/\s+/g, '_')}_${format(now, "yyyyMMdd")}.pdf`;
  doc.save(fileName);
};
