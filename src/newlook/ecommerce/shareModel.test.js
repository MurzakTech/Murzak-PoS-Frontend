import { catalogueMessage, orderMessage, posterHtml, productMessage, setupSteps, shopLink, slipHtml, waLink } from './shareModel';

describe('the store link', () => {
  test('is built from the web address name, and empty before there is one', () => {
    expect(shopLink('duka', 'https://x.example')).toBe('https://x.example/shop/duka');
    expect(shopLink('', 'https://x.example')).toBe('');
  });
});

describe('WhatsApp links', () => {
  test('with a Kenyan number open that chat, with the message ready', () => {
    expect(waLink('Hello there', '0712345678')).toBe('https://wa.me/254712345678?text=Hello%20there');
  });
  test('without a usable number let the owner choose who gets it', () => {
    expect(waLink('Hi', '')).toBe('https://wa.me/?text=Hi');
    expect(waLink('Hi', 'abc')).toBe('https://wa.me/?text=Hi');
  });
});

describe('the messages', () => {
  test('the catalogue message names the shop and carries the link', () => {
    expect(catalogueMessage({ name: 'Duka ya Amina', link: 'https://x/shop/d' })).toContain('Duka ya Amina');
    expect(catalogueMessage({ name: '', link: 'https://x/shop/d' })).toContain('our shop');
  });
  test('a product message has the name, the price and the link', () => {
    const text = productMessage({ product: { item_name: 'Rice 2kg', price: 350 }, link: 'https://x/shop/d' });
    expect(text).toContain('Rice 2kg');
    expect(text).toContain('350');
    expect(text).toContain('https://x/shop/d');
  });
  test('an order message uses the first name and the words for where the order is', () => {
    expect(orderMessage({ order: 'SO-1', customer: 'Amina Wanjiru', status: 'Confirmed' })).toContain('Hello Amina');
    expect(orderMessage({ order: 'SO-1', customer: 'Amina', status: 'Ready', delivery: 'Pickup' })).toContain('collect');
    expect(orderMessage({ order: 'SO-1', customer: 'Amina', status: 'Ready', delivery: 'Delivery' })).toContain('on its way');
    expect(orderMessage({ order: 'SO-1', customer: '', status: 'Delivered' })).toContain('Hello there');
  });
  test('a new order has nothing to say yet', () => {
    expect(orderMessage({ order: 'SO-1', customer: 'Amina', status: 'New' })).toBe('');
  });
});

describe('printed pages', () => {
  test('anything typed by a person is escaped', () => {
    const poster = posterHtml({ name: '<script>x</script>', tagline: 'a & b', link: 'https://x', qrSvg: '<svg></svg>' });
    expect(poster).not.toContain('<script>x');
    expect(poster).toContain('&lt;script&gt;');
    expect(poster).toContain('a &amp; b');
    const slip = slipHtml({ order: 'SO-1', customer: '<b>A</b>', phone: '', address: '', delivery: 'Pickup', lines: [{ item_code: 'R', item_name: '<i>Rice</i>', qty: 2 }], total: 300 });
    expect(slip).not.toContain('<b>A</b>');
    expect(slip).not.toContain('<i>Rice</i>');
    expect(slip).toContain('For collection');
  });
});

describe('setup steps', () => {
  const form = { store_name: 'Duka', delivery_enabled: true, pickup_enabled: false, accept_cash: true, accept_mpesa: false };
  test('count what is done', () => {
    const steps = setupSteps({ saved: { slug: 'duka', enabled: false }, form, productCount: 0 });
    expect(steps.map((s) => [s.key, s.done])).toEqual([
      ['link', true],
      ['receive', true],
      ['pay', true],
      ['products', false],
      ['open', false],
    ]);
  });
  test('a store with no saved name is not started', () => {
    expect(setupSteps({ saved: { slug: '', enabled: false }, form, productCount: 3 })[0].done).toBe(false);
  });
});
