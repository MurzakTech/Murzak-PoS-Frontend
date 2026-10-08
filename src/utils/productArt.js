/**
 * Picks a picture style for a product that has no photo of its own.
 *
 * Shop owners rarely photograph every item, and a grid of grey boxes makes a
 * till look unfinished. Instead each product gets an illustration that matches
 * what it is (milk gets a carton, soap gets a spray bottle), worked out from
 * its category and name, in English and common Swahili shop words.
 */

// Order matters: the first group whose words match wins, so specific groups come first.
export const ART_GROUPS = [
  { key: 'health', hue: 150, words: ['pharma', 'medic', 'tablet', 'capsule', 'syrup', 'paracetamol', 'panadol', 'vitamin', 'bandage', 'dawa', 'clinic', 'health', 'antibiotic', 'ointment'] },
  { key: 'personal', hue: 328, words: ['beauty', 'cosmetic', 'lotion', 'shampoo', 'conditioner', 'toothpaste', 'toothbrush', 'deodorant', 'perfume', 'hair', 'nail', 'lipstick', 'vaseline', 'body', 'skin', 'personal care', 'sanitary', 'diaper', 'pampers', 'razor'] },
  { key: 'household', hue: 252, words: ['household', 'clean', 'soap', 'detergent', 'bleach', 'jik', 'omo', 'ariel', 'sunlight', 'dettol', 'sponge', 'tissue', 'toilet', 'serviette', 'insecticide', 'doom', 'sabuni', 'dish', 'laundry', 'scrub', 'broom', 'mop'] },
  { key: 'hotDrinks', hue: 22, sat: 45, words: ['tea$', 'coffee', 'cocoa', 'chai', 'nescafe', 'ketepa', 'milo', 'drinking chocolate'] },
  { key: 'dairy', hue: 205, words: ['dairy', 'milk', 'yoghurt', 'yogurt', 'cheese', 'butter', 'ghee', 'cream', 'maziwa', 'mala', 'lala', 'egg', 'mayai'] },
  { key: 'bakery', hue: 32, words: ['bakery', 'bread', 'loaf', 'cake', 'mandazi', 'bun$', 'buns', 'doughnut', 'donut', 'mkate', 'croissant', 'muffin', 'scone'] },
  { key: 'food', hue: 16, words: ['restaurant', 'meal', 'burger', 'pizza', 'chips', 'fries', 'pilau', 'biryani', 'stew', 'samosa', 'sandwich', 'chapati', 'ugali', 'takeaway', 'food'] },
  { key: 'snacks', hue: 272, words: ['snack', 'crisp', 'biscuit', 'cookie', 'chocolate', 'sweet', 'candy', 'popcorn', 'peanut', 'nuts', 'bhajia', 'chewing', 'gum', 'lollipop', 'confection'] },
  { key: 'beverages', hue: 178, words: ['beverage', 'drink', 'water$', 'juice', 'soda', 'cola', 'fanta', 'sprite', 'quencher', 'energy', 'beer', 'wine', 'spirit', 'liquor', 'minute maid', 'dasani', 'keringet', 'afya'] },
  { key: 'fruit', hue: 352, words: ['fruit', 'apple', 'banana', 'mango', 'orange', 'avocado', 'pineapple', 'passion', 'watermelon', 'grape', 'lemon', 'matunda', 'ndizi'] },
  { key: 'vegetables', hue: 122, words: ['vegetable', 'sukuma', 'kale', 'cabbage', 'spinach', 'tomato', 'onion', 'potato', 'carrot', 'pepper', 'dhania', 'mboga', 'greens', 'lettuce', 'garlic'] },
  { key: 'meat', hue: 8, words: ['meat', 'beef', 'chicken', 'goat', 'mutton', 'pork', 'fish', 'tilapia', 'omena', 'sausage', 'bacon', 'nyama', 'kuku', 'samaki', 'butchery'] },
  { key: 'pantry', hue: 38, sat: 55, words: ['flour', 'unga', 'maize', 'rice', 'wheat', 'atta', 'grain', 'cereal', 'beans', 'ndengu', 'lentil', 'sugar', 'salt', 'oats', 'pasta', 'spaghetti', 'oil$', 'oils$', 'cooking fat', 'kimbo', 'spice', 'sauce', 'ketchup', 'pantry', 'grocer', 'mchele', 'sukari'] },
  { key: 'electronics', hue: 222, words: ['electronic', 'phone', 'charger', 'cable', 'battery', 'earphone', 'headphone', 'bulb', 'airtime', 'sim card', 'power bank', 'adapter', 'usb', 'radio', 'tv$', 'socket', 'extension'] },
  { key: 'hardware', hue: 205, sat: 14, words: ['hardware', 'cement', 'nail', 'screw', 'bolt', 'paint', 'hammer', 'pipe', 'tool', 'timber', 'wire', 'iron sheet', 'padlock', 'hinge', 'plumbing', 'glue', 'brush'] },
  { key: 'clothing', hue: 300, words: ['cloth', 'shirt', 't-shirt', 'dress', 'trouser', 'jeans', 'jacket', 'shoe', 'sock', 'kitenge', 'fashion', 'apparel', 'skirt', 'sweater', 'uniform', 'cap$', 'boutique'] },
  { key: 'stationery', hue: 54, words: ['stationery', 'pen$', 'pens$', 'pencil', 'book', 'exercise', 'paper', 'envelope', 'file$', 'files$', 'ruler', 'eraser', 'crayon', 'marker', 'notebook', 'printing', 'school'] },
];

