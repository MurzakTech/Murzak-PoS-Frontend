import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StockTiles from './StockTiles';
import { FlagList } from './Labels';

const TILES = { items: 12, low: 2, out_of_stock: 1, stock_value: 5000, retail_value: 7500, potential_profit: 2500, check: 3 };

describe('the tiles with the selling figures', () => {
  test('an owner sees the selling value, the profit and the number to check', () => {
    render(<StockTiles tiles={TILES} loading={false} showValue active="" onPick={jest.fn()} />);
    expect(screen.getByText('Selling value')).toBeInTheDocument();
    expect(screen.getByText('Profit if all sold')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /To check/ })).toBeInTheDocument();
  });

  test('pressing To check asks for only those products, and shows it is on', () => {
    const onPick = jest.fn();
    const { rerender } = render(<StockTiles tiles={TILES} loading={false} showValue active="" onPick={onPick} />);
    userEvent.click(screen.getByRole('button', { name: /To check/ }));
    expect(onPick).toHaveBeenCalledWith('check');
    rerender(<StockTiles tiles={TILES} loading={false} showValue active="check" onPick={onPick} />);
    expect(screen.getByRole('button', { name: /To check/ })).toHaveAttribute('aria-pressed', 'true');
  });

  test('a person who may not see cost sees none of it', () => {
    render(<StockTiles tiles={{ items: 12, low: 2, out_of_stock: 1 }} loading={false} showValue={false} active="" onPick={jest.fn()} />);
    expect(screen.queryByText('Selling value')).not.toBeInTheDocument();
    expect(screen.queryByText('Profit if all sold')).not.toBeInTheDocument();
    expect(screen.queryByText('To check')).not.toBeInTheDocument();
  });

  test('the tiles are as they were when the server sent no selling figures', () => {
    render(<StockTiles tiles={{ items: 12, low: 2, out_of_stock: 1, stock_value: 5000 }} loading={false} showValue active="" onPick={jest.fn()} />);
    expect(screen.getByText('Stock value')).toBeInTheDocument();
    expect(screen.queryByText('Selling value')).not.toBeInTheDocument();
  });
});

describe('the warnings on a product', () => {
  test('each warning is an icon and a sentence', () => {
    render(<FlagList flags={['no_cost', 'no_price']} />);
    expect(screen.getByText('No cost recorded')).toBeInTheDocument();
    expect(screen.getByText('No selling price')).toBeInTheDocument();
  });

  test('a product with none shows nothing', () => {
    const { container } = render(<FlagList flags={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
