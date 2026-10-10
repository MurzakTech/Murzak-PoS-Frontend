import { parseCsv, cellsToText } from './productImport';

const EXCEL = /\.xlsx$/i;
const OLD_EXCEL = /\.xls$/i;
const TEXT = /\.(csv|tsv|txt)$/i;

/**
 * Reads a chosen file into rows of text cells (first row = headings).
 * Resolves { rows } or { error } with a sentence that can be shown as is.
 * Excel files (.xlsx) are read from their first sheet; the Excel library is
 * loaded only when one is chosen, so it does not slow down the rest of the app.
 */
export const readProductFile = async (file) => {
  if (!file) return { error: 'No file was chosen.' };

  if (OLD_EXCEL.test(file.name)) {
    return { error: 'Old Excel files (.xls) cannot be read. In Excel choose File, Save As, and pick "Excel Workbook (.xlsx)" or "CSV", then upload that file.' };
  }

  try {
    if (EXCEL.test(file.name)) {
      const { default: readXlsxFile } = await import('read-excel-file');
      return { rows: cellsToText(await readXlsxFile(file)) };
    }

    if (TEXT.test(file.name) || file.type === 'text/csv') {
      const buffer = await file.arrayBuffer();
      let text = new TextDecoder('utf-8').decode(buffer);
      // Excel's plain "CSV" on Windows is not UTF-8; reading it as such turns letters like é into garbage
      if (text.includes('�')) text = new TextDecoder('windows-1252').decode(buffer);
      const { rows, unclosedQuote } = parseCsv(text);
      if (unclosedQuote) {
        return { error: 'A quotation mark in the file is never closed, so the rest of the file would be read as one cell. Check for a stray " character and upload again.' };
      }
      return { rows };
    }
  } catch (e) {
    return { error: 'We could not open that file. Make sure it is a valid .csv or .xlsx file that is not password protected.' };
  }

  return { error: 'Please choose a CSV (.csv) or Excel (.xlsx) file.' };
};
