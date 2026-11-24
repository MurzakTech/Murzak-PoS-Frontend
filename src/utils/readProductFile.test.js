import fs from 'fs';
import path from 'path';
import { readProductFile } from './readProductFile';

// The test browser (jsdom) has no Blob.arrayBuffer(), which real browsers have; read it the old way
if (!Blob.prototype.arrayBuffer) {
  // eslint-disable-next-line no-extend-native
  Blob.prototype.arrayBuffer = function arrayBuffer() {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(this);
    });
  };
}

// A real Excel file (made with a spreadsheet program), so the Excel reader library is exercised for real: its first
// sheet "Products" has a heading row and three products; a second sheet "Notes" must be ignored.
const excelFile = (name = 'products.xlsx') => {
  const bytes = fs.readFileSync(path.join(__dirname, '__fixtures__', 'products.xlsx'));
  return new File([bytes], name, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

describe('reading a product file', () => {
  test('an Excel file gives the rows of its first sheet as text, headings first', async () => {
    const result = await readProductFile(excelFile());
    expect(result.error).toBeUndefined();
    expect(result.rows).toHaveLength(4);
    expect(result.rows[0]).toEqual(['item_code', 'item_name', 'price', 'opening_stock', 'expiry', 'active']);
    expect(result.rows[1].slice(0, 4)).toEqual(['SODA-1', 'Soda 500ml', '120.5', '24']);
    expect(result.rows[2].slice(0, 4)).toEqual(['MILK-2', 'Milk, fresh', '85', '']);
    expect(result.rows[3].slice(0, 4)).toEqual(['RICE-3', 'Rice 2kg (pishori)', '1,250', '3']);
  });

  test('a date cell in Excel comes out as a date, not a number', async () => {
    const { rows } = await readProductFile(excelFile());
    expect(rows[1][4]).toMatch(/2026-12-31/);
    expect(rows[3][4]).toMatch(/2027-01-15/);
  });

  test('the second sheet is not read', async () => {
    const { rows } = await readProductFile(excelFile());
    expect(JSON.stringify(rows)).not.toContain('not this sheet');
  });

  test('a file named .xlsx that is not an Excel file is refused in words', async () => {
    const result = await readProductFile(new File(['this is just text'], 'fake.xlsx'));
    expect(result.rows).toBeUndefined();
    expect(result.error).toMatch(/could not open that file/i);
  });

  test('an old .xls file is refused with the way to fix it', async () => {
    const result = await readProductFile(new File(['x'], 'old.xls'));
    expect(result.error).toMatch(/Save As/);
  });

  test('a CSV file is read as text rows', async () => {
    const result = await readProductFile(new File(['item_code,item_name\nA1,Tea\n'], 'p.csv', { type: 'text/csv' }));
    expect(result.rows).toEqual([['item_code', 'item_name'], ['A1', 'Tea']]);
  });

  test('no file chosen', async () => {
    expect((await readProductFile(null)).error).toMatch(/No file/);
  });
});
