import {
  canDeleteCategory,
  categoryAddress,
  categoryLabel,
  categoryOptions,
  checkForm,
  chipCategories,
  cleanQuantity,
  csvFor,
  csvName,
  EMPTY_FORM,
  freshForm,
  hasCost,
  isDirty,
  isoDay,
  parentOptions,
  profitLine,
  profitOf,
  requestFrom,
  showFromParam,
  showOptions,
  statusView,
  stockText,
  summaryOf,
  tabFromPath,
  unitOptions,
} from './productsModel';

describe('tabs', () => {
  test('the categories address is the Categories tab and any other is the list', () => {
    expect(tabFromPath('/new-look/products/categories')).toBe('categories');
    expect(tabFromPath('/new-look/products/categories/')).toBe('categories');
    expect(tabFromPath('/new-look/products')).toBe('products');
    expect(tabFromPath('/new-look/products/new')).toBe('products');
    expect(tabFromPath(undefined)).toBe('products');
  });
});

describe('words for data', () => {
  test('the top category reads No category and the others are as they are', () => {
    expect(categoryLabel('All Item Groups')).toBe('No category');
    expect(categoryLabel('')).toBe('No category');
    expect(categoryLabel(null)).toBe('No category');
    expect(categoryLabel('Drinks')).toBe('Drinks');
  });

  test('each status has a word and an icon-bearing label name', () => {
    expect(statusView('ok')).toEqual({ status: 'paid', words: 'In stock' });
    expect(statusView('low').words).toBe('Low on stock');
    expect(statusView('out').words).toBe('Out of stock');
    expect(statusView('disabled').words).toBe('Disabled');
    expect(statusView('not_tracked').words).toBe('Not counted');
    expect(statusView(undefined).words).toBe('In stock');
  });

  test('stock is written with its unit in words, and a service has a dash', () => {
    expect(stockText({ stock: 12, unit: 'Nos' })).toBe('12 pieces');
    expect(stockText({ stock: 1, unit: 'Kg' })).toBe('1 kilogram');
    expect(stockText({ stock: 0, unit: 'Nos' })).toBe('0 pieces');
    expect(stockText({ stock: null, unit: 'Nos' })).toBe('–');
  });
});

describe('cost and profit', () => {
  test('a row carries a cost or it does not', () => {
    expect(hasCost({ cost_price: 80 })).toBe(true);
    expect(hasCost({ cost_price: null })).toBe(true);
    expect(hasCost({ item_code: 'A' })).toBe(false);
  });

  test('profit is the price minus the cost', () => {
    expect(profitOf('120', '80')).toBe(40);
    expect(profitOf(120, 80.5)).toBe(39.5);
    expect(profitOf(70, 80)).toBe(-10);
  });

  test('profit cannot be worked out without both numbers, or with a cost of nothing', () => {
    expect(profitOf('', '80')).toBeNull();
    expect(profitOf('120', '')).toBeNull();
    expect(profitOf('120', '0')).toBeNull();
    expect(profitOf(null, 5)).toBeNull();
    expect(profitOf('abc', '5')).toBeNull();
  });

  test('the line says profit, or loss when the cost is above the price', () => {
    expect(profitLine('120', '80')).toBe('Profit per item: KES 40');
    expect(profitLine('1200', '800')).toBe('Profit per item: KES 400');
    expect(profitLine('70', '80')).toBe('Loss per item: KES 10');
    expect(profitLine('120', '')).toBe('');
    expect(profitLine('', '80')).toBe('');
  });
});

