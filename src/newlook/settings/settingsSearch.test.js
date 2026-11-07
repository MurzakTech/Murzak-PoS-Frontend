import T from './strings.settings';
import { searchSettings } from './settingsSearch';
import { SECTIONS } from './settingsModel';

const ENTRIES = T.search.entries;

describe('searchSettings', () => {
  it('finds a setting by a plain word', () => {
    expect(searchSettings('mpesa', ENTRIES).map((e) => e.label)).toContain('Payment methods');
    expect(searchSettings('KRA', ENTRIES).map((e) => e.label)).toEqual(expect.arrayContaining(['Business details and KRA PIN', 'Tax and eTIMS']));
    expect(searchSettings('receipt', ENTRIES).map((e) => e.section)).toContain('brand');
  });
  it('wants every word typed to match, in any case', () => {
    expect(searchSettings('Receipt PRINT', ENTRIES).map((e) => e.label)).toContain('Print the receipt automatically');
    expect(searchSettings('receipt zebra', ENTRIES)).toEqual([]);
  });
  it('puts a match in the label before one that only lists the word', () => {
    expect(searchSettings('security', ENTRIES)[0].label).toBe('Security and the audit trail');
  });
  it('finds nothing for an empty box', () => {
    expect(searchSettings('   ', ENTRIES)).toEqual([]);
  });
  it('only points to real sections', () => {
    ENTRIES.forEach((e) => expect(SECTIONS).toContain(e.section));
  });
});
