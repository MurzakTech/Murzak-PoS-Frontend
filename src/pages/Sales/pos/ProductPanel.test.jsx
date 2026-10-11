import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ProductPanel from './ProductPanel';

const products = [
  { item_code: 'CHEESE', item_name: 'Cheese', item_group: 'Dairy' },
  { item_code: 'SOLD-OUT', item_name: 'Sold Out Item', item_group: 'Dairy' },
  { item_code: 'LOW', item_name: 'Nearly Gone', item_group: 'Dairy' },
];

const stocks = { CHEESE: 0.6, 'SOLD-OUT': 0, LOW: 3 };

const renderPanel = () =>
  render(
    <ThemeProvider theme={createTheme()}>
    <ProductPanel
      searchTerm=""
      setSearchTerm={() => {}}
      searchInputRef={{ current: null }}
      onSearchEnter={() => {}}
      categories={[]}
      selectedCategory="All"
      setSelectedCategory={() => {}}
      products={products}
      visibleCount={50}
      onShowMore={() => {}}
      isLoading={false}
      hasStore
      addToCart={() => {}}
      getTileData={(p) => ({ price: 100, originalPrice: null, discountLabel: null, stockQty: stocks[p.item_code] ?? null, cartQty: 0, uom: 'Kg' })}
    />
    </ThemeProvider>
  );

describe('stock shown on a product tile', () => {
  it('does not call a product out of stock while some is left, even less than one unit', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: /^Cheese, .*0\.6 in stock/ })).toBeInTheDocument();
    expect(screen.queryAllByText('Out of stock')).toHaveLength(1); // only the one with none
  });

  it('says so for a product with none left, and warns when only a few are', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: /^Sold Out Item, .*0 in stock/ })).toBeInTheDocument();
    expect(screen.getByText(/3 left/)).toBeInTheDocument();
  });
});
