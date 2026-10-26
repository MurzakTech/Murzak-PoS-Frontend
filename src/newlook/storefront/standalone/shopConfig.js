/**
 * Which shop this storefront container serves.
 *
 * The container is started with the shop's name (SHOP_SLUG) and writes it to /shop-config.json; the page reads it
 * before showing anything. Nothing is baked into the build, so one image serves every shop. A value that is not a
 * valid shop name is refused, so a damaged file can never send the shopper somewhere odd.
 */
export const CONFIG_PATH = '/shop-config.json';

const SHOP_NAME = /^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])$/;

export const cleanShopName = (value) => {
  const name = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return SHOP_NAME.test(name) ? name : '';
};

/** The shop's name, or an empty string when the file is missing, unreadable or holds a bad name. */
export const readShopName = async (fetchFile = (path) => fetch(path, { cache: 'no-store' })) => {
  try {
    const response = await fetchFile(CONFIG_PATH);
    if (!response.ok) return '';
    const data = await response.json();
    return cleanShopName(data?.slug);
  } catch (e) {
    return '';
  }
};
