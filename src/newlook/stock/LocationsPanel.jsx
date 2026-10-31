import React from 'react';
import Button from '../components/Button';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import Menu from '../components/Menu';
import Table from '../components/Table';
import fill from '../labels/fill';
import StockCards from './StockCards';
import T from './strings.stock';

const D = T.locations;

/**
 * The Locations tab: the shop's stores in a short list, the main store marked. The owner adds a store here and, with two or
 * more stores, anyone who may change stock can make a store the main one or start moving stock out of it. A shop with one
 * store is told what a second store is for, because a second store is what turns Transfers on.
 *
 *   stores     the selling locations [{ name, warehouse_name, is_default }]
 *   loading    the stores are still being fetched
 *   canAdd     the person is the business owner
 *   canChange  the person may change stock
 *   narrow     show cards instead of a table
 *   onAdd()    open the Add a store form
 *   onMakeMain(store)
 *   onMoveFrom(store)
 *   onEdit(store)    open Edit store (anyone who may change stock)
 *   onPeople(store)  open Who works here (the owner)
 */
const LocationsPanel = ({ stores = [], loading = false, canAdd = false, canChange = false, narrow = false, onAdd, onMakeMain, onMoveFrom, onEdit, onPeople }) => {
  const several = stores.length >= 2;
  const label = (s) => s.warehouse_name || s.name;
  const menuFor = (s) => {
    const items = [];
    if (canChange) items.push({ label: D.editStore, onClick: () => onEdit(s) });
    // Who works where is the owner's to choose
    if (canAdd) items.push({ label: D.whoWorksHere, onClick: () => onPeople(s) });
    if (canChange && several) items.push({ label: D.moveFrom, onClick: () => onMoveFrom(s) });
    if (canChange && several && !s.is_default) items.push({ label: D.makeMain, onClick: () => onMakeMain(s) });
    return items.length ? <Menu label={fill(D.actionsFor, { store: label(s) })} items={items} /> : null;
  };
  const columns = [
    {
      key: 'store',
      header: D.storeColumn,
      render: (s) => (
        <>
          <strong>{label(s)}</strong>
          {s.is_default ? <span className="nl-stock-store-main">{D.main}</span> : null}
        </>
      ),
    },
    { key: 'more', header: D.moreColumn, align: 'right', render: menuFor },
  ];
  const rows = stores.map((s) => ({ ...s, id: s.name }));

  const empty = { title: D.emptyTitle, description: D.emptyText, action: canAdd ? { label: D.addStore, icon: 'plus', onClick: onAdd } : undefined };

  return (
    <div className="nl-stock__list">
      <div className="nl-stock__toolbar">
        {canAdd ? (
          <Button variant="primary" icon="plus" onClick={onAdd}>
            {D.addStore}
          </Button>
        ) : null}
      </div>
      {narrow && rows.length > 0 ? (
        <StockCards
          label={D.cardsLabel}
          items={rows.map((s) => ({ key: s.id, head: label(s), aside: s.is_default ? D.main : undefined, lines: [], foot: menuFor(s) || undefined }))}
        />
      ) : (
        <Table caption={D.tableCaption} columns={columns} rows={rows} loading={loading} empty={empty} />
      )}
      {!loading && stores.length === 1 ? (
        <Card>
          <EmptyState icon="store" title={D.oneStoreTitle} description={canAdd ? D.oneStoreText : D.ownerOnly} />
        </Card>
      ) : null}
    </div>
  );
};

export default LocationsPanel;
