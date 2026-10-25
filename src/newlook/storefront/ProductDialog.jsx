import React, { useEffect, useState } from 'react';
import ProductImage from '../../components/Common/ProductImage';
import Button from '../components/Button';
import Dialog from '../components/Dialog';
import { formatMoney } from '../components/format';
import { unitWord } from '../products/unitWords';
import { maxFor } from './cart';
import Stepper from './Stepper';

const MAIN_SHAPE = 'wide';
const THUMB_SHAPE = 'square';

/** One product up close: its photos (the main one first, then the extras), what it costs, what it is, and Add. */
const ProductDialog = ({ product, line, dispatch, onClose, t }) => {
  const [shown, setShown] = useState(0);
  useEffect(() => setShown(0), [product && product.item_code]);

  if (!product) return null;
  const { item_code: code, item_name: name } = product;
  const photos = [product.image, ...(Array.isArray(product.images) ? product.images : [])].filter(Boolean);
  const picture = { item_code: code, item_name: name, item_group: product.category, image: photos[shown] || product.image };

  return (
    <Dialog
      open
      onClose={onClose}
      title={name}
      closeLabel={t('close')}
      footer={
        !product.in_stock ? (
          <Button variant="secondary" onClick={onClose}>
            {t('close')}
          </Button>
        ) : line ? (
          <Stepper name={name} qty={line.qty} max={line.max ?? maxFor(product)} t={t} onChange={(qty) => dispatch({ type: 'set', item_code: code, qty })} />
        ) : (
          <Button icon="plus" onClick={() => dispatch({ type: 'add', product })}>
            {t('add')}
          </Button>
        )
      }
    >
      <div className="sf-detail">
        <ProductImage product={picture} shape={MAIN_SHAPE} alt={photos.length > 1 ? t('photoOf', { number: shown + 1, count: photos.length }) : name} />
        {photos.length > 1 ? (
          <div className="sf-detail__thumbs">
            {photos.map((src, index) => (
              <button
                key={`${src}-${index}`}
                type="button"
                className={['sf-detail__thumb', index === shown && 'is-on'].filter(Boolean).join(' ')}
                aria-label={t('showPhoto', { number: index + 1 })}
                aria-pressed={index === shown}
                onClick={() => setShown(index)}
              >
                <ProductImage product={{ item_code: code, item_name: name, image: src }} shape={THUMB_SHAPE} alt="" />
              </button>
            ))}
          </div>
        ) : null}
        <p>
          <strong>{formatMoney(product.price)}</strong>
          {product.unit ? <span className="sf-product__unit"> {t('perUnit', { unit: unitWord(product.unit) })}</span> : null}
        </p>
        {product.description ? <p className="sf-detail__text">{product.description}</p> : null}
      </div>
    </Dialog>
  );
};

export default ProductDialog;
