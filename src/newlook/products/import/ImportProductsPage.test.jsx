/**
 * The Import products page (ticket P7-1): choose a spreadsheet, see what each row will do and which categories will be created
 * BEFORE anything is saved, import, and read the result. The server calls and the file reading are replaced by plain values.
 */
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import ImportProductsPage from './ImportProductsPage';
import { importProducts, previewProductImport, uploadPhotosZip } from '../../../api/productImportApi';
import { listUnits } from '../../../api/productsListApi';
import { readProductFile } from '../../../utils/readProductFile';
import { saveTextFile } from '../../../utils/saveTextFile';

jest.mock('../../../api/axiosInstance', () => ({ __esModule: true, default: {} }));
jest.mock('../../../api/productImportApi', () => ({ previewProductImport: jest.fn(), importProducts: jest.fn(), uploadPhotosZip: jest.fn() }));
jest.mock('../../../api/productsListApi', () => ({ ...jest.requireActual('../../../api/productsListApi'), listUnits: jest.fn() }));
jest.mock('../../../utils/readProductFile', () => ({ readProductFile: jest.fn() }));
jest.mock('../../../utils/saveTextFile', () => ({ saveTextFile: jest.fn() }));

const HEAD = ['item_code', 'item_name', 'category', 'unit', 'price', 'cost_price', 'opening_stock'];
const SHEET = [
  HEAD,
  ['A1', 'Soda', 'Fizzy', 'pieces', '100', '', ''],
  ['A2', 'Rice', 'fizzy ', 'kilograms', '200', '150', '10'],
  ['A3', 'Broken', '', '', 'abc', '', ''],
];

const previewAnswer = (more = {}) => ({
  rows: [
    { row: 2, item_code: 'A1', item_name: 'Soda', action: 'create', will: 'Will be added as a new product.', understood: { category: 'Fizzy', unit: 'Nos', price: 100, is_service: false }, changes: [], problems: [], notes: ['No price was given.'] },
    { row: 3, item_code: 'A2', item_name: 'Rice', action: 'update', will: 'Will be updated: price.', understood: { category: 'Fizzy', unit: 'Kg', price: 200, opening_stock: 10, store: 'Stores - A', is_service: false }, changes: [{ field: 'price', from: 150, to: 200 }], problems: [], notes: [] },
  ],
  counts: { total: 2, create: 1, update: 1, unchanged: 0, invalid: 0 },
  summary: '',
  newCategories: ['Fizzy'],
  newBrands: [],
  categoriesLine: '1 new category will be created: Fizzy.',
  brandsLine: '',
  stock: { rows: 1, units: 10, stores: ['Stores - A'] },
  store: 'Stores - A',
  photos: { zip_used: false, zip_files: 0, zip_ignored: 0, problem: '' },
  ...more,
});

const resultAnswer = (more = {}) => ({
  rows: [
    { row: 2, item_code: 'A1', item_name: 'Soda', status: 'created', message: 'Added as a new product.', notes: [], problems: [] },
    { row: 3, item_code: 'A2', item_name: 'Rice', status: 'updated', message: 'Updated: price.', notes: ['Cost was kept.'], problems: [] },
  ],
  counts: { created: 1, updated: 1, unchanged: 0, failed: 0, left_out: 0 },
  total: 2,
  categoriesCreated: ['Fizzy'],
  brandsCreated: [],
  stock: { rows: 1, reference: 'MAT-RECO-1', problem: '' },
  picturesAdded: 0,
  photosProblem: '',
  ...more,
});

const Where = () => <p data-testid="where">{useLocation().pathname}</p>;

const renderPage = async () => {
  listUnits.mockResolvedValue([{ name: 'Nos', uom_name: 'Nos' }, { name: 'Kg', uom_name: 'Kg' }]);
  const view = render(
    <MemoryRouter initialEntries={['/new-look/products/import']}>
      <ImportProductsPage />
      <Where />
    </MemoryRouter>
  );
  await waitFor(() => expect(screen.getByRole('button', { name: 'Choose file' })).toBeEnabled());
  return view;
};

const chooseFile = async (name = 'products.csv') => {
  const input = screen.getByLabelText('Spreadsheet file');
  userEvent.upload(input, new File(['x'], name, { type: 'text/csv' }));
  await screen.findByText(/Chosen:/);
};

beforeEach(() => {
  jest.resetAllMocks();
  readProductFile.mockResolvedValue({ rows: SHEET });
  previewProductImport.mockResolvedValue(previewAnswer());
  importProducts.mockResolvedValue(resultAnswer());
});

