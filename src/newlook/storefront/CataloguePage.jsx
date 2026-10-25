import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listShopProducts } from '../../api/storefrontApi';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import Field from '../components/Field';
import { Skeleton } from '../components/Skeleton';
import { formatMoney } from '../components/format';
import BasketDialog from './BasketDialog';
import Frame from './Frame';
import ProductCard from './ProductCard';
import ProductDialog from './ProductDialog';
import { useShop, useToggle } from './ShopProvider';

const PAGE_SIZE = 20;
const SEARCH_PAUSE_MS = 300;

/** The shop's front page: search, categories, the products, and the basket. */
const CataloguePage = () => {
  const { slug, shop, status, reload, t, language, setLanguage, cart, dispatch, count, subtotal } = useShop();
  const navigate = useNavigate();
  const [basketOpen, openBasket, closeBasket] = useToggle(false);
  const [viewing, setViewing] = useState(null);

  const [typed, setTyped] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const latest = useRef(0);

  // Wait a moment after the last key before searching
  useEffect(() => {
    const timer = setTimeout(() => setQuery(typed.trim()), SEARCH_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [typed]);

  const fetchPage = useCallback(
    async (wanted, replace) => {
      const id = ++latest.current;
      setLoading(true);
      setFailed(false);
      try {
        const result = await listShopProducts({ slug, search: query, category, page: wanted, pageSize: PAGE_SIZE });
        if (id !== latest.current) return;
        setRows((before) => (replace ? result.rows : [...before, ...result.rows]));
        setTotal(result.total);
        setPage(wanted);
      } catch (error) {
        if (id === latest.current) setFailed(true);
      } finally {
        if (id === latest.current) setLoading(false);
      }
    },
    [slug, query, category]
  );

  useEffect(() => {
    if (status === 'ready') fetchPage(1, true);
  }, [status, fetchPage]);

  const linesByCode = new Map(cart.lines.map((l) => [l.item_code, l]));
  const title = shop?.store_name || '';

  if (status === 'loading') {
    return (
      <Frame t={t} language={language} onLanguage={setLanguage} title={t('loading')}>
        <div className="sf-grid" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} height="220px" radius="var(--radius-card)" />
          ))}
        </div>
      </Frame>
    );
  }

  if (status !== 'ready') {
    const closed = status === 'closed';
    return (
      <Frame t={t} language={language} onLanguage={setLanguage} title={t('shop')}>
        <EmptyState
          icon={closed ? 'store' : 'alert'}
          tone={closed ? 'neutral' : 'error'}
          title={t(closed ? 'closedTitle' : 'loadFailed')}
          description={closed ? t('closedBody') : undefined}
          action={closed ? undefined : { label: t('retry'), onClick: reload }}
        />
      </Frame>
    );
  }

  const home = `/shop/${slug}`;
  const categories = shop.categories || [];
  const whatsapp = shop.whatsapp_number ? `https://wa.me/${shop.whatsapp_number}` : '';

  return (
    <Frame
      t={t}
      language={language}
      onLanguage={setLanguage}
      title={title}
      subtitle={shop.tagline}
      homeTo={home}
      whatsapp={whatsapp}
      actions={
        <span className="sf-hide-phone">
          <Button variant="secondary" size="small" icon="till" onClick={openBasket}>
            {t('basketItems', { count })}
          </Button>
        </span>
      }
    >
      <div className="sf-toolbar">
        <Field
          label={t('searchLabel')}
          icon="search"
          type="search"
          value={typed}
          onChange={setTyped}
          placeholder={t('searchPlaceholder')}
        />
        {categories.length ? (
          <div className="sf-cats" role="group" aria-label={t('categoriesLabel')}>
            {['', ...categories].map((name) => (
              <button
                key={name || 'all'}
                type="button"
                className={['sf-cat', category === name && 'is-on'].filter(Boolean).join(' ')}
                aria-pressed={category === name}
                onClick={() => setCategory(name)}
              >
                {name || t('allCategories')}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {failed ? (
        <EmptyState icon="alert" tone="error" title={t('loadFailed')} action={{ label: t('retry'), onClick: () => fetchPage(1, true) }} />
      ) : rows.length === 0 && !loading ? (
        <EmptyState icon="search" title={t('noProducts')} description={t('noProductsHelp')} />
      ) : (
        <>
          <div className="sf-grid" aria-busy={loading || undefined}>
            {rows.map((product) => (
              <ProductCard key={product.item_code} product={product} line={linesByCode.get(product.item_code)} dispatch={dispatch} t={t} onOpen={setViewing} />
            ))}
            {loading && rows.length === 0
              ? Array.from({ length: 6 }, (_, i) => <Skeleton key={`s${i}`} height="220px" radius="var(--radius-card)" />)
              : null}
          </div>
          {rows.length < total ? (
            <div className="sf-more">
              <Button variant="secondary" loading={loading} onClick={() => fetchPage(page + 1, false)}>
                {t('showMore')}
              </Button>
            </div>
          ) : null}
        </>
      )}

      {count > 0 ? (
        <div className="sf-basketbar">
          <Button onClick={openBasket} icon="till">
            {t('basketItems', { count })} {formatMoney(subtotal)}
          </Button>
        </div>
      ) : null}

      <ProductDialog product={viewing} line={viewing ? linesByCode.get(viewing.item_code) : undefined} dispatch={dispatch} onClose={() => setViewing(null)} t={t} />

      <BasketDialog
        open={basketOpen}
        onClose={closeBasket}
        onCheckout={() => {
          closeBasket();
          navigate(`${home}/checkout`);
        }}
        shop={shop}
        cart={cart}
        subtotal={subtotal}
        dispatch={dispatch}
        t={t}
      />
    </Frame>
  );
};

export default CataloguePage;
