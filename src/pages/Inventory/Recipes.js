import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Chip, Typography } from '@mui/material';
import { Add, Restaurant } from '@mui/icons-material';
import { useAppSelector } from '../../store/hooks';
import PageHeader from '../../components/Layout/PageHeader';
import FilterBar from '../../components/Layout/FilterBar';
import DataTable from '../../components/Layout/DataTable';
import { getUserCompany } from '../../utils/getUserCompany';
import { listRecipes } from '../../api/recipesApi';

const PAGE_SIZE = 20;

export const money = (value) =>
  Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** The margin of a dish as a percentage of its price, or null when it has no price. */
export const marginPercent = (price, cost) => {
  const p = Number(price) || 0;
  return p > 0 ? Math.round(((p - (Number(cost) || 0)) / p) * 1000) / 10 : null;
};

/** Recipes: the dishes of a restaurant and what one portion of each costs. */
const Recipes = () => {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const company = getUserCompany(user);
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => { setApplied(search.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    setError('');
    try {
      const result = await listRecipes(company, { search: applied, page, pageSize: PAGE_SIZE });
      setRows(result.rows.map((r) => ({ ...r, id: r.dish })));
      setCount(result.count);
    } catch (e) {
      setError(e.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [company, applied, page]);

  useEffect(() => { load(); }, [load]);

  const columns = useMemo(() => [
    { field: 'dish_name', header: 'Dish', width: '30%', render: (v, row) => v || row.dish },
    { field: 'ingredients_count', header: 'Ingredients', width: '12%' },
    {
      field: 'cost_per_portion', header: 'Cost of a portion', width: '18%',
      render: (v, row) => (
        <Box>
          {money(v)}
          {!row.costs_known && <Chip size="small" label="some costs unknown" sx={{ ml: 1 }} />}
        </Box>
      ),
    },
    { field: 'selling_price', header: 'Price', width: '14%', render: (v) => money(v) },
    {
      field: 'margin', header: 'Margin', render: (_v, row) => {
        const m = marginPercent(row.selling_price, row.cost_per_portion);
        return m === null ? <Typography variant="body2" color="text.secondary">No price</Typography> : `${m}%`;
      },
    },
  ], []);

  return (
    <Box>
      <PageHeader
        title="Recipes"
        subtitle="What goes into each dish, what a portion costs and what it earns"
        icon={Restaurant}
        actions={[{ label: 'New recipe', icon: <Add />, onClick: () => navigate('/inventory/recipes/new'), variant: 'contained' }]}
      />
      <FilterBar searchValue={search} searchPlaceholder="Search dishes..." onSearchChange={setSearch} filters={[]} onClearFilters={() => setSearch('')} />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        rowKey="id"
        onRowClick={(row) => navigate(`/inventory/recipes/${encodeURIComponent(row.dish)}`)}
        pagination={{ page, pageSize: PAGE_SIZE, totalItems: count }}
        onPageChange={(_e, p) => setPage(p)}
        emptyMessage="No recipes yet. Choose New recipe to make the first one."
      />
    </Box>
  );
};

export default Recipes;
