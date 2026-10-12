import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Autocomplete, Box, Button, Card, CardContent, CircularProgress, IconButton, MenuItem, TextField, Typography,
} from '@mui/material';
import { Add, ArrowBack, Delete, Save } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { showNotification } from '../../store/notificationSlice';
import PageHeader from '../../components/Layout/PageHeader';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import { getUserCompany } from '../../utils/getUserCompany';
import {
  deleteRecipe, getRecipe, ingredientsProblem, listWarehouseNames, replaceDishItem, saveRecipe, searchItems,
} from '../../api/recipesApi';
import { marginPercent, money } from './Recipes';

// An item picker that asks the server as the person types
const ItemPicker = ({ company, value, onChange, label, stockOnly, disabled }) => {
  const [options, setOptions] = useState([]);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!company) return undefined;
    let current = true;
    const t = setTimeout(() => {
      searchItems(company, text, { stockOnly }).then((rows) => { if (current) setOptions(rows); }).catch(() => {});
    }, 250);
    return () => { current = false; clearTimeout(t); };
  }, [company, text, stockOnly]);

  return (
    <Autocomplete
      size="small" disabled={disabled} options={options} value={value} label={label}
      getOptionLabel={(o) => (o ? `${o.item_name || o.item_code}${o.item_name && o.item_name !== o.item_code ? ` (${o.item_code})` : ''}` : '')}
      isOptionEqualToValue={(a, b) => a.item_code === b.item_code}
      filterOptions={(x) => x}
      onInputChange={(_e, v) => setText(v)}
      onChange={(_e, v) => onChange(v)}
      renderInput={(params) => <TextField {...params} label={label} />}
    />
  );
};

const emptyLine = () => ({ key: Math.random().toString(36).slice(2), item: null, qty: '', uom: '' });

/**
 * A recipe: the dish, and what goes into one portion. Saving a recipe makes the dish stop being kept in stock;
 * from then on a sale takes the ingredients out of stock instead.
 */
