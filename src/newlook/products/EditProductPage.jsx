import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Checkbox from '../components/Checkbox';
import { ConfirmDialog } from '../components/Dialog';
import EmptyState from '../components/EmptyState';
import Field from '../components/Field';
import Icon from '../components/Icon';
import Select from '../components/Select';
import { Skeleton } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { useAccess } from '../access/AccessProvider';
import { FormPage, MoreOptions } from '../forms';
import FT from '../forms/strings.forms';
import fill from '../labels/fill';
import { oldScreen } from '../redirects/engine';
import { useAppSelector } from '../../store/hooks';
import { findProduct, ProductSaveError, updateProduct } from '../../api/productsListApi';
import './products.css';
import { invalidateQuery, useCategories, useUnits } from './useProductsData';
import useShopUnits from './useShopUnits';
import UnitPicker from './UnitPicker';
import { categoryLabel, changesFrom, checkForm, FIELD_IDS, formFromProduct, isEdited, MORE_FIELDS, PRODUCTS_PATH, profitLine, summaryOf } from './productsModel';
import T from './strings.products';
import OnlineProductSection from './OnlineProductSection';
import { onlineStoreAccess } from '../../config/roleAccessConfig';
import useRoleAccess from '../../hooks/useRoleAccess';

/**
 * The Edit product form at /new-look/products/:code/edit. The same layout as New product, filled with what the product has now:
 * name and price first, and under More options the cost price (owners and managers), unit, category and whether the product is
 * still sold. Only what was changed is sent, so nothing else on the product is touched. Stock is not edited here: it changes
 * through Stock in, Stock out and Count stock. Barcode, description, brand, photo, price lists and prescription settings stay on
 * the current Products screen, and the form says so.
 */
