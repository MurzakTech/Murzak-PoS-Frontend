import React, { useCallback, useEffect, useState } from 'react';
import { getMarketplace } from '../../api/marketplaceApi';
import Button from '../components/Button';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { formatMoney } from '../components/format';
import fill from '../labels/fill';
import { PageHeader } from '../shell';
import S from './strings.marketplace';
import './marketplace.css';

const LOADING_ROWS = [1, 2, 3];

/** One product: what it is, what it costs, and the button that takes the owner to the website to pay. */
const Product = ({ item }) => {
  const words = S.products[item.id];
  return (
    <li className="nl-market__item">
      <div className="nl-market__text">
        <h3 className="nl-market__name">{item.name}</h3>
        {words?.description ? <p className="nl-market__description">{words.description}</p> : null}
        <p className="nl-market__price">
          {fill(S.perMonth, { price: formatMoney(item.monthly) })}
          {item.setup > 0 ? <span className="nl-market__once"> {fill(S.setupOnce, { price: formatMoney(item.setup) })}</span> : null}
        </p>
      </div>
      <div className="nl-market__action">
        <Button as="a" href={item.checkoutUrl} target="_blank" rel="noopener noreferrer" aria-label={fill(S.buyNamed, { name: item.name })} title={S.opensNewTab}>
          {S.buy}
        </Button>
      </div>
    </li>
  );
};

/**
 * What an owner can buy for their shop. Buying happens on the Murzak website (sign in, pay, set-up starts), so this page
 * only shows the choices and sends the owner there; nothing here takes money.
 */
const MarketplacePage = () => {
  const [groups, setGroups] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setGroups(null);
    setError('');
    try {
      const data = await getMarketplace();
      setGroups(data.groups.filter((group) => group.items.some((item) => item.checkoutUrl)));
    } catch (e) {
      setError(e.message || S.loadFailed);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="nl-market">
      <PageHeader title={S.title} subtitle={S.subtitle} />

      <Card title={S.howTitle}>
        <ol className="nl-market__steps">
          {S.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </Card>

      {error ? (
        <EmptyState icon="alert" tone="error" title={S.loadFailed} description={error} action={{ label: S.retry, onClick: load }} />
      ) : groups === null ? (
        <Card>
          {LOADING_ROWS.map((row) => (
            <Skeleton key={row} height="var(--space-7)" />
          ))}
        </Card>
      ) : groups.length === 0 ? (
        <EmptyState icon="store" title={S.empty} description={S.emptyHelp} />
      ) : (
        groups.map((group) => {
          const words = S.groups[group.key];
          return (
            <Card key={group.key} title={words?.title} subtitle={words?.help}>
              <ul className="nl-market__list">
                {group.items.map((item) => (
                  <Product key={item.id} item={item} />
                ))}
              </ul>
            </Card>
          );
        })
      )}
    </div>
  );
};

export default MarketplacePage;
