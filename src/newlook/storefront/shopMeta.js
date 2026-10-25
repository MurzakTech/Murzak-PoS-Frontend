import { productImageUrl } from '../../utils/productArt';

/**
 * The shop's name, line and logo in the browser tab and in the page's share tags.
 *
 * Browsers and search engines that run the page see these. WhatsApp, Facebook and similar apps do NOT run the page: they read
 * the tags the server sends, so for a preview in a chat the server must send them too (see deploy/nginx/shop-share-preview.conf).
 */
const TAGS = [
  ['name', 'description'],
  ['property', 'og:title'],
  ['property', 'og:description'],
  ['property', 'og:image'],
  ['property', 'og:url'],
  ['property', 'og:type'],
];

/** A logo as a full web address (a chat app cannot use an address that starts with a slash), or '' */
export const logoUrl = (logo, origin = window.location.origin) => {
  const src = productImageUrl({ image: logo });
  if (!src) return '';
  try {
    return new URL(src, origin).toString();
  } catch (e) {
    return '';
  }
};

const setTag = (doc, kind, key, content) => {
  let tag = doc.head.querySelector(`meta[${kind}="${key}"]`);
  const created = !tag;
  if (!tag) {
    tag = doc.createElement('meta');
    tag.setAttribute(kind, key);
    doc.head.appendChild(tag);
  }
  const before = created ? null : tag.getAttribute('content');
  tag.setAttribute('content', content);
  return () => {
    if (created) tag.remove();
    else if (before === null) tag.removeAttribute('content');
    else tag.setAttribute('content', before);
  };
};

/** Applies the shop's tags and returns a function that puts the page back as it was. Empty values are left alone. */
export const applyShopMeta = ({ title, description, image, url }, doc = document) => {
  const undo = [];
  const before = doc.title;
  if (title) doc.title = title;
  const values = {
    description,
    'og:title': title,
    'og:description': description,
    'og:image': image,
    'og:url': url,
    'og:type': 'website',
  };
  TAGS.forEach(([kind, key]) => {
    if (values[key]) undo.push(setTag(doc, kind, key, values[key]));
  });
  return () => {
    doc.title = before;
    undo.forEach((fn) => fn());
  };
};
