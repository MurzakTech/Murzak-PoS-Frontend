import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '../components/Dialog';
import Menu from '../components/Menu';
import Table from '../components/Table';
import { useToast } from '../components/Toast';
import fill from '../labels/fill';
import { deleteCategory } from '../../api/productsListApi';
import CategoryDialog from './CategoryDialog';
import { canDeleteCategory, categoryAddress, categoryLabel, isRootCategory } from './productsModel';
import T from './strings.products';

const KEY = 'name';

/**
 * The Categories tab (ticket P4-2): every category with how many products it holds, a way to add one, and Rename and
 * Delete in each row's menu. The word is Categories everywhere. `state` is the result of useCategories().
 * `adding` and `onAddingChange` let the page header's Add category button open the dialog.
 */
const CategoriesTab = ({ state, adding, onAddingChange, onChanged, canChange = true }) => {
  const toast = useToast();
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  const categories = state.status === 'ready' ? state.data.categories : [];
  const C = T.categories;

  const done = ({ name, renamed }) => {
    toast.success(fill(renamed ? C.renamedToast : C.addedToast, { name }));
    setEditing(null);
    onAddingChange(false);
    onChanged();
  };

  const confirmRemove = async () => {
    setRemoveBusy(true);
    try {
      await deleteCategory(removing.name);
      toast.success(fill(C.deletedToast, { name: removing.name }));
      onChanged();
    } catch (error) {
      toast.error(error.message);
    }
    setRemoveBusy(false);
    setRemoving(null);
  };

  const allColumns = [
    {
      key: 'name',
      header: C.columns.name,
      render: (c) => (isRootCategory(c.name) ? categoryLabel(c.name) : <Link className="nl-products-link" to={categoryAddress(c.name)} aria-label={fill(C.viewProducts, { name: c.name })}>{c.name}</Link>),
    },
    { key: 'parent', header: C.columns.parent, hideOnPhone: true, render: (c) => (c.parent && !isRootCategory(c.parent) ? c.parent : C.topLevel) },
    { key: 'product_count', header: C.columns.products, align: 'right', render: (c) => fill(C.count, { count: Number(c.product_count).toLocaleString('en-US') }) },
    {
      key: 'actions',
      header: C.columns.actions,
      align: 'right',
      render: (c) =>
        isRootCategory(c.name) ? null : (
          <Menu
            label={fill(C.moreActions, { name: c.name })}
            items={[
              { label: C.rename, icon: 'settings', onClick: () => setEditing(c) },
              { label: C.remove, destructive: true, disabled: !canDeleteCategory(c), onClick: () => setRemoving(c) },
            ]}
          />
        ),
    },
  ];
  // A cashier reads the categories but cannot change them
  const columns = canChange ? allColumns : allColumns.filter((c) => c.key !== 'actions');

  return (
    <div className="nl-products__list">
      <p className="nl-products-note">{C.intro}</p>
      <Table
        caption={C.caption}
        columns={columns}
        rows={categories}
        rowKey={KEY}
        className="is-compact"
        loading={state.status === 'loading'}
        error={state.status === 'error'}
        onRetry={state.reload}
        empty={{ icon: 'layers', title: C.emptyTitle, description: C.emptyText, action: canChange ? { label: C.add, icon: 'plus', onClick: () => onAddingChange(true) } : undefined }}
      />
      {canChange && state.status === 'ready' && categories.some((c) => !canDeleteCategory(c) && !isRootCategory(c.name)) ? <p className="nl-products-note">{C.deleteHint}</p> : null}

      <CategoryDialog open={adding || Boolean(editing)} category={editing || undefined} categories={categories} onClose={() => { setEditing(null); onAddingChange(false); }} onDone={done} />
      <ConfirmDialog
        open={Boolean(removing)}
        title={removing ? fill(C.confirm.title, { name: removing.name }) : ''}
        message={removing ? fill(C.confirm.message, { name: removing.name }) : ''}
        confirmLabel={C.confirm.confirm}
        cancelLabel={C.confirm.cancel}
        destructive
        loading={removeBusy}
        onConfirm={confirmRemove}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
};

export default CategoriesTab;