describe('the list filters', () => {
  test('the Show choices begin with the default view', () => {
    const options = showOptions();
    expect(options.map((o) => o.value)).toEqual(['', 'low', 'out', 'disabled', 'all']);
    expect(options[0].label).toBe('Products in use');
  });

  test('a view the address names that the list does not offer is the default', () => {
    expect(showFromParam('low')).toBe('low');
    expect(showFromParam('junk')).toBe('');
    expect(showFromParam(undefined)).toBe('');
  });

  test('the category choices begin with All categories and use the plain top-category word', () => {
    const options = categoryOptions([{ name: 'Food' }, { name: 'All Item Groups' }]);
    expect(options).toEqual([
      { value: '', label: 'All categories' },
      { value: 'Food', label: 'Food' },
      { value: 'All Item Groups', label: 'No category' },
    ]);
  });

  test('the address of a category in the list', () => {
    expect(categoryAddress('Fresh & Dry')).toBe('/new-look/products?category=Fresh%20%26%20Dry');
  });
});

describe('export', () => {
  const rows = [
    { item_code: 'P-1', item_name: 'Soap "Lux" bar', category: 'Toiletries', price: 120, cost_price: 80, stock: 10, unit: 'Nos', status: 'ok', barcode: '6001' },
    { item_code: 'P-2', item_name: 'Delivery', category: 'All Item Groups', price: 200, cost_price: null, stock: null, unit: 'Nos', status: 'not_tracked', barcode: '' },
  ];

  test('the file has a header and a line per row, in plain words', () => {
    const lines = csvFor(rows).split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('"Product code","Product","Category","Price (KES)","Stock","Unit","Status","Barcode"');
    expect(lines[1]).toBe('"P-1","Soap ""Lux"" bar","Toiletries","120","10","Pieces","In stock","6001"');
    expect(lines[2]).toBe('"P-2","Delivery","No category","200","","Pieces","Not counted",""');
  });

  test('the cost column is there only when asked for', () => {
    expect(csvFor(rows, true).split('\r\n')[0]).toContain('"Cost price (KES)"');
    expect(csvFor(rows, true).split('\r\n')[1]).toContain('"80"');
    expect(csvFor(rows).split('\r\n')[0]).not.toContain('Cost');
  });

  test('the file name carries the day', () => {
    expect(csvName('2026-10-14')).toBe('products-2026-10-14.csv');
    expect(isoDay(new Date(2026, 9, 4))).toBe('2026-10-04');
  });
});

describe('the New product form', () => {
  test('only the name and the price are required', () => {
    expect(checkForm({ name: '', price: '' })).toEqual({ name: 'Enter a name for the product', price: 'Enter a price in KES' });
    expect(checkForm({ name: 'Soap', price: '' })).toEqual({ price: 'Enter a price in KES' });
    expect(checkForm({ name: '  ', price: '10' })).toEqual({ name: 'Enter a name for the product' });
    expect(checkForm({ name: 'Soap', price: '10' })).toEqual({});
  });

  test('a price of 0 is a price', () => {
    expect(checkForm({ name: 'Free bag', price: '0' })).toEqual({});
  });

  test('a name that is too long is reported', () => {
    expect(checkForm({ name: 'x'.repeat(141), price: '1' }).name).toBe('Use 140 letters or fewer');
  });

  test('the summary follows the order of the form and points at the fields', () => {
    const list = summaryOf({ barcode: 'B', price: 'P', name: 'N' });
    expect(list).toEqual([
      { id: 'np-name', message: 'N' },
      { id: 'np-price', message: 'P' },
      { id: 'np-barcode', message: 'B' },
    ]);
    expect(summaryOf({})).toEqual([]);
  });

  test('a problem with no field goes to the top of the form', () => {
    expect(summaryOf({ general: 'Something' })).toEqual([{ id: 'np-top', message: 'Something' }]);
  });

  test('a quantity keeps digits and one decimal point', () => {
    expect(cleanQuantity('12')).toBe('12');
    expect(cleanQuantity('2.5')).toBe('2.5');
    expect(cleanQuantity('2.5.5')).toBe('2.55');
    expect(cleanQuantity('a1b2')).toBe('12');
    expect(cleanQuantity('-3')).toBe('3');
    expect(cleanQuantity('')).toBe('');
  });

  test('the form is dirty only when something differs from where it began', () => {
    expect(isDirty(EMPTY_FORM)).toBe(false);
    expect(isDirty({ ...EMPTY_FORM, name: 'A' })).toBe(true);
    expect(isDirty({ ...EMPTY_FORM, unit: 'Kg' })).toBe(true);
    const kept = freshForm({ unit: 'Kg', category: 'Food' });
    expect(isDirty(kept, kept)).toBe(false);
    expect(isDirty({ ...kept, name: 'B' }, kept)).toBe(true);
  });

  test('a fresh form keeps the category and the unit and clears the rest', () => {
    const next = freshForm({ unit: 'Kg', category: 'Food' });
    expect(next).toEqual({ ...EMPTY_FORM, unit: 'Kg', category: 'Food' });
    expect(next.name).toBe('');
    expect(next.price).toBe('');
    expect(next.barcode).toBe('');
    expect(freshForm()).toEqual(EMPTY_FORM);
  });

  test('the request has the cost only for a person who may see it', () => {
    const values = { ...EMPTY_FORM, name: ' Soap ', price: '120', cost: '80', barcode: ' 600 ' };
    expect(requestFrom(values, { canSeeCost: true })).toMatchObject({ name: 'Soap', price: '120', cost: '80', barcode: '600' });
    expect(requestFrom(values)).not.toHaveProperty('cost');
  });
});

