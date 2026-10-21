import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Checkbox from '../components/Checkbox';
import EmptyState from '../components/EmptyState';
import Field from '../components/Field';
import Select from '../components/Select';
import { SkeletonText } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { FormPage, MoreOptions } from '../forms';
import { NEW_LOOK_PREFIX } from '../redirects/engine';
import { PageHeader } from '../shell';
import fill from '../labels/fill';
import { createSupplier, updateSupplier } from '../../api/suppliersListApi';
import { useAppSelector } from '../../store/hooks';
import { emptyForm, formFromSupplier, formProblems, isDirty, listAddress, toServerValues, TYPES } from './suppliersModel';
import { invalidateQuery, useSupplierGroups, useSupplierOverview } from './useSuppliersData';
import './suppliers.css';
import T from './strings.suppliers';

const FIELD_IDS = { name: 'supplier-name', currency: 'supplier-currency', taxId: 'supplier-tax-id' };
const HIDDEN_FIELDS = ['currency'];
const LIST = `${NEW_LOOK_PREFIX}/suppliers`;

/**
 * The Add and Edit supplier forms (ticket P4-6, acceptance check AC-26), built on the shared Form page. The name comes first and is
 * the only thing needed; Type and Tax ID or PIN follow, and the supplier group, country, default currency and Internal supplier sit
 * under More options. Edit adds the Enabled box (a Checkbox: the shared Switch says "Saved at once", which would contradict
 * "Not saved yet"). The server does not change the type or the internal flag of a saved supplier, so Edit shows them but does not
 * let them be changed. Phone and email are not asked: the current supplier record does not store them.
 *
 *   mode   'new' or 'edit'
 *   id     the supplier number (edit only)
 */
const SupplierForm = ({ mode, id }) => {
  const editing = mode === 'edit';
  const navigate = useNavigate();
  const toast = useToast();
  const user = useAppSelector((s) => s.auth.user);
  const company = user && user.company;
  const groups = useSupplierGroups();
  const overview = useSupplierOverview(editing ? id : '', company);
  const back = useRef(null);
  const [values, setValues] = useState(emptyForm());
  const [start, setStart] = useState(emptyForm());
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  // Editing waits until the supplier's own values are in the form, so the default values never flash on screen
  const [filled, setFilled] = useState(!editing);

  // Editing: the form starts with the supplier's own values
  useEffect(() => {
    if (editing && overview.status === 'ready') {
      const own = formFromSupplier(overview.data);
      setValues(own);
      setStart(own);
      setFilled(true);
    }
  }, [editing, overview.status, overview.data]);

  const dirty = isDirty(values, start);
  const set = (key) => (value) => {
    setValues((v) => ({ ...v, [key]: value }));
    setSaved(false);
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const goBack = () => back.current && back.current.click();

  const submit = async (andAdd) => {
    const found = formProblems(values);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      const send = toServerValues(values);
      let savedId = id;
      if (editing) {
        await updateSupplier({ id, name: send.name, group: send.group, taxId: send.taxId, country: send.country, currency: send.currency, disabled: !values.enabled });
      } else {
        savedId = (await createSupplier({ ...send, company })).id;
      }
      invalidateQuery('suppliers');
      invalidateQuery();
      toast.success(fill(andAdd ? T.form.savedAdd : T.form.saved, { name: send.name }));
      setSaved(true);
      if (andAdd) {
        // Save and add another: a clean form that keeps the type, and the keyboard back on the name
        const fresh = { ...emptyForm(), type: values.type };
        setValues(fresh);
        setStart(fresh);
        const first = document.getElementById(FIELD_IDS.name);
        if (first) first.focus();
      } else {
        setStart(values);
        navigate(listAddress(LIST, savedId));
      }
    } catch (e) {
      if (e.code === 'duplicate') setErrors({ name: fill(T.form.duplicate, { name: values.name.trim() }) });
      else if (/currency/i.test(e.message || '')) setErrors({ currency: e.message });
      else toast.error(e.message || T.form.failed);
    } finally {
      setSaving(false);
    }
  };

  if (editing && overview.status === 'error') {
    return (
      <div className="nl-supplier-form-state">
        <PageHeader title={T.form.editTitle} />
        <EmptyState icon="alert" tone="error" title={T.form.loadFailed} description={T.form.loadFailedText} action={{ label: T.form.retry, onClick: overview.reload }} />
      </div>
    );
  }
  if (editing && (overview.status !== 'ready' || !filled)) {
    return (
      <div className="nl-supplier-form-state">
        <PageHeader title={T.form.editTitle} />
        <SkeletonText lines={5} />
      </div>
    );
  }

  const errorList = Object.entries(errors)
    .filter(([, message]) => message)
    .map(([key, message]) => ({ id: FIELD_IDS[key], message }));
  const hiddenProblem = HIDDEN_FIELDS.some((key) => errors[key]);
  const groupChoices = [{ value: '', label: T.form.groupNone }, ...(groups.status === 'ready' ? groups.data : [])];

  return (
    <FormPage
      title={editing ? T.form.editTitle : T.form.newTitle}
      subtitle={editing ? fill(T.form.editSubtitle, { name: start.name }) : T.form.newSubtitle}
      dirty={dirty}
      saved={saved}
      saving={saving}
      errors={errorList}
      saveLabel={T.form.save}
      onSave={() => submit(false)}
      onSaveAndAdd={editing ? undefined : () => submit(true)}
      onCancel={goBack}
    >
      <Link ref={back} to={LIST} className="nl-supplier-form__back">
        {T.form.backToList}
      </Link>
      <Field id={FIELD_IDS.name} label={T.form.name} value={values.name} error={errors.name} onChange={set('name')} autoComplete="off" />
      <Select id="supplier-type" label={T.form.type} options={TYPES.map((value) => ({ value, label: T.types[value] }))} value={values.type} onChange={set('type')} disabled={editing} helper={editing ? T.form.typeFixed : undefined} />
      <Field id={FIELD_IDS.taxId} label={T.form.taxId} helper={T.form.taxIdHelp} autoComplete="off" value={values.taxId} onChange={set('taxId')} />
      {editing ? <Checkbox label={T.form.enabled} checked={values.enabled} onChange={set('enabled')} aria-describedby="supplier-enabled-help" /> : null}
      {editing ? (
        <p id="supplier-enabled-help" className="nl-helper">
          {T.form.enabledHelp}
        </p>
      ) : null}
      <MoreOptions key={hiddenProblem ? 'open' : 'closed'} defaultOpen={hiddenProblem}>
        <Select id="supplier-group" label={T.form.group} options={groupChoices} value={values.group} onChange={set('group')} />
        <Field id="supplier-country" label={T.form.country} autoComplete="off" value={values.country} onChange={set('country')} />
        <Field id={FIELD_IDS.currency} label={T.form.currency} helper={T.form.currencyHelp} autoComplete="off" value={values.currency} error={errors.currency} onChange={set('currency')} />
        <Checkbox label={T.form.internal} checked={values.internal} onChange={set('internal')} disabled={editing} aria-describedby="supplier-internal-help" />
        <p id="supplier-internal-help" className="nl-helper">
          {editing ? T.form.internalFixed : T.form.internalHelp}
        </p>
      </MoreOptions>
    </FormPage>
  );
};

export default SupplierForm;