describe('before a file is chosen', () => {
  test('explains the steps and lists every column in plain words', async () => {
    await renderPage();
    expect(screen.getByRole('heading', { name: 'Import products' })).toBeInTheDocument();
    expect(screen.getByText('Step 1: Your spreadsheet')).toBeInTheDocument();
    expect(screen.getByText('Step 2: Photos (optional)')).toBeInTheDocument();
    userEvent.click(screen.getByText('Show the columns'));
    const table = screen.getByRole('table', { name: 'The columns of the spreadsheet' });
    expect(within(table).getAllByRole('row')).toHaveLength(16);
    expect(within(table).getByRole('rowheader', { name: 'opening_stock' })).toBeInTheDocument();
    expect(screen.getByText(/A product whose code already exists is updated/)).toBeInTheDocument();
  });

  test('the template can be downloaded', async () => {
    await renderPage();
    userEvent.click(screen.getByRole('button', { name: 'Download the template (CSV)' }));
    expect(saveTextFile).toHaveBeenCalledTimes(1);
    expect(saveTextFile.mock.calls[0][1]).toBe('products_import_template.csv');
    expect(saveTextFile.mock.calls[0][0]).toContain('item_code,item_name,category');
  });

  test('importing with no file says there is nothing to import', async () => {
    await renderPage();
    userEvent.click(screen.getByRole('button', { name: 'Import products' }));
    expect(await screen.findByText(/Choose a file with products first/)).toBeInTheDocument();
    expect(importProducts).not.toHaveBeenCalled();
  });
});

describe('checking a file', () => {
  test('sends only the rows the browser accepted, with plain-word units turned into the shop units', async () => {
    await renderPage();
    await chooseFile();
    await screen.findByText('1 new category will be created: Fizzy.');
    const sent = previewProductImport.mock.calls[0][0];
    expect(sent.rows.map((r) => r.item_code)).toEqual(['A1', 'A2']);
    expect(sent.rows.map((r) => r.unit)).toEqual(['Nos', 'Kg']);
    expect(sent.photosFile).toBe('');
  });

  test('shows what will happen to each row, the counts, and the rows the browser refused', async () => {
    await renderPage();
    await chooseFile();
    await screen.findByText('1 new category will be created: Fizzy.');
    expect(screen.getByText('1 new')).toBeInTheDocument();
    expect(screen.getByText('1 to update')).toBeInTheDocument();
    expect(screen.getByText('1 left out')).toBeInTheDocument();
    expect(screen.getByText('Will be added as a new product.')).toBeInTheDocument();
    expect(screen.getByText('Will be updated: price.')).toBeInTheDocument();
    expect(screen.getByText('Changes: price: KES 150 to KES 200')).toBeInTheDocument();
    expect(screen.getByText('Price: KES 200')).toBeInTheDocument();
    expect(screen.getByText('The price "abc" is not a number.')).toBeInTheDocument();
    expect(screen.getByText('1 products get opening stock, 10 items in total. Opening stock goes into Stores - A.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import 2 products' })).toBeInTheDocument();
    expect(screen.getByText('Nothing is changed until you press the import button.')).toBeInTheDocument();
  });

  test('the rows to fix can be downloaded', async () => {
    await renderPage();
    await chooseFile();
    userEvent.click(await screen.findByRole('button', { name: 'Download the rows to fix' }));
    expect(saveTextFile.mock.calls[0][1]).toBe('rows_to_fix.csv');
    expect(saveTextFile.mock.calls[0][0]).toContain('The price ""abc"" is not a number.');
  });

  test('the filter shows only rows that need a look', async () => {
    await renderPage();
    await chooseFile();
    await screen.findByText('Will be updated: price.');
    userEvent.click(screen.getByRole('radio', { name: 'Rows that need a look' }));
    expect(screen.getByText('The price "abc" is not a number.')).toBeInTheDocument();
    expect(screen.getByText('No price was given.')).toBeInTheDocument();
    expect(screen.queryByText('Will be updated: price.')).not.toBeInTheDocument();
  });

  test('a file with a problem of its own says so and sends nothing', async () => {
    readProductFile.mockResolvedValue({ rows: [['colour'], ['red']] });
    await renderPage();
    await chooseFile();
    expect(await screen.findByText(/"item_code" and "item_name"/)).toBeInTheDocument();
    expect(previewProductImport).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Import products' })).toBeInTheDocument();
  });

  test('a file that cannot be read says so', async () => {
    readProductFile.mockResolvedValue({ error: 'Please choose a CSV (.csv) or Excel (.xlsx) file.' });
    await renderPage();
    userEvent.upload(screen.getByLabelText('Spreadsheet file'), new File(['x'], 'a.pdf'));
    expect(await screen.findByText('Please choose a CSV (.csv) or Excel (.xlsx) file.')).toBeInTheDocument();
  });

  test('when the server cannot check the file the person is told and nothing can be imported', async () => {
    previewProductImport.mockRejectedValue(new Error('We could not check the file. Please try again.'));
    await renderPage();
    await chooseFile();
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not check the file');
    userEvent.click(screen.getByRole('button', { name: /^Import/ }));
    expect(importProducts).not.toHaveBeenCalled();
  });

  test('a ZIP of photos is uploaded once and the check is run again with it', async () => {
    uploadPhotosZip.mockResolvedValue('/private/files/photos.zip');
    await renderPage();
    await chooseFile();
    await screen.findByText('Will be updated: price.');
    previewProductImport.mockResolvedValue(previewAnswer({ photos: { zip_used: true, zip_files: 7, zip_ignored: 2, problem: '' } }));
    userEvent.upload(screen.getByLabelText('ZIP file of photos'), new File(['x'], 'photos.zip', { type: 'application/zip' }));
    expect(await screen.findByText(/7 photos found in the ZIP/)).toBeInTheDocument();
    expect(uploadPhotosZip).toHaveBeenCalledTimes(1);
    expect(previewProductImport).toHaveBeenCalledTimes(2);
    expect(previewProductImport.mock.calls[1][0].photosFile).toBe('/private/files/photos.zip');
  });

  test('a ZIP that cannot be uploaded is explained', async () => {
    uploadPhotosZip.mockRejectedValue(new Error('That ZIP is too big. Keep it under 60 MB.'));
    await renderPage();
    userEvent.upload(screen.getByLabelText('ZIP file of photos'), new File(['x'], 'photos.zip'));
    expect(await screen.findByText('That ZIP is too big. Keep it under 60 MB.')).toBeInTheDocument();
  });
});

