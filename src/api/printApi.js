import { callServer } from './serverCall';

/**
 * Printing: the server draws the document (A4 tax invoice, delivery note, purchase order, or the 80 mm receipt
 * with the eTIMS QR code) with the business's own letter head, and the browser prints it.
 */

const PRINT = 'murzak_pos.api.print_api';

// What can be printed for each document, in the order shown
export const PRINT_CHOICES = {
  'Sales Invoice': [
    { format: 'invoice', label: 'Tax invoice (A4)' },
    { format: 'receipt', label: 'Receipt (80 mm roll)' },
  ],
  'POS Invoice': [{ format: 'receipt', label: 'Receipt (80 mm roll)' }],
  'Purchase Order': [{ format: 'purchase_order', label: 'Purchase order (A4)' }],
  'Delivery Note': [{ format: 'delivery_note', label: 'Delivery note (A4)' }],
};

export const choicesFor = (doctype) => PRINT_CHOICES[doctype] || [];

export const getPrintHtml = async (doctype, name, format) => {
  const body = await callServer(`${PRINT}.get_print`, { doctype, name, format, as_pdf: 0 }, {
    get: true,
    fallback: 'The document could not be prepared for printing.',
  });
  return body.data?.html || '';
};

export const getPrintPdf = async (doctype, name, format) => {
  const body = await callServer(`${PRINT}.get_print`, { doctype, name, format, as_pdf: 1 }, {
    get: true,
    fallback: 'The PDF could not be made.',
  });
  return { base64: body.data?.pdf_base64 || '', filename: body.data?.filename || `${name}.pdf` };
};

export const saveLetterhead = (company, { headerHtml, footerHtml, logoUrl } = {}) =>
  callServer(`${PRINT}.save_letterhead`, {
    company, header_html: headerHtml || undefined, footer_html: footerHtml || undefined, logo_url: logoUrl || undefined,
  }, { fallback: 'The letter head could not be saved.' });

/** Prints a page of HTML through a hidden frame, so the app's own screen is not printed with it. */
export const printHtml = (html, doc = document) =>
  new Promise((resolve, reject) => {
    if (!html) { reject(new Error('There is nothing to print.')); return; }
    const frame = doc.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    frame.onload = () => {
      try {
        frame.contentWindow.focus();
        frame.contentWindow.print();
        resolve();
      } catch (e) {
        reject(new Error('The print window could not be opened.'));
      } finally {
        // Give the print dialog time to read the page before the frame goes
        setTimeout(() => frame.remove(), 60000);
      }
    };
    frame.srcdoc = html;
    doc.body.appendChild(frame);
  });

/** Downloads a base64 PDF. */
export const downloadPdf = ({ base64, filename }, doc = document) => {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const link = doc.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
