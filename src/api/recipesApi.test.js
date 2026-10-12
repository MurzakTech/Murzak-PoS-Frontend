import axiosInstance from './axiosInstance';
import {
  getRecipe, ingredientPayload, ingredientsProblem, listRecipes, marginClass, recordWastage, saveRecipe, searchItems, wastageProblem,
} from './recipesApi';

jest.mock('./axiosInstance', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

afterEach(() => jest.resetAllMocks());
const ok = (data) => ({ data: { message: { success: true, data } } });

it('lists recipes with their count', async () => {
  axiosInstance.get.mockResolvedValue(ok({ data: [{ dish: 'Pilau' }], count: 1 }));
  expect(await listRecipes('Acme', { search: 'pil' })).toEqual({ rows: [{ dish: 'Pilau' }], count: 1 });
  expect(axiosInstance.get.mock.calls[0][1]).toEqual({ params: { company: 'Acme', search: 'pil', page: 1, page_size: 20 } });
});

it('reads a recipe for a store, so the portions the stock allows come back', async () => {
  axiosInstance.get.mockResolvedValue(ok({ dish: 'Pilau', cost_per_portion: 40 }));
  await getRecipe('Acme', 'Pilau', 'Kitchen - A');
  expect(axiosInstance.get.mock.calls[0][1]).toEqual({ params: { company: 'Acme', dish: 'Pilau', warehouse: 'Kitchen - A' } });
});

it('sends numbers, and the unit only when one was chosen', () => {
  expect(ingredientPayload([{ item_code: 'Rice', qty: '0.25', uom: 'Kg' }, { item_code: 'Salt', qty: '2' }])).toEqual([
    { item_code: 'Rice', qty: 0.25, uom: 'Kg' },
    { item_code: 'Salt', qty: 2 },
  ]);
});

it('creates a new recipe and changes an existing one with the right call', async () => {
  axiosInstance.post.mockResolvedValue(ok({ dish: 'Pilau' }));
  await saveRecipe('Acme', 'Pilau', [{ item_code: 'Rice', qty: 1 }], true);
  await saveRecipe('Acme', 'Pilau', [{ item_code: 'Rice', qty: 1 }], false);
  expect(axiosInstance.post.mock.calls[0][0]).toMatch(/create_recipe$/);
  expect(axiosInstance.post.mock.calls[1][0]).toMatch(/update_recipe$/);
  expect(axiosInstance.post.mock.calls[0][1].ingredients).toBe('[{"item_code":"Rice","qty":1}]');
});

it('sends wastage as text lines with a reason', async () => {
  axiosInstance.post.mockResolvedValue(ok({ name: 'MAT-1' }));
  await recordWastage('Acme', { warehouse: 'W', reason: 'Burnt', items: [{ item_code: 'Pilau', qty: '2' }], ticket: '' });
  expect(axiosInstance.post.mock.calls[0][1]).toEqual({
    company: 'Acme', warehouse: 'W', reason: 'Burnt', ticket: undefined, items: '[{"item_code":"Pilau","qty":2}]',
  });
});

it('finds items by what was typed', async () => {
  axiosInstance.post.mockResolvedValue({ data: { message: { data: { products: [{ item_code: 'Rice', item_name: 'Rice', stock_uom: 'Kg' }] } } } });
  expect(await searchItems('Acme', 'ri')).toEqual([{ item_code: 'Rice', item_name: 'Rice', stock_uom: 'Kg', is_stock_item: undefined }]);
});

describe('ingredientsProblem', () => {
  it('asks for a dish and at least one ingredient', () => {
    expect(ingredientsProblem('', [])).toMatch(/dish/);
    expect(ingredientsProblem('Pilau', [])).toMatch(/at least one/);
  });
  it('refuses a missing item, a zero quantity, itself and a repeat', () => {
    expect(ingredientsProblem('Pilau', [{ item_code: '', qty: 1 }])).toMatch(/line 1/);
    expect(ingredientsProblem('Pilau', [{ item_code: 'Rice', item_name: 'Rice', qty: 0 }])).toMatch(/Rice/);
    expect(ingredientsProblem('Pilau', [{ item_code: 'Pilau', qty: 1 }])).toMatch(/itself/);
    expect(ingredientsProblem('Pilau', [{ item_code: 'Rice', qty: 1 }, { item_code: 'Rice', qty: 2 }])).toMatch(/twice/);
  });
  it('accepts good lines', () => {
    expect(ingredientsProblem('Pilau', [{ item_code: 'Rice', qty: 0.25 }, { item_code: 'Oil', qty: 0.01 }])).toBe('');
  });
});

describe('wastageProblem', () => {
  const good = { warehouse: 'W', reason: 'Spoiled', items: [{ item_code: 'Milk', qty: 2 }] };
  it('needs a store, a reason and items', () => {
    expect(wastageProblem({ ...good, warehouse: '' })).toMatch(/store/);
    expect(wastageProblem({ ...good, reason: '  ' })).toMatch(/why/);
    expect(wastageProblem({ ...good, items: [] })).toMatch(/at least one/);
    expect(wastageProblem({ ...good, items: [{ item_code: 'Milk', qty: 0 }] })).toMatch(/above zero/);
    expect(wastageProblem(good)).toBe('');
  });
});

it('grades a margin', () => {
  expect(marginClass(70)).toBe('good');
  expect(marginClass(45)).toBe('fair');
  expect(marginClass(10)).toBe('low');
});
