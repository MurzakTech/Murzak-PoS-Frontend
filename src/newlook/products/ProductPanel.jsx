import React from 'react';
import DetailPanel, { DetailFacts } from '../components/DetailPanel';
import { StatusLabel } from '../components/Chip';
import { formatMoney } from '../components/format';
import fill from '../labels/fill';
import { categoryLabel, hasCost, profitOf, statusView, stockText } from './productsModel';
import { quantityText, unitLabel } from './unitWords';
import T from './strings.products';

/**
 * The product panel (Spec: Detail panel): name, code, price, stock, unit, category, barcode, and, for owners and managers
 * only, cost price and profit per item. Edit and Add stock go to the screens that do those jobs. The cost is drawn only when
 * the person may see it AND the server sent it (a cashier's rows have no cost at all).
 */
const ProductPanel = ({ product, scope, position, canSeeCost, canChange, loading = false, onClose, onPrevious, onNext, onAddStock, onEdit }) => {
  const P = T.panel;
  const view = statusView(product.status);
  const showCost = canSeeCost && hasCost(product);
  const profit = showCost ? profitOf(product.price, product.cost_price) : null;
  const tracked = Boolean(product.is_stock_item);

  const facts = [
    { label: P.price, value: formatMoney(product.price) },
    ...(showCost
      ? [
          { label: P.cost, value: product.cost_price === null || product.cost_price === undefined ? `${P.costNone}. ${P.costHint}` : formatMoney(product.cost_price) },
          ...(profit === null
            ? []
            : [
                {
                  label: profit < 0 ? P.loss : P.profit,
                  value: product.margin_percent === null || product.margin_percent === undefined ? formatMoney(Math.abs(profit)) : `${formatMoney(Math.abs(profit))} (${product.margin_percent}%)`,
                },
              ]),
        ]
      : []),
    { label: scope && scope.kind === 'store' ? P.stockStore : P.stockAll, value: stockText(product) },
    ...(tracked ? [{ label: P.warning, value: product.low_stock_level ? quantityText(product.low_stock_level, product.unit) : P.warningNone }] : []),
    { label: P.unit, value: unitLabel(product.unit) },
    { label: P.barcode, value: (product.barcodes && product.barcodes.length ? product.barcodes : [product.barcode]).filter(Boolean).join(', ') },
    { label: P.category, value: categoryLabel(product.category) },
  ];

  return (
    <DetailPanel
      title={product.item_name}
      subtitle={fill(T.panel.codeLine, { code: product.item_code })}
      status={<StatusLabel status={view.status}>{view.words}</StatusLabel>}
      position={position}
      loading={loading}
      onClose={onClose}
      onPrevious={onPrevious}
      onNext={onNext}
      primary={canChange && tracked ? { label: P.addStock, icon: 'plus', onClick: onAddStock } : undefined}
      secondary={canChange ? [{ label: P.edit, icon: 'settings', onClick: onEdit }] : []}
    >
      <DetailFacts facts={facts} />
    </DetailPanel>
  );
};

export default ProductPanel;
