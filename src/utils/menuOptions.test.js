import { chosenOptions, fromEditor, missingGroup, toEditor, toggleChoice } from './menuOptions';

const GROUPS = [
  { name: 'How cooked', required: true, multiple: false, choices: [{ name: 'Rare', price: 0 }, { name: 'Well done', price: 0 }] },
  { name: 'Extras', required: false, multiple: true, choices: [{ name: 'Extra cheese', price: 50 }, { name: 'Bacon', price: 80.5 }] },
];

test('a required group must be chosen before the dish is added', () => {
  expect(missingGroup(GROUPS, {})).toBe('How cooked');
  expect(missingGroup(GROUPS, { 'How cooked': ['Rare'] })).toBeNull();
});

test('a choose-one group swaps, a choose-several group toggles', () => {
  let picked = toggleChoice({}, GROUPS[0], 'Rare');
  picked = toggleChoice(picked, GROUPS[0], 'Well done');
  expect(picked['How cooked']).toEqual(['Well done']);
  expect(toggleChoice(picked, GROUPS[0], 'Well done')['How cooked']).toEqual([]);
  picked = toggleChoice(toggleChoice(picked, GROUPS[1], 'Extra cheese'), GROUPS[1], 'Bacon');
  expect(picked.Extras).toEqual(['Extra cheese', 'Bacon']);
  expect(toggleChoice(picked, GROUPS[1], 'Bacon').Extras).toEqual(['Extra cheese']);
});

test('the choice adds its price and gives the words the kitchen and the receipt show, as the server writes them', () => {
  const choice = chosenOptions(GROUPS, { 'How cooked': ['Well done'], Extras: ['Extra cheese', 'Bacon'] });
  expect(choice.extra).toBe(130.5);
  expect(choice.text).toBe('Well done; Extra cheese (+50); Bacon (+80.5)');
  expect(choice.options).toHaveLength(3);
});

test('the editor shows choices as one line and sends them back as a list', () => {
  const rows = toEditor(GROUPS);
  expect(rows[1].choices).toBe('Extra cheese +50, Bacon +80.5');
  expect(fromEditor(rows)[1]).toEqual({ name: 'Extras', required: false, multiple: true, choices: ['Extra cheese +50', 'Bacon +80.5'] });
  expect(fromEditor([{ name: '', choices: '' }, ...rows])).toHaveLength(2); // a blank group is dropped
});
