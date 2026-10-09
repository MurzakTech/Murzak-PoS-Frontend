import axiosInstance from './axiosInstance';

/**
 * Product photo upload.
 *
 * Phone cameras produce 3 to 8 MB pictures. Shops are often on mobile data and
 * a till tile is only a few hundred pixels wide, so the picture is shrunk in
 * the browser first (longest side 1000px, JPEG), which usually brings it under
 * 200 KB. It is then sent to the server's standard file upload, and the
 * address it returns ("/files/...") is what gets saved on the product.
 */

const MAX_SIDE = 1000;
const QUALITY = 0.82;
export const MAX_ORIGINAL_BYTES = 20 * 1024 * 1024;

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('unreadable-image'));
    };
    img.src = url;
  });

/** Returns a smaller JPEG version of the picture (or the original if it is already small). */
export const shrinkImage = async (file) => {
  const img = await loadImage(file);
  const ratio = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  if (ratio === 1 && file.size < 300 * 1024) return file;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * ratio);
  canvas.height = Math.round(img.naturalHeight * ratio);
  const ctx = canvas.getContext('2d');
  // White behind transparent PNGs, otherwise they turn black as JPEG
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY));
  if (!blob) return file;
  const base = (file.name || 'photo').replace(/\.[^.]+$/, '');
  return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
};

/**
 * Uploads a product photo and returns its address on the server, e.g. "/files/milk.jpg".
 * Throws an Error with a plain-language message if something goes wrong.
 */
export const uploadProductImage = async (file) => {
  if (!file || !/^image\//.test(file.type)) {
    throw new Error('Choose a picture file, such as a JPG or PNG photo.');
  }
  if (file.size > MAX_ORIGINAL_BYTES) {
    throw new Error('That picture is too large. Choose one under 20 MB.');
  }

  let toSend;
  try {
    toSend = await shrinkImage(file);
  } catch (e) {
    throw new Error('That picture could not be opened. Try a JPG or PNG photo.');
  }

  const form = new FormData();
  form.append('file', toSend, toSend.name);
  form.append('is_private', '0'); // product photos are shown on the till and receipts, so they are public
  form.append('folder', 'Home');

  // The shared client defaults to JSON, which would turn the file into text. Saying
  // multipart keeps it a file; the browser then adds the boundary itself.
  // Relative, like every other call: the API address already ends in /api/method,
  // so "/api/method/upload_file" here became /api/method/api/method/upload_file
  const response = await axiosInstance.post('upload_file', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  const fileUrl = response.data?.message?.file_url;
  if (!fileUrl) throw new Error('The picture was sent but the server did not confirm it. Please try again.');
  return fileUrl;
};
