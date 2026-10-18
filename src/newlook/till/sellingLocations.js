/**
 * The places a shop sells from (Spec: Till, "The warehouse menu on a cart line is hidden unless there are 2 or more
 * locations"; AC-22). A new ERPNext business also comes with warehouses that are not places to sell from: stock in
 * production, finished goods waiting, goods in transit, and group folders. Those must not make a one-shop business look
 * as if it had a second location, so the cart line's "Take stock from" menu counts only real selling locations.
 */
const NOT_SELLING = [/^work in progress\b/i, /^finished goods\b/i, /^goods in transit\b/i, /^all warehouses\b/i];

const isOff = (value) => value === 1 || value === true || value === '1';

export const isSellingLocation = (warehouse) => {
  if (!warehouse) return false;
  if (isOff(warehouse.disabled) || isOff(warehouse.is_group)) return false;
  const name = String(warehouse.warehouse_name || warehouse.name || '');
  return !NOT_SELLING.some((pattern) => pattern.test(name));
};

export const sellingLocations = (warehouses) => (Array.isArray(warehouses) ? warehouses.filter(isSellingLocation) : []);

/** The "Take stock from" menu shows only with two or more selling locations */
export const showsWarehouseMenu = (warehouses) => sellingLocations(warehouses).length >= 2;
