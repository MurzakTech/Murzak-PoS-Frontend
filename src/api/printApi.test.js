import axiosInstance from './axiosInstance';
import { choicesFor, getPrintHtml, getPrintPdf, printHtml } from './printApi';

jest.mock('./axiosInstance', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

afterEach(() => jest.resetAllMocks());

it('offers the right formats for each document', () => {
  expect(choicesFor('Sales Invoice').map((c) => c.format)).toEqual(['invoice', 'receipt']);
  expect(choicesFor('POS Invoice').map((c) => c.format)).toEqual(['receipt']);
  expect(choicesFor('Purchase Order').map((c) => c.format)).toEqual(['purchase_order']);
  expect(choicesFor('Item')).toEqual([]);
});

it('asks the server for the page of a document', async () => {
  axiosInstance.get.mockResolvedValue({ data: { message: { success: true, data: { html: '<p>Hi</p>' } } } });
  expect(await getPrintHtml('Sales Invoice', 'SINV-1', 'receipt')).toBe('<p>Hi</p>');
  expect(axiosInstance.get).toHaveBeenCalledWith('murzak_pos.api.print_api.get_print', {
    params: { doctype: 'Sales Invoice', name: 'SINV-1', format: 'receipt', as_pdf: 0 },
  });
});

it('says plainly when the server cannot make a PDF', async () => {
  axiosInstance.get.mockResolvedValue({ data: { message: { success: false, message: 'The PDF could not be made on this server. Ask for the HTML and print from the browser.' } } });
  await expect(getPrintPdf('Sales Invoice', 'SINV-1', 'invoice')).rejects.toThrow('PDF could not be made');
});

it('refuses to print nothing', async () => {
  await expect(printHtml('')).rejects.toThrow('nothing to print');
});

it('prints through a hidden frame and removes it afterwards', async () => {
  jest.useFakeTimers();
  const print = jest.fn();
  const frame = { style: {}, setAttribute: jest.fn(), remove: jest.fn(), contentWindow: { focus: jest.fn(), print } };
  const doc = { createElement: jest.fn(() => frame), body: { appendChild: jest.fn() } };
  const done = printHtml('<p>Receipt</p>', doc);
  expect(frame.srcdoc).toBe('<p>Receipt</p>');
  frame.onload();
  await done;
  expect(print).toHaveBeenCalled();
  jest.advanceTimersByTime(60000);
  expect(frame.remove).toHaveBeenCalled();
  jest.useRealTimers();
});
