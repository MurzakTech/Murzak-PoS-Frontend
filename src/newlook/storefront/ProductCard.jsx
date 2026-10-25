import React from 'react';
import ProductImage from '../../components/Common/ProductImage';
import Button from '../components/Button';
import { Chip } from '../components/Chip';
import { formatMoney } from '../components/format';
import { unitWord } from '../products/unitWords';
import { maxFor } from './cart';
import Stepper from './Stepper';

const PICTURE_SHAPE = 'wide';

/** One product on the shelf: picture, name, price, and either "Add" or how many are in the basket. */
const ProductCard = ({ product, line, dispatch, t }) => {
  const { item_code: code, item_name: name } = product;
  const picture = { item_code: code, item_name: name, item_group: product.category, image: product.image };

  return (
    <article className="sf-product">
      <ProductImage product={picture} shape={PICTURE_SHAPE} alt={name} />
      <div className="sf-product__body">
        <h3 className="sf-product__name">{name}</h3>
        <p className="sf-product__price">
          <strong>{formatMoney(product.price)}</strong>
          {product.unit ? <span className="sf-product__unit"> {t('perUnit', { unit: unitWord(product.unit) })}</span> : null}
        </p>
        {product.low_stock !== null && product.low_stock !== undefined && product.in_stock ? (
          <p className="sf-product__low">{t('onlyLeft', { count: product.low_stock })}</p>
        ) : null}
        <div className="sf-product__action">
          {!product.in_stock ? (
            <Chip>{t('outOfStock')}</Chip>
          ) : line ? (
            <Stepper
              name={name}
              qty={line.qty}
              max={line.max ?? maxFor(product)}
              t={t}
              onChange={(qty) => dispatch({ type: 'set', item_code: code, qty })}
            />
          ) : (
            <Button variant="secondary" icon="plus" aria-label={t('addNamed', { name })} onClick={() => dispatch({ type: 'add', product })}>
              {t('add')}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
