import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { Chip } from '../components/Chip';
import { ConfirmDialog } from '../components/Dialog';
import Field from '../components/Field';
import Icon from '../components/Icon';
import Select from '../components/Select';
import { useToast } from '../components/Toast';
import { useAccess } from '../access/AccessProvider';
import { FormPage, MoreOptions } from '../forms';
import FT from '../forms/strings.forms';
import fill from '../labels/fill';
import { createProduct, ProductSaveError } from '../../api/productsListApi';
import './products.css';
import CategoryDialog from './CategoryDialog';
import { useCategories, useUnits } from './useProductsData';
import { checkForm, chipCategories, cleanQuantity, EMPTY_FORM, FIELD_IDS, FIELD_ORDER, freshForm, isDirty, MORE_FIELDS, PRODUCTS_PATH, profitLine, requestFrom, summaryOf, unitOptions } from './productsModel';
import T from './strings.products';

/**
 * The one-screen New product form (tickets P4-1, acceptance check AC-26). Only the name and the price are needed; the rest
 * sits under More options: cost price (owners and managers) with the profit per item, opening stock, low-stock warning,
 * unit, category chips, barcode, and the product code, which the server fills in. Built on the Form page pattern: errors beside
 * the field and in the summary, "Not saved yet" until saved, a question before leaving with unsaved changes.
 */
const NewProductPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const access = useAccess();
  const canSeeCost = access.can('cost_of_goods');
  const categories = useCategories();
  const units = useUnits();

  const [values, setValues] = useState(EMPTY_FORM);
  const [baseline, setBaseline] = useState(EMPTY_FORM);
  const [problems, setProblems] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [forceOpen, setForceOpen] = useState(false);
  const [askCancel, setAskCancel] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [showAllChips, setShowAllChips] = useState(false);
  const [focusId, setFocusId] = useState(FIELD_IDS.name);

  const dirty = isDirty(values, baseline);
  const F = T.form;

  // The keyboard goes where the page asks, once the screen has been redrawn (a field under More options may have just opened)
  useEffect(() => {
    if (!focusId) return;
    const el = document.getElementById(focusId);
    if (el && el.focus) el.focus();
    setFocusId(null);
  }, [focusId]);

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

  const show = (found) => {
    setProblems(found);
    if (MORE_FIELDS.some((key) => found[key])) setForceOpen(true);
    const first = FIELD_ORDER.find((key) => found[key]);
    if (first) setFocusId(FIELD_IDS[first]);
  };

  const submit = async (addAnother) => {
    const found = checkForm(values);
    if (Object.keys(found).length) {
      show(found);
      return;
    }
    setProblems({});
    setSaving(true);
    try {
      const result = await createProduct(requestFrom(values, { canSeeCost }));
      const name = result.product ? result.product.item_name : values.name.trim();
      toast.success(fill(addAnother ? F.savedAnother : F.saved, { name }));
      result.notes.forEach((note) => toast.error(note.message));
      if (addAnother) {
        const next = freshForm({ unit: values.unit, category: values.category });
        setValues(next);
        setBaseline(next);
        setSaved(true);
        setSaving(false);
        setFocusId(FIELD_IDS.name);
      } else {
        navigate(`${PRODUCTS_PATH}?open=${encodeURIComponent(result.product.item_code)}`);
      }
    } catch (error) {
      setSaving(false);
      if (error instanceof ProductSaveError && Object.keys(error.fields).length) show(error.fields);
      else show({ general: error.message || F.saveFailed });
    }
  };

  const errors = useMemo(() => summaryOf(problems), [problems]);

  const profit = canSeeCost ? profitLine(values.price, values.cost) : '';
  const unitChoices = useMemo(() => unitOptions(units.status === 'ready' ? units.data : []), [units.status, units.data]);
  const allCategories = categories.status === 'ready' ? categories.data.categories : [];
  const chips = chipCategories(allCategories, values.category, { showAll: showAllChips });
  const hiddenChips = allCategories.filter((c) => c.name !== T.rootCategory).length - chips.length;

  const cancel = () => (dirty ? setAskCancel(true) : navigate(PRODUCTS_PATH));

  return (
    <>
      <FormPage title={F.title} subtitle={F.subtitle} dirty={dirty} saved={saved} saving={saving} errors={errors} onSave={() => submit(false)} onSaveAndAdd={() => submit(true)} onCancel={cancel}>
        <div id={FIELD_IDS.general} tabIndex={-1} className="nl-products-formtop" />
        <Field id={FIELD_IDS.name} label={F.name} placeholder={F.namePlaceholder} value={values.name} error={problems.name} aria-required={true} autoComplete="off" onChange={set('name')} />
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
          <Field id={FIELD_IDS.stock} inputMode="decimal" label={F.stock} helper={F.stockHelper} value={values.stock} error={problems.stock} onChange={(v) => set('stock')(cleanQuantity(v))} />
          <Field id={FIELD_IDS.warning} inputMode="decimal" label={F.warning} helper={F.warningHelper} value={values.warning} error={problems.warning} onChange={(v) => set('warning')(cleanQuantity(v))} />
          <Select id={FIELD_IDS.unit} label={F.unit} helper={units.status === 'error' ? F.unitsFailed : F.unitHelper} options={unitChoices} value={values.unit} error={problems.unit} onChange={set('unit')} />

          <div className="nl-products-chips" role="group" aria-labelledby="np-category-label" id={FIELD_IDS.category} tabIndex={-1}>
            <span id="np-category-label" className="nl-label">
              {F.category}
            </span>
            {categories.status === 'error' ? (
              <p className="nl-products-note">
                {F.categoryError}{' '}
                <Button variant="ghost" size="small" onClick={categories.reload}>
                  {F.categoryRetry}
                </Button>
              </p>
            ) : (
              <ul className="nl-products-chips__list">
                {chips.map((c) => {
                  const chosen = values.category === c.name;
                  return (
                    <li key={c.name}>
                      <button type="button" className="nl-products-chip" aria-pressed={chosen} onClick={() => set('category')(chosen ? '' : c.name)}>
                        <Chip tone={chosen ? 'brand' : 'neutral'} icon={chosen ? 'check' : undefined}>
                          {c.name}
                        </Chip>
                      </button>
                    </li>
                  );
                })}
                <li>
                  <Button variant="ghost" size="small" icon="plus" onClick={() => setAddingCategory(true)}>
                    {F.addCategory}
                  </Button>
                </li>
              </ul>
            )}
            {hiddenChips > 0 || showAllChips ? (
              <Button variant="ghost" size="small" onClick={() => setShowAllChips((v) => !v)}>
                {showAllChips ? F.categoryLess : F.categoryMore}
              </Button>
            ) : null}
            {problems.category ? (
              <p className="nl-error">
                <Icon name="alert" />
                <span>{problems.category}</span>
              </p>
            ) : (
              <p className="nl-helper">{allCategories.length || categories.status !== 'ready' ? F.categoryHelper : `${F.categoryNone} ${F.addCategoryHelp}`}</p>
            )}
          </div>

          <Field id={FIELD_IDS.barcode} label={F.barcode} helper={F.barcodeHelper} value={values.barcode} error={problems.barcode} autoComplete="off" onChange={set('barcode')} />
          <Field id="np-code" label={F.code} helper={F.codeHelper} value={F.codeAuto} readOnly />
        </MoreOptions>
      </FormPage>

      <CategoryDialog
        open={addingCategory}
        categories={allCategories}
        onClose={() => setAddingCategory(false)}
        onDone={({ name }) => {
          setAddingCategory(false);
          categories.reload();
          set('category')(name);
        }}
      />
      <ConfirmDialog
        open={askCancel}
        title={FT.leave.title}
        message={FT.leave.message}
        confirmLabel={FT.leave.leave}
        cancelLabel={FT.leave.stay}
        destructive
        onConfirm={() => navigate(PRODUCTS_PATH)}
        onCancel={() => setAskCancel(false)}
      />
    </>
  );
};

export default NewProductPage;
