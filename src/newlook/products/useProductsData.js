import { listCategories, listProducts, listUnits } from '../../api/productsListApi';
import { useFetched, useDataQuery, invalidateQuery } from '../hooks/useDataQuery';

export { useFetched, useDataQuery, invalidateQuery };

/** One page of the list; `query` is what listProducts takes */
export const useProductList = (query) => useFetched(`products:list:${JSON.stringify(query)}`, () => listProducts(query));

/** The categories with their product counts */
export const useCategories = () => useFetched('products:categories', () => listCategories());

/** The units the shop can choose from */
export const useUnits = () => useFetched('products:units', () => listUnits());

/** One product by its code, for a shared link to a product that is not on the page; nothing is asked while code is empty */
export const useProductByCode = (code) =>
  useFetched(
    `products:code:${code}`,
    async () => {
      const answer = await listProducts({ search: code, status: 'all', pageSize: 10 });
      return answer.rows.find((r) => r.item_code === code) || null;
    },
    Boolean(code)
  );