const RecipeEditor = () => {
  const { dish: dishParam } = useParams();
  const isNew = !dishParam || dishParam === 'new';
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const company = getUserCompany(user);

  const [dish, setDish] = useState(null);
  const [lines, setLines] = useState([emptyLine()]);
  const [info, setInfo] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [warehouse, setWarehouse] = useState('');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [needsReplacement, setNeedsReplacement] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const notify = (message, severity, title) => dispatch(showNotification({ message, severity, title }));

  const load = useCallback(async () => {
    if (isNew || !company) return;
    setLoading(true);
    setError('');
    try {
      const recipe = await getRecipe(company, dishParam, warehouse || undefined);
      setInfo(recipe);
      setDish({ item_code: recipe.dish, item_name: recipe.dish_name });
      setLines(recipe.ingredients.map((i) => ({
        key: i.item_code, item: { item_code: i.item_code, item_name: i.item_name }, qty: String(i.qty), uom: '',
      })));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [company, dishParam, isNew, warehouse]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (company) listWarehouseNames(company).then(setWarehouses).catch(() => {}); }, [company]);

  const setLine = (key, changes) => setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...changes } : l)));

  const flat = lines.map((l) => ({ item_code: l.item?.item_code, item_name: l.item?.item_name, qty: l.qty, uom: l.uom.trim() }));
  const problem = ingredientsProblem(dish?.item_code, flat);

  const save = async () => {
    if (problem) { setError(problem); return; }
    setSaving(true);
    setError('');
    setNeedsReplacement(false);
    try {
      await saveRecipe(company, dish.item_code, flat, isNew);
      notify('The recipe is saved.', 'success', 'Recipes');
      if (isNew) navigate(`/inventory/recipes/${encodeURIComponent(dish.item_code)}`, { replace: true });
      else await load();
    } catch (e) {
      setError(e.message);
      setNeedsReplacement(/stock history/i.test(e.message));
    } finally {
      setSaving(false);
    }
  };

  const replace = async () => {
    setSaving(true);
    try {
      const made = await replaceDishItem(company, dish.item_code);
      const code = made.new_item;
      setDish({ item_code: code, item_name: code });
      setNeedsReplacement(false);
      setError('');
      notify(`${code} now takes the place of ${dish.item_code}. Save the recipe to finish.`, 'info', 'Dish replaced');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setConfirmDelete(false);
    setSaving(true);
    try {
      await deleteRecipe(company, dish.item_code);
      notify('The recipe is removed. The item stays on your list.', 'success', 'Recipes');
      navigate('/inventory/recipes');
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  const m = info ? marginPercent(info.selling_price, info.cost_per_portion) : null;

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;

  return (
    <Box>
      <PageHeader
        title={isNew ? 'New recipe' : `Recipe: ${info?.dish_name || dishParam}`}
        subtitle="What goes into one portion of the dish"
        actions={[{ label: 'All recipes', icon: <ArrowBack />, onClick: () => navigate('/inventory/recipes'), variant: 'outlined' }]}
      />
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} action={needsReplacement ? <Button color="inherit" size="small" onClick={replace}>Make a new menu item</Button> : null}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          {isNew ? (
            <Box sx={{ maxWidth: 420, mb: 2 }}>
              <ItemPicker company={company} label="Dish (a menu item)" value={dish} onChange={setDish} disabled={saving} />
            </Box>
          ) : null}
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Ingredients for one portion</Typography>
          {lines.map((l, index) => (
            <Box key={l.key} sx={{ display: 'flex', gap: 1.5, mb: 1.5, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <Box sx={{ flex: '2 1 260px' }}>
                <ItemPicker company={company} label={`Ingredient ${index + 1}`} stockOnly value={l.item} onChange={(v) => setLine(l.key, { item: v })} disabled={saving} />
              </Box>
              <TextField
                size="small" label="Quantity" type="number" inputProps={{ min: 0, step: 'any' }} value={l.qty}
                onChange={(e) => setLine(l.key, { qty: e.target.value })} sx={{ flex: '1 1 110px' }} disabled={saving}
              />
              <TextField
                size="small" label="Unit (optional)" value={l.uom} placeholder={l.item?.stock_uom || ''}
                helperText="Leave empty to use the item's own unit" onChange={(e) => setLine(l.key, { uom: e.target.value })}
                sx={{ flex: '1 1 130px' }} disabled={saving}
              />
              <IconButton aria-label="Remove ingredient" onClick={() => setLines((prev) => (prev.length > 1 ? prev.filter((x) => x.key !== l.key) : prev))} disabled={saving || lines.length === 1}>
                <Delete />
              </IconButton>
            </Box>
          ))}
          <Button startIcon={<Add />} onClick={() => setLines((prev) => [...prev, emptyLine()])} disabled={saving}>Add ingredient</Button>
          <Box sx={{ display: 'flex', gap: 2, mt: 3, flexWrap: 'wrap' }}>
            <Button variant="contained" onClick={save} disabled={saving || !!problem} startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}>
              Save recipe
            </Button>
            {!isNew && <Button color="error" onClick={() => setConfirmDelete(true)} disabled={saving}>Remove recipe</Button>}
          </Box>
          {problem && dish && <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>{problem}</Typography>}
        </CardContent>
      </Card>

      {info && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>What a portion costs</Typography>
            <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', mb: 2 }}>
              <Box><Typography variant="caption" color="text.secondary">Cost</Typography><Typography variant="h6">{money(info.cost_per_portion)}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">Selling price</Typography><Typography variant="h6">{money(info.selling_price)}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">Margin</Typography><Typography variant="h6">{m === null ? 'No price' : `${money(info.margin)} (${m}%)`}</Typography></Box>
            </Box>
            {!info.costs_known && <Alert severity="warning" sx={{ mb: 2 }}>Some ingredients have no cost yet, so the cost shown is too low. Receive stock for them to set it.</Alert>}
            <TextField select size="small" label="Portions possible from the stock in" value={warehouse} onChange={(e) => setWarehouse(e.target.value)} sx={{ minWidth: 340 }}>
              <MenuItem value="">Choose a store</MenuItem>
              {warehouses.map((w) => <MenuItem key={w} value={w}>{w}</MenuItem>)}
            </TextField>
            {info.availability && (
              <Typography variant="body1" sx={{ mt: 2 }}>
                <strong>{info.availability.available_qty}</strong> portions can be made.
                {info.availability.components?.find((c) => c.is_limiting) && (
                  <> The limit is <strong>{info.availability.components.find((c) => c.is_limiting).item_name}</strong>.</>
                )}
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Remove this recipe?"
        message="The dish stays on your menu, but a sale will no longer take ingredients out of stock."
        confirmText="Remove recipe"
        onConfirm={remove}
        onClose={() => setConfirmDelete(false)}
      />
    </Box>
  );
};

export default RecipeEditor;
