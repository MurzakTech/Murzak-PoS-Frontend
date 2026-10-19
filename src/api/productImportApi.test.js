import axiosInstance from './axiosInstance';
import { importProducts, previewProductImport, uploadPhotosZip } from './productImportApi';

jest.mock('./axiosInstance', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

const reply = (data) => ({ data: { message: { success: true, data } } });

beforeEach(() => jest.resetAllMocks());

describe('previewProductImport', () => {
  test('sends the rows and only the options that were given', async () => {
    axiosInstance.post.mockResolvedValue(reply({ rows: [] }));
    await previewProductImport({ rows: [{ item_code: 'A' }] });
    expect(axiosInstance.post).toHaveBeenCalledWith('murzak_pos.api.product_import_api.preview_product_import', { rows: [{ item_code: 'A' }] });
    await previewProductImport({ rows: [], company: 'Shop', warehouse: 'Stores', photosFile: '/private/files/p.zip' });
    expect(axiosInstance.post).toHaveBeenLastCalledWith('murzak_pos.api.product_import_api.preview_product_import', { rows: [], company: 'Shop', warehouse: 'Stores', photos_file: '/private/files/p.zip' });
  });

  test('names the parts of the answer', async () => {
    axiosInstance.post.mockResolvedValue(
      reply({ rows: [{ row: 2 }], counts: { total: 1, create: 1, update: 0, unchanged: 0, invalid: 0 }, summary: 's', new_categories: ['Snacks'], new_brands: ['Bidco'], categories_line: 'c', brands_line: 'b', stock: { rows: 1, units: 5, stores: ['S'] }, store: 'S', photos: { zip_used: true, zip_files: 2, zip_ignored: 0, problem: '' } })
    );
    const result = await previewProductImport({ rows: [] });
    expect(result).toMatchObject({ newCategories: ['Snacks'], newBrands: ['Bidco'], categoriesLine: 'c', brandsLine: 'b', store: 'S', summary: 's' });
    expect(result.stock.units).toBe(5);
    expect(result.photos.zip_files).toBe(2);
  });

  test('an empty answer still has every part', async () => {
    axiosInstance.post.mockResolvedValue(reply({}));
    const result = await previewProductImport({ rows: [] });
    expect(result.rows).toEqual([]);
    expect(result.newCategories).toEqual([]);
    expect(result.counts.total).toBe(0);
  });

  test('a refusal becomes a sentence', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { success: false, message: 'The file could not be checked. Please try again.' } } });
    await expect(previewProductImport({ rows: [] })).rejects.toThrow('The file could not be checked');
  });

  test('a network failure becomes a plain sentence', async () => {
    axiosInstance.post.mockRejectedValue(new Error('Network Error'));
    await expect(previewProductImport({ rows: [] })).rejects.toThrow(/internet|server/i);
  });
});

describe('importProducts', () => {
  test('calls import_products and fills in missing counts', async () => {
    axiosInstance.post.mockResolvedValue(reply({ rows: [{ row: 2, status: 'created' }], counts: { created: 1 }, categories_created: ['Snacks'], pictures_added: 2 }));
    const result = await importProducts({ rows: [{ item_code: 'A' }] });
    expect(axiosInstance.post.mock.calls[0][0]).toBe('murzak_pos.api.product_import_api.import_products');
    expect(result.counts).toEqual({ created: 1, updated: 0, unchanged: 0, failed: 0, left_out: 0 });
    expect(result.categoriesCreated).toEqual(['Snacks']);
    expect(result.picturesAdded).toBe(2);
    expect(result.stock).toEqual({ rows: 0, reference: '', problem: '' });
  });
});

describe('uploadPhotosZip', () => {
  const zip = (name = 'photos.zip', size = 10) => {
    const file = new File(['x'], name, { type: 'application/zip' });
    Object.defineProperty(file, 'size', { value: size });
    return file;
  };

  test('uploads as a private file and returns the address', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { file_url: '/private/files/photos.zip' } } });
    await expect(uploadPhotosZip(zip())).resolves.toBe('/private/files/photos.zip');
    const [url, form, options] = axiosInstance.post.mock.calls[0];
    expect(url).toBe('upload_file');
    expect(form.get('is_private')).toBe('1');
    expect(options.headers['Content-Type']).toBe('multipart/form-data');
  });

  test('refuses what is not a ZIP, and a ZIP over 60 MB, before sending', async () => {
    await expect(uploadPhotosZip(zip('photos.rar'))).rejects.toThrow('ZIP');
    await expect(uploadPhotosZip(zip('p.zip', 61 * 1024 * 1024))).rejects.toThrow('60 MB');
    expect(axiosInstance.post).not.toHaveBeenCalled();
  });

  test('says so when the server does not confirm', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: {} } });
    await expect(uploadPhotosZip(zip())).rejects.toThrow('did not confirm');
  });
});
