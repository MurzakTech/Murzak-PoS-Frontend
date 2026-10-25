import {
  ShopNotFoundError,
  getShop,
  guestClient,
  listShopProducts,
  payForOrder,
  placeOrder,
  quoteDelivery,
  trackOrder,
} from './storefrontApi';

// The real axios is not loaded in tests (its module format is not understood here); the shopper's client is replaced
jest.mock('axios', () => {
  const client = { get: jest.fn(), post: jest.fn(), interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } } };
  return { __esModule: true, default: { create: jest.fn(() => client) } };
});

const reply = (data, extra = {}) => ({ data: { message: { success: true, data, ...extra } } });

beforeEach(() => {
  guestClient.get.mockReset();
  guestClient.post.mockReset();
});

describe('the shopper never carries a staff sign-in', () => {
  test('the client has no request interceptor that could attach a token or redirect to the login page', () => {
    expect(guestClient.interceptors.request.use).not.toHaveBeenCalled();
    expect(guestClient.interceptors.response.use).not.toHaveBeenCalled();
  });
});

describe('getShop and the product list', () => {
  test('asks for the shop by its address name', async () => {
    guestClient.get.mockResolvedValue(reply({ slug: 'duka', store_name: 'Duka' }));
    expect(await getShop('duka')).toEqual({ slug: 'duka', store_name: 'Duka' });
    expect(guestClient.get).toHaveBeenCalledWith('murzak_pos.api.storefront_api.get_store', { params: { slug: 'duka' } });
  });

  test('a shop that is not open is told apart from a fault', async () => {
    guestClient.get.mockRejectedValue({ response: { status: 404, data: { exc_type: 'DoesNotExistError' } } });
    await expect(getShop('nope')).rejects.toBeInstanceOf(ShopNotFoundError);
  });

  test('a fault says something a shopper can act on', async () => {
    guestClient.get.mockRejectedValue({ message: 'Network Error' });
    await expect(getShop('duka')).rejects.toThrow(/internet connection/i);
  });

  test('lists products with only the parameters that were given', async () => {
    guestClient.get.mockResolvedValue(reply({ rows: [{ item_code: 'A' }], total: 41, page: 2 }));
    const result = await listShopProducts({ slug: 'duka', search: 'rice', category: '', page: 2 });
    expect(guestClient.get).toHaveBeenCalledWith('murzak_pos.api.storefront_api.list_products', {
      params: { slug: 'duka', search: 'rice', page: 2, page_size: 20 },
    });
    expect(result).toEqual({ rows: [{ item_code: 'A' }], total: 41, page: 2 });
  });

  test('a reply with nothing in it gives an empty list, not a crash', async () => {
    guestClient.get.mockResolvedValue(reply(undefined));
    expect(await listShopProducts({ slug: 'duka' })).toEqual({ rows: [], total: 0, page: 1 });
  });
});

describe('quoteDelivery', () => {
  test('sends the basket as text and returns the fee the server worked out', async () => {
    guestClient.get.mockResolvedValue(reply({ deliverable: true, fee: '200', distance_km: null, message: null }));
    const quote = await quoteDelivery({ slug: 'duka', lines: [{ item_code: 'RICE', qty: 2 }], area: 'Westlands' });
    const params = guestClient.get.mock.calls[0][1].params;
    expect(params.lines).toBe('[{"item_code":"RICE","qty":2}]');
    expect(params.delivery_area).toBe('Westlands');
    expect(quote).toEqual({ deliverable: true, fee: 200, distanceKm: null, message: '' });
  });

  test('a place the shop will not deliver to comes back as a reason', async () => {
    guestClient.get.mockResolvedValue(reply({ deliverable: false, fee: 0, distance_km: 31.2, message: 'Too far' }));
    const quote = await quoteDelivery({ slug: 'duka', lines: [], latitude: 1, longitude: 36 });
    expect(quote).toMatchObject({ deliverable: false, distanceKm: 31.2, message: 'Too far' });
  });
});

describe('placeOrder', () => {
  test('sends the details and never a price or a delivery fee', async () => {
    guestClient.post.mockResolvedValue(
      reply(
        { order: 'SO-1', token: 'tok', total: 500, delivery_fee: 200, lines: [], payment: 'mpesa', payment_prompt: { sent: true }, whatsapp_link: 'https://wa.me/1' },
        { message: 'Thank you' }
      )
    );
    const order = await placeOrder({
      slug: 'duka',
      customerName: 'Amina',
      phone: '0712345678',
      lines: [{ item_code: 'RICE', qty: 2 }],
      deliveryMethod: 'Delivery',
      payment: 'mpesa',
      address: 'Moi Avenue',
      area: 'Westlands',
    });
    const [url, body] = guestClient.post.mock.calls[0];
    expect(url).toBe('murzak_pos.api.storefront_api.checkout');
    expect(body).toMatchObject({ slug: 'duka', customer_name: 'Amina', delivery_method: 'Delivery', delivery_area: 'Westlands' });
    expect(JSON.stringify(body)).not.toMatch(/price|rate|delivery_fee/);
    expect(order).toMatchObject({ order: 'SO-1', token: 'tok', total: 500, deliveryFee: 200, whatsappLink: 'https://wa.me/1' });
    expect(order.paymentPrompt.sent).toBe(true);
  });

  test('the shop\'s refusal reaches the shopper in its own words', async () => {
    guestClient.post.mockRejectedValue({
      response: { status: 417, data: { _server_messages: JSON.stringify([JSON.stringify({ message: 'Sorry, not enough stock for: Rice.' })]) } },
    });
    await expect(placeOrder({ slug: 'duka', customerName: 'A', phone: '1', lines: [] })).rejects.toThrow(/not enough stock for: Rice/);
  });
});

describe('paying and tracking', () => {
  test('payForOrder reports whether the prompt went out', async () => {
    guestClient.post.mockResolvedValue({ data: { message: { success: true, message: 'Check your phone', data: { paid: false } } } });
    expect(await payForOrder('tok')).toEqual({ sent: true, paid: false, message: 'Check your phone' });
    guestClient.post.mockResolvedValue({ data: { message: { success: false, message: 'M-Pesa is busy', data: { paid: false } } } });
    expect(await payForOrder('tok')).toMatchObject({ sent: false, message: 'M-Pesa is busy' });
  });

  test('trackOrder returns the status and nothing personal', async () => {
    guestClient.get.mockResolvedValue(
      reply({ order: 'SO-1', status: 'Ready', delivery_method: 'Pickup', paid: 1, total: '500', date: '2026-10-25', shop: 'Duka' })
    );
    expect(await trackOrder('tok')).toEqual({
      order: 'SO-1',
      status: 'Ready',
      deliveryMethod: 'Pickup',
      paid: true,
      total: 500,
      date: '2026-10-25',
      shop: 'Duka',
    });
  });

  test('an order code that is not known is "not found"', async () => {
    guestClient.get.mockRejectedValue({ response: { status: 404, data: {} } });
    await expect(trackOrder('zzzzzzzz')).rejects.toBeInstanceOf(ShopNotFoundError);
  });
});
