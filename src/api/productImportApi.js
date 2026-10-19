import axiosInstance from './axiosInstance';
import { friendlyErrorMessage, humanizeMessage } from '../utils/friendlyError';

/**
 * The product spreadsheet import of the redesign (ticket P7-1). Two calls, both described in
 * docs/redesign/P7-1-contract.md of the back end repository:
 *   preview_product_import  reads the sheet against the shop and says what will happen to each row (changes nothing)
 *   import_products         does it (safe to send again: products that already match are left alone)
 * A ZIP of photos is uploaded first, as a private file, and only its address is sent with the rows.
 */
const IMPORT = 'murzak_pos.api.product_import_api';

export const MAX_ZIP_BYTES = 60 * 1024 * 1024;

const body = (response) => response.data?.message ?? response.data;

const send = async (method, { rows, company, warehouse, photosFile }, fallback) => {
  const params = { rows };
  if (company) params.company = company;
  if (warehouse) params.warehouse = warehouse;
  if (photosFile) params.photos_file = photosFile;
  let response;
  try {
    response = await axiosInstance.post(`${IMPORT}.${method}`, params);
  } catch (error) {
    throw new Error(friendlyErrorMessage(error, fallback));
  }
  const reply = body(response);
  if (!reply || reply.success === false || !reply.data) throw new Error(humanizeMessage(reply?.message, fallback));
  return reply.data;
};

const list = (value) => (Array.isArray(value) ? value : []);

/**
 * What the import would do. Resolves to { rows, counts, summary, newCategories, newBrands, categoriesLine, brandsLine, stock, store,
 * photos } where each row is { row, item_code, item_name, action, will, understood, changes, problems[{field,message}], notes[] }.
 */
export const previewProductImport = async (request) => {
  const data = await send('preview_product_import', request, 'We could not check the file. Please try again.');
  return {
    rows: list(data.rows),
    counts: data.counts || { total: 0, create: 0, update: 0, unchanged: 0, invalid: 0 },
    summary: data.summary || '',
    newCategories: list(data.new_categories),
    newBrands: list(data.new_brands),
    categoriesLine: data.categories_line || '',
    brandsLine: data.brands_line || '',
    stock: data.stock || { rows: 0, units: 0, stores: [] },
    store: data.store || '',
    photos: data.photos || { zip_used: false, zip_files: 0, zip_ignored: 0, problem: '' },
  };
};

/**
 * Does the import. Resolves to { rows, counts, total, categoriesCreated, brandsCreated, stock, picturesAdded, photosProblem } where each
 * row is { row, item_code, item_name, status, message, notes[], problems[] } and status is created, updated, unchanged, failed or left_out.
 */
export const importProducts = async (request) => {
  const data = await send('import_products', request, 'We could not import the file. Please try again.');
  return {
    rows: list(data.rows),
    counts: { created: 0, updated: 0, unchanged: 0, failed: 0, left_out: 0, ...(data.counts || {}) },
    total: Number(data.total) || 0,
    categoriesCreated: list(data.categories_created),
    brandsCreated: list(data.brands_created),
    stock: data.stock || { rows: 0, reference: '', problem: '' },
    picturesAdded: Number(data.pictures_added) || 0,
    photosProblem: data.photos_problem || '',
  };
};

/**
 * Uploads the ZIP of photos as a private file and returns its address. Throws an Error with a plain sentence.
 * The file is not opened here; the server unpacks it in memory and checks every picture.
 */
export const uploadPhotosZip = async (file) => {
  if (!file || !/\.zip$/i.test(file.name || '')) throw new Error('Choose a ZIP file of photos.');
  if (file.size > MAX_ZIP_BYTES) throw new Error('That ZIP is too big. Keep it under 60 MB.');
  const form = new FormData();
  form.append('file', file, file.name);
  form.append('is_private', '1');
  form.append('folder', 'Home');
  let response;
  try {
    response = await axiosInstance.post('upload_file', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  } catch (error) {
    throw new Error(friendlyErrorMessage(error, 'The ZIP could not be uploaded. Please try again.'));
  }
  const url = response.data?.message?.file_url;
  if (!url) throw new Error('The ZIP was sent but the server did not confirm it. Please try again.');
  return url;
};
