import { changed, formFrom, needsAsking, problems } from './etimsModel';

const SAVED = { name: 'E-1', pin: 'P123456789A', branch: '00', deviceSerial: 'DEV-001', active: true, test: true };

describe('eTIMS form', () => {
  it('starts from what the server holds, and from a safe default when there is nothing', () => {
    expect(formFrom(SAVED)).toEqual({ deviceSerial: 'DEV-001', active: true, test: true });
    expect(formFrom(null)).toEqual({ deviceSerial: '', active: false, test: true });
  });

  it('allows a blank serial number, and refuses strange characters', () => {
    expect(problems({ deviceSerial: '' })).toEqual({});
    expect(problems({ deviceSerial: 'DEV-001' })).toEqual({});
    expect(problems({ deviceSerial: 'DEV<001>' })).toEqual({ deviceSerial: 'serialWrong' });
  });

  it('knows when something was changed, ignoring spaces at the ends', () => {
    expect(changed({ deviceSerial: ' DEV-001 ', active: true, test: true }, SAVED)).toBe(false);
    expect(changed({ deviceSerial: 'DEV-002', active: true, test: true }, SAVED)).toBe(true);
    expect(changed({ deviceSerial: 'DEV-001', active: true, test: false }, SAVED)).toBe(true);
  });
});

describe('eTIMS changes that ask first', () => {
  it('asks before going from test to live', () => {
    expect(needsAsking({ active: true, test: false }, SAVED)).toBe('goLive');
  });
  it('asks before switching reporting off, and that wins', () => {
    expect(needsAsking({ active: false, test: true }, SAVED)).toBe('turnOff');
    expect(needsAsking({ active: false, test: false }, SAVED)).toBe('turnOff');
  });
  it('does not ask for a harmless change, or for switching on', () => {
    expect(needsAsking({ active: true, test: true }, SAVED)).toBeNull();
    expect(needsAsking({ active: true, test: true }, { ...SAVED, active: false })).toBeNull();
    expect(needsAsking({ active: true, test: true }, null)).toBeNull();
  });
});
