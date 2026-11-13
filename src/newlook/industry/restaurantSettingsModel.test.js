import { blankHappyHour, expandTables, fromForm, toForm } from './restaurantSettingsModel';

test('tables can be typed as ranges', () => {
  expect(expandTables('T1-T3, Bar 1, T2')).toEqual(['T1', 'T2', 'T3', 'Bar 1']);
  expect(expandTables('1-4')).toEqual(['1', '2', '3', '4']);
  expect(expandTables('Terrace 1 - 2')).toEqual(['Terrace 1', 'Terrace 2']);
  expect(expandTables('')).toEqual([]);
});

test('the settings go into the form and come back as the server keeps them', () => {
  const settings = {
    service_charge_percent: 10,
    platforms: [{ name: 'Glovo', commission_percent: 25 }],
    happy_hours: [{ name: 'After work', days: ['mon'], start: '17:00', end: '19:00', percent: 20, groups: ['Beer'], items: [] }],
    tables: { 'Main - BL': ['T1', 'T2'] },
  };
  const form = toForm(settings, [{ warehouse: 'Main - BL', name: 'Main' }, { warehouse: 'Rooftop - BL', name: 'Rooftop' }]);
  expect(form.serviceCharge).toBe('10');
  expect(form.tables).toEqual({ 'Main - BL': 'T1, T2', 'Rooftop - BL': '' });
  expect(form.happyHours[0].groups).toBe('Beer');
  const back = fromForm({ ...form, tables: { ...form.tables, 'Rooftop - BL': 'R1-R2' } });
  expect(back).toEqual({ ...settings, tables: { 'Main - BL': ['T1', 'T2'], 'Rooftop - BL': ['R1', 'R2'] } });
});

test('a new happy hour starts on weekday evenings with no discount yet', () => {
  expect(blankHappyHour()).toMatchObject({ days: ['mon', 'tue', 'wed', 'thu', 'fri'], start: '17:00', end: '19:00', percent: '' });
});
