import { summarizeSeedResult } from './seedResult';

describe('summarizeSeedResult', () => {
  it('reports a clean run without stock as a success, ignoring the prefix note', () => {
    const s = summarizeSeedResult({
      status: 'success',
      items_created: ['EM-ELEC-014', 'EM-ELEC-024'],
      items_failed: [],
      stock_entry: { created: false, name: null, error: null },
      note: "Item codes are automatically prefixed with company abbreviation 'EM'",
    });
    expect(s.problems).toBe(false);
    expect(s.text).toBe('2 products saved.');
  });

  it('names the products that failed and why', () => {
    const s = summarizeSeedResult({
      items_created: ['EM-ELEC-014'],
      items_failed: [{ item_code: 'ELEC-024', item_name: 'Camera', error_message: 'Missing required details: item classification.' }],
    });
    expect(s.problems).toBe(true);
    expect(s.text).toBe('1 product saved. 1 could not be saved: Camera (Missing required details: item classification).');
  });

  it('mentions stock that was not recorded', () => {
    const s = summarizeSeedResult({ items_created: ['A'], stock_entry: { created: false, error: 'Warehouse X does not exist' } });
    expect(s.problems).toBe(true);
    expect(s.text).toContain('opening stock quantities were not recorded: Warehouse X does not exist.');
  });
});