describe('units and category chips', () => {
  test('the common units come first, in plain words, and the default is always there', () => {
    const options = unitOptions([{ name: 'Zebra' }, { name: 'Kg' }, { name: 'Box' }, { name: 'Bale' }]);
    expect(options.map((o) => o.label)).toEqual(['Pieces', 'Kilograms', 'Boxes', 'Bale', 'Zebra']);
    expect(options[0].value).toBe('Nos');
  });

  test('two stored names with the same plain word are one choice', () => {
    const options = unitOptions([{ name: 'Nos' }, { name: 'Litre' }, { name: 'Ltr' }, { name: 'L' }]);
    expect(options.filter((o) => o.label === 'Litres')).toHaveLength(1);
  });

  test('no list yet still offers the default', () => {
    expect(unitOptions([])).toEqual([{ value: 'Nos', label: 'Pieces' }]);
    expect(unitOptions(undefined)).toEqual([{ value: 'Nos', label: 'Pieces' }]);
  });

  const many = Array.from({ length: 20 }, (_, i) => ({ name: `Category ${i + 1}` }));

  test('the chips leave out the top category', () => {
    expect(chipCategories([{ name: 'All Item Groups' }, { name: 'Food' }]).map((c) => c.name)).toEqual(['Food']);
  });

  test('a long list is cut, but the chosen category is always shown', () => {
    expect(chipCategories(many, '')).toHaveLength(12);
    const withChosen = chipCategories(many, 'Category 18');
    expect(withChosen).toHaveLength(12);
    expect(withChosen.map((c) => c.name)).toContain('Category 18');
    expect(chipCategories(many, '', { showAll: true })).toHaveLength(20);
    expect(chipCategories(many.slice(0, 5), '')).toHaveLength(5);
  });
});

describe('categories', () => {
  test('a category can be deleted when it is empty and is not the top one', () => {
    expect(canDeleteCategory({ name: 'Food', product_count: 0 })).toBe(true);
    expect(canDeleteCategory({ name: 'Food', product_count: 3 })).toBe(false);
    expect(canDeleteCategory({ name: 'All Item Groups', product_count: 0 })).toBe(false);
  });

  test('the parent choices begin with the top level and leave out the category itself', () => {
    const options = parentOptions([{ name: 'Food' }, { name: 'Drinks' }, { name: 'All Item Groups' }], 'Drinks');
    expect(options).toEqual([
      { value: 'All Item Groups', label: 'Top level' },
      { value: 'Food', label: 'Food' },
    ]);
  });
});
