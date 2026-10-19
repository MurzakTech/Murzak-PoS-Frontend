import axiosInstance from './axiosInstance';
import { friendlyErrorMessage, humanizeMessage } from '../utils/friendlyError';
import { LOGO_MAX_BYTES, LOGO_TYPES, readBrand } from '../newlook/brand/brandModel';

/**
 * The shop's brand (ticket P7-3): logo, accent colour, tagline, receipt footer, receipt style, social handle and website.
 * Kept on the server, one setting per business (murzak_pos.api.brand_api). Anyone signed in may read it, because every cashier
 * prints receipts; only an owner may change it (the server checks).
 */
const BRAND = 'murzak_pos.api.brand_api';

const body = (response) => response.data?.message ?? response.data;
const failure = (reply, fallback) => new Error(humanizeMessage(reply?.message, fallback));

/** The brand of the signed-in person's business. Resolves to the brand (see readBrand). */
export const getBrand = async (company) => {
  let response;
  try {
    response = await axiosInstance.get(`${BRAND}.get_brand`, company ? { params: { company } } : undefined);
  } catch (error) {
    throw new Error(friendlyErrorMessage(error));
  }
  const reply = body(response);
  if (!reply || reply.success === false) throw failure(reply, 'The brand details could not be loaded.');
  return readBrand(reply.data);
};

/** Saves the named fields (the others keep their saved value). Resolves to the whole saved brand. */
export const setBrand = async (fields, company) => {
  let response;
  try {
    // A refusal (for example "only an owner can do this") is shown on the card, not as a pop-up
    response = await axiosInstance.post(`${BRAND}.set_brand`, { brand: JSON.stringify(fields), ...(company ? { company } : {}) }, { allowRefusal: true });
  } catch (error) {
    throw new Error(friendlyErrorMessage(error));
  }
  const reply = body(response);
  if (!reply || reply.success === false) throw failure(reply, 'The brand details could not be saved.');
  return readBrand(reply.data);
};

/**
 * Uploads the logo through the standard public file upload (the same one the product photos use) and resolves to its address
 * ("/files/logo.png"). The picture is sent as it is, so a logo with a see-through background stays see-through. The type and size
 * are checked here first (JPG, PNG or WebP, 1 MB); the person is told in words.
 */
export const uploadLogo = async (file) => {
  if (!file || !LOGO_TYPES.includes(file.type)) throw new Error('Choose a JPG, PNG or WebP picture.');
  if (file.size > LOGO_MAX_BYTES) throw new Error('That picture is larger than 1 MB. Choose a smaller one.');
  const form = new FormData();
  form.append('file', file, file.name);
  form.append('is_private', '0'); // the logo is printed on every receipt, so it is public
  form.append('folder', 'Home');
  let response;
  try {
    response = await axiosInstance.post('upload_file', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  } catch (error) {
    throw new Error(friendlyErrorMessage(error));
  }
  const url = response.data?.message?.file_url;
  if (!url) throw new Error('The picture was sent but the server did not confirm it. Please try again.');
  return url;
};