const EditProductPage = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const access = useAccess();
  const user = useAppSelector((state) => state.auth.user);
  const { roles } = useRoleAccess();
  const mayEditOnline = onlineStoreAccess(roles).catalogue;
  const { warehouses } = useAppSelector((state) => state.warehouse);
  const categories = useCategories();
  const units = useUnits();
  const shopUnits = useShopUnits();
  const E = T.edit;
  const F = T.form;

  const [load, setLoad] = useState({ status: 'loading', product: null, canSeeCost: false });
  const [values, setValues] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [problems, setProblems] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [forceOpen, setForceOpen] = useState(false);
  const [askCancel, setAskCancel] = useState(false);

  const canSeeCost = load.canSeeCost && access.can('cost_of_goods');

  const open = useCallback(() => {
    let current = true;
    setLoad({ status: 'loading', product: null, canSeeCost: false });
    findProduct(code)
      .then((found) => {
        if (!current) return;
        if (!found) {
          setLoad({ status: 'missing', product: null, canSeeCost: false });
          return;
        }
        const start = formFromProduct(found.row, { canSeeCost: found.canSeeCost });
        setValues(start);
        setBaseline(start);
        setLoad({ status: 'ready', product: found.row, canSeeCost: found.canSeeCost });
      })
      .catch(() => current && setLoad({ status: 'error', product: null, canSeeCost: false }));
    return () => {
      current = false;
    };
  }, [code]);
  useEffect(() => open(), [open]);

  const set = (key) => (value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    setProblems((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const defaultStore = (user && user.default_warehouse) || (warehouses.find((w) => w.is_default) || {}).name || '';
  const company = user && (user.company || user.custom_company || user.company_name);

  const submit = async () => {
    const found = checkForm(values);
    if (Object.keys(found).length) {
      setProblems(found);
      if (MORE_FIELDS.some((key) => found[key])) setForceOpen(true);
      return;
    }
    const changes = changesFrom(values, baseline, { canSeeCost });
    if (Object.keys(changes).length === 0) {
      toast.success(E.nothingChanged);
      return;
    }
    if (changes.cost !== undefined && !defaultStore) {
      setProblems({ cost: E.needStore });
      setForceOpen(true);
      return;
    }
    setProblems({});
    setSaving(true);
    try {
      const product = await updateProduct({ code, changes, warehouse: defaultStore, company });
      invalidateQuery();
      toast.success(fill(E.saved, { name: product.item_name || values.name.trim() }));
      navigate(`${PRODUCTS_PATH}?open=${encodeURIComponent(code)}`);
    } catch (error) {
      setSaving(false);
      setProblems({ general: error instanceof ProductSaveError && error.message ? error.message : E.saveFailed });
    }
  };

  const dirty = values && baseline ? isEdited(values, baseline) : false;
  const errors = useMemo(() => summaryOf(problems), [problems]);
  const cancel = () => (dirty ? setAskCancel(true) : navigate(`${PRODUCTS_PATH}?open=${encodeURIComponent(code)}`));

  if (load.status === 'loading') {
    return (
      <div role="status" aria-label={E.loading} className="nl-products-formtop">
        <Skeleton width="100%" height="320px" radius="var(--radius-button)" />
      </div>
    );
  }
  if (load.status !== 'ready') {
    const failed = load.status === 'error';
    return (
      <EmptyState
        icon="alert"
        tone="error"
        title={failed ? E.loadFailed : E.notFound}
        action={failed ? { label: E.retry, onClick: open } : { label: E.back, onClick: () => navigate(PRODUCTS_PATH) }}
      />
    );
  }

  const profit = canSeeCost ? profitLine(values.price, values.cost) : '';
  const allCategories = categories.status === 'ready' ? categories.data.categories : [];
  const categoryChoices = [{ value: '', label: T.noCategory }, ...allCategories.filter((c) => c.name !== T.rootCategory).map((c) => ({ value: c.name, label: categoryLabel(c.name) }))];

  return (
    <>
      <FormPage title={E.title} subtitle={`${load.product.item_name}. ${E.subtitle}`} dirty={dirty} saved={saved} saving={saving} errors={errors} onSave={submit} onCancel={cancel}>
        <div id={FIELD_IDS.general} tabIndex={-1} className="nl-products-formtop" />
        <Field id={FIELD_IDS.name} label={F.name} value={values.name} error={problems.name} aria-required={true} autoComplete="off" onChange={set('name')} />
        <Field id={FIELD_IDS.price} kind="money" label={F.price} helper={F.priceHelper} value={values.price} error={problems.price} aria-required={true} onChange={set('price')} />

        <MoreOptions key={forceOpen ? 'open' : 'closed'} defaultOpen={forceOpen}>
          {canSeeCost ? (
            <div className="nl-products-formgroup">
              <Field id={FIELD_IDS.cost} kind="money" label={F.cost} helper={F.costHelper} value={values.cost} error={problems.cost} onChange={set('cost')} />
              {profit ? (
                <p className="nl-products-profit" role="status">
                  <Icon name="info" />
                  <span>{profit}</span>
                </p>
              ) : null}
            </div>
          ) : null}
          <UnitPicker id={FIELD_IDS.unit} label={F.unit} helper={F.unitHelper} value={values.unit} onChange={set('unit')} units={units} shop={shopUnits} />
          <Select id={FIELD_IDS.category} label={F.category} helper={categories.status === 'error' ? F.categoryError : undefined} options={categoryChoices} value={values.category} onChange={set('category')} />
          <Field id={FIELD_IDS.barcode} label={F.barcode} helper={E.barcodeHelper} value={values.barcode} readOnly />
          <Checkbox label={E.enabled} checked={values.enabled} onChange={set('enabled')} />
          <p className="nl-helper">{E.enabledHelper}</p>
          <p className="nl-products-note">
            {E.otherDetails}{' '}
            <a href={oldScreen('/products')}>{E.otherLink}</a>
          </p>
        </MoreOptions>
      </FormPage>

      {mayEditOnline ? <OnlineProductSection code={code} name={load.product.item_name} company={user && (user.company || user.custom_company)} /> : null}

      <ConfirmDialog
        open={askCancel}
        title={FT.leave.title}
        message={FT.leave.message}
        confirmLabel={FT.leave.leave}
        cancelLabel={FT.leave.stay}
        destructive
        onConfirm={() => navigate(`${PRODUCTS_PATH}?open=${encodeURIComponent(code)}`)}
        onCancel={() => setAskCancel(false)}
      />
    </>
  );
};

export default EditProductPage;
