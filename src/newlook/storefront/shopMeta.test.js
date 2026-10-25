import { applyShopMeta, logoUrl } from './shopMeta';

const reset = () => {
  document.head.innerHTML = '<meta name="description" content="Point of sale">';
  document.title = 'Murzak POS';
};
beforeEach(reset);

describe('the logo address', () => {
  test('is a full web address, even when the server sends one that starts with a slash', () => {
    expect(logoUrl('/files/logo.png', 'https://duka.example')).toBe('https://duka.example/files/logo.png');
    expect(logoUrl('https://cdn.example/l.png', 'https://duka.example')).toBe('https://cdn.example/l.png');
  });
  test('is empty when there is no logo', () => {
    expect(logoUrl('', 'https://duka.example')).toBe('');
    expect(logoUrl(undefined, 'https://duka.example')).toBe('');
  });
});

describe('the shop\'s tags', () => {
  const shop = { title: 'Duka ya Amina', description: 'Fresh every day', image: 'https://duka.example/files/l.png', url: 'https://duka.example/shop/duka' };
  const content = (selector) => document.head.querySelector(selector)?.getAttribute('content');

  test('set the tab name, the description and the share tags', () => {
    applyShopMeta(shop);
    expect(document.title).toBe('Duka ya Amina');
    expect(content('meta[name="description"]')).toBe('Fresh every day');
    expect(content('meta[property="og:title"]')).toBe('Duka ya Amina');
    expect(content('meta[property="og:image"]')).toBe(shop.image);
    expect(content('meta[property="og:url"]')).toBe(shop.url);
  });

  test('are put back as they were when the shop is left', () => {
    const undo = applyShopMeta(shop);
    undo();
    expect(document.title).toBe('Murzak POS');
    expect(content('meta[name="description"]')).toBe('Point of sale');
    expect(document.head.querySelector('meta[property="og:title"]')).toBeNull();
  });

  test('a shop with no line or logo adds no empty tags', () => {
    applyShopMeta({ title: 'Duka', description: '', image: '', url: '' });
    expect(document.head.querySelector('meta[property="og:image"]')).toBeNull();
    expect(content('meta[name="description"]')).toBe('Point of sale');
  });
});
