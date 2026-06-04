/**
 * @fileOverview AI Flow dinonaktifkan untuk mendukung ekspor statis (Static Export).
 * Server Actions tidak didukung dalam mode output: 'export'.
 */

export async function suggestProfitMargin() {
  return { suggestion: "Fitur analisis AI membutuhkan server aktif dan tidak tersedia di versi statis." };
}
