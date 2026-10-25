import { recallOrder, rememberOrder } from './orderMemory';

beforeEach(() => localStorage.clear());

describe('order memory', () => {
  test('remembers how the order is paid and the shop chat link', () => {
    rememberOrder('tok1', { payment: 'mpesa', whatsappLink: 'https://wa.me/254712345678?text=Hi' });
    expect(recallOrder('tok1')).toEqual({ payment: 'mpesa', whatsappLink: 'https://wa.me/254712345678?text=Hi' });
    expect(recallOrder('other')).toBeNull();
  });

  test('anything but M-Pesa is treated as cash', () => {
    rememberOrder('tok1', { payment: 'bitcoin' });
    expect(recallOrder('tok1').payment).toBe('cash');
  });

  test('only a WhatsApp link is ever kept or opened, whatever the storage holds', () => {
    rememberOrder('tok1', { payment: 'cash', whatsappLink: 'https://evil.example/steal' });
    expect(recallOrder('tok1').whatsappLink).toBe('');
    const script = ['java', 'script:alert(1)'].join('');
    localStorage.setItem('murzak_order:tok2', JSON.stringify({ payment: 'cash', whatsappLink: script }));
    expect(recallOrder('tok2').whatsappLink).toBe('');
  });

  test('keeps only the latest few orders', () => {
    for (let i = 0; i < 25; i += 1) rememberOrder(`t${i}`, { payment: 'cash' });
    expect(recallOrder('t0')).toBeNull();
    expect(recallOrder('t4')).toBeNull();
    expect(recallOrder('t5')).not.toBeNull();
    expect(recallOrder('t24')).not.toBeNull();
  });

  test('damaged storage and blocked storage do no harm', () => {
    localStorage.setItem('murzak_order:bad', '{nope');
    expect(recallOrder('bad')).toBeNull();
    const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });
    expect(() => rememberOrder('tok', { payment: 'cash' })).not.toThrow();
    spy.mockRestore();
  });
});
