'use server';
/**
 * @fileOverview A Genkit flow for suggesting profit margins.
 * This file defines a flow that analyzes product purchase and selling prices
 * to provide advice or warnings if the profit margin is too thin.
 *
 * - suggestProfitMargin - A function that handles the profit margin suggestion process.
 * - ProfitMarginSuggesterInput - The input type for the suggestProfitMargin function.
 * - ProfitMarginSuggesterOutput - The return type for the suggestProfitMargin function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

/**
 * Input schema for the profit margin suggester flow.
 * @property {string} namaProduk - The name of the product.
 * @property {number} hargaBeli - The purchase price of the product.
 * @property {number} hargaJual - The selling price of the product.
 */
const ProfitMarginSuggesterInputSchema = z.object({
  namaProduk: z.string().describe('Nama produk.'),
  hargaBeli: z.number().positive().describe('Harga beli produk.'),
  hargaJual: z.number().positive().describe('Harga jual produk.'),
});
export type ProfitMarginSuggesterInput = z.infer<typeof ProfitMarginSuggesterInputSchema>;

/**
 * Output schema for the profit margin suggester flow.
 * @property {string} suggestion - The advice or warning regarding the product's profit margin.
 */
const ProfitMarginSuggesterOutputSchema = z.object({
  suggestion: z
    .string()
    .describe('Saran atau peringatan mengenai margin keuntungan produk.'),
});
export type ProfitMarginSuggesterOutput = z.infer<typeof ProfitMarginSuggesterOutputSchema>;

/**
 * Analyzes product prices and provides suggestions or warnings if the profit margin is too thin.
 * @param {ProfitMarginSuggesterInput} input - The product details including purchase and selling prices.
 * @returns {Promise<ProfitMarginSuggesterOutput>} The profit margin suggestion.
 */
export async function suggestProfitMargin(
  input: ProfitMarginSuggesterInput
): Promise<ProfitMarginSuggesterOutput> {
  return profitMarginSuggesterFlow(input);
}

const ProfitMarginPromptInputSchema = ProfitMarginSuggesterInputSchema.extend({
  profitPercentage: z.number().describe('Persentase keuntungan dihitung dari harga jual.'),
  isMarginTooLow: z
    .boolean()
    .describe('Menunjukkan apakah margin keuntungan di bawah ambang batas.'),
  threshold: z.number().describe('Ambang batas persentase keuntungan yang dianggap rendah.'),
});
type ProfitMarginPromptInput = z.infer<typeof ProfitMarginPromptInputSchema>;

const profitMarginSuggesterPrompt = ai.definePrompt({
  name: 'profitMarginSuggesterPrompt',
  input: {schema: ProfitMarginPromptInputSchema},
  output: {schema: ProfitMarginSuggesterOutputSchema},
  prompt: `Anda adalah seorang ahli keuangan yang membantu pemilik usaha kecil.
Berikan saran atau peringatan jika margin keuntungan terlalu tipis, berdasarkan data yang diberikan.
Ambang batas minimal margin keuntungan yang sehat adalah {{threshold}}%.

Nama Produk: {{{namaProduk}}}
Persentase Keuntungan: {{profitPercentage}}%

{{#if isMarginTooLow}}
Output: {"suggestion": "Margin keuntungan untuk {{{namaProduk}}} ({{profitPercentage}}%) terlalu rendah. Pertimbangkan untuk menaikkan harga jual atau mencari pemasok dengan harga beli lebih rendah agar mencapai target {{threshold}}%."}
{{else}}
Output: {"suggestion": "Margin keuntungan untuk {{{namaProduk}}} ({{profitPercentage}}%) sudah sehat. Terus pertahankan harga ini untuk keuntungan optimal."}
{{/if}}
`,
});

const profitMarginSuggesterFlow = ai.defineFlow(
  {
    name: 'profitMarginSuggesterFlow',
    inputSchema: ProfitMarginSuggesterInputSchema,
    outputSchema: ProfitMarginSuggesterOutputSchema,
  },
  async input => {
    const profitMarginValue = input.hargaJual - input.hargaBeli;
    // Calculate percentage based on selling price, common practice for retail margin
    const profitPercentageValue = (profitMarginValue / input.hargaJual) * 100;

    const threshold = 10; // Target margin keuntungan diubah menjadi 10%

    const promptInput: ProfitMarginPromptInput = {
      namaProduk: input.namaProduk,
      hargaBeli: input.hargaBeli,
      hargaJual: input.hargaJual,
      profitPercentage: parseFloat(profitPercentageValue.toFixed(2)), // Ensure consistent number format
      isMarginTooLow: profitPercentageValue < threshold,
      threshold: threshold,
    };

    const {output} = await profitMarginSuggesterPrompt(promptInput);
    return output!;
  }
);
