import axiosInstance from './axiosInstance';
import { friendlyErrorMessage } from '../utils/friendlyError';
import { callServer } from './serverCall';

/**
 * Recipes and wastage for restaurants. A dish is a menu item that is not kept in stock; selling it takes its
 * ingredients out of stock. Wastage takes stock out with a reason, and a dish wasted is taken out as its ingredients.
 */

const RECIPES = 'murzak_pos.api.recipes_api';

export const listRecipes = async (company, { search, page = 1, pageSize = 20 } = {}) => {
  const body = await callServer(`${RECIPES}.list_recipes`, { company, search, page, page_size: pageSize }, {
    get: true,
    fallback: 'The recipes could not be loaded.',
  });
  return { rows: body.data?.data || [], count: body.data?.count || 0 };
};

export const getRecipe = async (company, dish, warehouse) => {
  const body = await callServer(`${RECIPES}.get_recipe`, { company, dish, warehouse }, {
    get: true,
    fallback: 'The recipe could not be loaded.',
  });
  return body.data;
};

/** The ingredient lines as the server wants them: item, quantity and (optionally) the unit the quantity is in. */
export const ingredientPayload = (lines) =>
  lines.map((l) => ({ item_code: l.item_code, qty: Number(l.qty), ...(l.uom ? { uom: l.uom } : {}) }));

export const saveRecipe = async (company, dish, lines, isNew) => {
  const body = await callServer(`${RECIPES}.${isNew ? 'create_recipe' : 'update_recipe'}`, {
    company, dish, ingredients: JSON.stringify(ingredientPayload(lines)),
  }, { fallback: 'The recipe could not be saved.' });
  return body.data;
};

export const deleteRecipe = (company, dish) =>
  callServer(`${RECIPES}.delete_recipe`, { company, dish }, { fallback: 'The recipe could not be removed.' });

export const replaceDishItem = async (company, itemCode) => {
  const body = await callServer(`${RECIPES}.replace_dish_item`, { company, item_code: itemCode }, {
    fallback: 'The dish could not be replaced.',
  });
  return body.data;
};

export const recordWastage = async (company, { warehouse, reason, items, ticket }) => {
  const body = await callServer(`${RECIPES}.record_wastage`, {
    company, warehouse, reason, ticket: ticket || undefined,
    items: JSON.stringify(items.map((i) => ({ item_code: i.item_code, qty: Number(i.qty) }))),
  }, { fallback: 'The wastage could not be recorded.' });
  return body.data;
};

export const getWastageReport = async (company, { fromDate, toDate, warehouse } = {}) => {
  const body = await callServer(`${RECIPES}.get_wastage_report`, {
    company, from_date: fromDate, to_date: toDate, warehouse,
  }, { get: true, fallback: 'The wastage report could not be loaded.' });
  return body.data;
};

// --- pickers ---------------------------------------------------------------------------------------

/** Items matching what was typed, for the ingredient and dish pickers. */
export const searchItems = async (company, term, { stockOnly = false } = {}) => {
  try {
    const response = await axiosInstance.post('murzak_pos.api.product_api.get_products', {
      company, search_term: term || '', page: 1, page_size: 20, disabled: false,
      ...(stockOnly ? { is_stock_item: true } : {}),
    });
    const body = response.data?.message ?? response.data;
    const data = body?.data ?? body;
    const list = Array.isArray(data) ? data : data?.products || data?.data || [];
    return list.map((p) => ({
      item_code: p.item_code || p.name,
      item_name: p.item_name || p.name,
      stock_uom: p.stock_uom || p.uom || '',
      is_stock_item: p.is_stock_item,
    }));
  } catch (error) {
    throw new Error(friendlyErrorMessage(error));
  }
};

export const listWarehouseNames = async (company) => {
  try {
    const response = await axiosInstance.post('murzak_pos.api.warehouse_api.list_warehouses', { company, is_group: false, limit: 100, offset: 0 });
    const body = response.data?.message ?? response.data;
    const data = body?.data ?? body;
    const list = Array.isArray(data) ? data : data?.warehouses || data?.data || [];
    return list.map((w) => w.name).filter(Boolean);
  } catch (error) {
    throw new Error(friendlyErrorMessage(error));
  }
};

// --- checks ----------------------------------------------------------------------------------------

/** Why the ingredient lines cannot be saved, or '' when they can. */
export const ingredientsProblem = (dish, lines) => {
  if (!dish) return 'Choose the dish first.';
  if (lines.length === 0) return 'Add at least one ingredient.';
  const seen = new Set();
  for (const [i, l] of lines.entries()) {
    if (!l.item_code) return `Choose the item on line ${i + 1}.`;
    if (l.item_code === dish) return 'A dish cannot be an ingredient of itself.';
    if (!(Number(l.qty) > 0)) return `Enter how much of ${l.item_name || l.item_code} goes into one portion.`;
    if (seen.has(l.item_code)) return `${l.item_name || l.item_code} is on the list twice. Put it on one line.`;
    seen.add(l.item_code);
  }
  return '';
};

/** Why the wastage cannot be recorded, or '' when it can. */
export const wastageProblem = ({ warehouse, reason, items }) => {
  if (!warehouse) return 'Choose the store the stock is taken from.';
  if (!(reason || '').trim()) return 'Say why the stock is being written off.';
  if (items.length === 0) return 'Add at least one item.';
  const bad = items.find((i) => !i.item_code || !(Number(i.qty) > 0));
  return bad ? 'Every line needs an item and a quantity above zero.' : '';
};

export const marginClass = (percent) => (percent >= 60 ? 'good' : percent >= 30 ? 'fair' : 'low');