describe('importing', () => {
  test('sends the same rows, then shows what happened', async () => {
    await renderPage();
    await chooseFile();
    userEvent.click(await screen.findByRole('button', { name: 'Import 2 products' }));
    expect(await screen.findByRole('heading', { name: 'Import finished' })).toBeInTheDocument();
    expect(importProducts.mock.calls[0][0].rows.map((r) => r.item_code)).toEqual(['A1', 'A2']);
    expect(screen.getByText('1 added')).toBeInTheDocument();
    expect(screen.getByText('1 updated')).toBeInTheDocument();
    expect(screen.getByText('New categories created: Fizzy.')).toBeInTheDocument();
    expect(screen.getByText('Opening stock added for 1 products.')).toBeInTheDocument();
    expect(screen.getByText('Cost was kept.')).toBeInTheDocument();
    expect(screen.getByText(/You can send the same file again/)).toBeInTheDocument();
  });

  test('trouble in the result is called out', async () => {
    importProducts.mockResolvedValue(resultAnswer({ counts: { created: 1, updated: 0, unchanged: 0, failed: 1, left_out: 0 }, stock: { rows: 0, reference: '', problem: 'Import the same file again to add it.' } }));
    await renderPage();
    await chooseFile();
    userEvent.click(await screen.findByRole('button', { name: 'Import 2 products' }));
    expect(await screen.findByRole('heading', { name: 'Import finished, some products need attention' })).toBeInTheDocument();
    expect(screen.getByText('1 could not be saved')).toBeInTheDocument();
    expect(screen.getByText('Opening stock was not added. Import the same file again to add it.')).toBeInTheDocument();
  });

  test('a failed import keeps the file and the preview so it can be tried again', async () => {
    importProducts.mockRejectedValueOnce(new Error('We could not import the file. Please try again.'));
    await renderPage();
    await chooseFile();
    userEvent.click(await screen.findByRole('button', { name: 'Import 2 products' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not import the file');
    userEvent.click(screen.getByRole('button', { name: 'Import 2 products' }));
    expect(await screen.findByRole('heading', { name: 'Import finished' })).toBeInTheDocument();
    expect(importProducts).toHaveBeenCalledTimes(2);
  });

  test('when nothing can be imported the button explains', async () => {
    previewProductImport.mockResolvedValue(previewAnswer({ rows: [], counts: { total: 0, create: 0, update: 0, unchanged: 2, invalid: 0 }, newCategories: [], categoriesLine: '', stock: { rows: 0, units: 0, stores: [] } }));
    await renderPage();
    await chooseFile();
    await screen.findByText('2 already up to date');
    userEvent.click(screen.getByRole('button', { name: 'Import products' }));
    expect(await screen.findByText(/None of the rows can be imported yet/)).toBeInTheDocument();
    expect(importProducts).not.toHaveBeenCalled();
  });

  test('View products goes to the list, and Import another file starts again', async () => {
    await renderPage();
    await chooseFile();
    userEvent.click(await screen.findByRole('button', { name: 'Import 2 products' }));
    userEvent.click(await screen.findByRole('button', { name: 'Import another file' }));
    expect(await screen.findByText('Step 1: Your spreadsheet')).toBeInTheDocument();
    await chooseFile();
    userEvent.click(await screen.findByRole('button', { name: 'Import 2 products' }));
    userEvent.click(await screen.findByRole('button', { name: 'View products' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/new-look/products');
  });
});