const GENERAL = { key: 'general', hue: 245 };

// Small stable number from a string, so the same product always gets the same shade
export const hashString = (value) => {
  const s = String(value || '');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

// A word matches at the start of a word ("biscuit" finds "Biscuits", "oil" does not find "toilet").
// A trailing $ means the whole word only ("water$" does not find "watermelon").
const patternCache = new Map();
const wordPattern = (w) => {
  if (!patternCache.has(w)) {
    const whole = w.endsWith('$');
    const body = (whole ? w.slice(0, -1) : w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    patternCache.set(w, new RegExp(`\\b${body}${whole ? '\\b' : ''}`, 'i'));
  }
  return patternCache.get(w);
};

const matches = (text, group) => {
  const t = String(text || '');
  return !!t && group.words.some((w) => wordPattern(w).test(t));
};

/**
 * Which illustration a product gets. The name is checked first because it is
 * more specific ("Ketepa Tea" filed under Beverages should still get a cup),
 * then the category it is filed under.
 */
export const artGroupFor = (product = {}) => {
  const group = product.item_group || product.category || '';
  const name = product.item_name || product.name || product.item_code || '';
  return ART_GROUPS.find((g) => matches(name, g)) || ART_GROUPS.find((g) => matches(group, g)) || GENERAL;
};

/** The colours for one product: its group's colour, nudged a little per product so neighbours differ. */
export const artColors = (product = {}, mode = 'light') => {
  const group = artGroupFor(product);
  const jitter = (hashString(product.item_code || product.item_name || product.name) % 21) - 10;
  const h = (group.hue + jitter + 360) % 360;
  const s = group.sat ?? 68;
  if (mode === 'dark') {
    return {
      kind: group.key,
      bg1: `hsl(${h} ${Math.round(s * 0.45)}% 25%)`,
      bg2: `hsl(${h} ${Math.round(s * 0.45)}% 17%)`,
      main: `hsl(${h} ${s}% 60%)`,
      dark: `hsl(${h} ${Math.round(s * 0.85)}% 42%)`,
      light: `hsl(${h} ${s}% 80%)`,
    };
  }
  return {
    kind: group.key,
    bg1: `hsl(${h} ${Math.round(s * 0.95)}% 95%)`,
    bg2: `hsl(${h} ${Math.round(s * 0.8)}% 86%)`,
    main: `hsl(${h} ${s}% 55%)`,
    dark: `hsl(${h} ${s}% 37%)`,
    light: `hsl(${h} ${s}% 82%)`,
  };
};

const API_BASE = process.env.REACT_APP_API_URL || process.env.REACT_APP_API_BASE_URL || '';

/**
 * The product's own photo, if the server sent one. The server stores uploaded
 * files as "/files/name.jpg", which lives on the server, not on this website,
 * so those are turned into full addresses.
 */
export const productImageUrl = (product = {}) => {
  const raw = product.image || product.image_url || product.thumbnail || product.website_image || '';
  const src = String(raw).trim();
  if (!src) return null;
  if (/^(https?:|data:image\/|blob:)/i.test(src)) return src;
  if (src.startsWith('/') && API_BASE) {
    try {
      return new URL(src, API_BASE).toString();
    } catch (e) {
      return null;
    }
  }
  return src.startsWith('/') ? src : null;
};
