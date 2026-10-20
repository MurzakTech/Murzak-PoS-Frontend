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
import { createCustomer, updateCustomer } from '../../api/customersListApi';
import { useAppSelector } from '../../store/hooks';
import { emptyForm, formFromCustomer, formProblems, isDirty, listAddress, TYPES, toServerValues } from './customersModel';
import { invalidateQuery, useCustomerOverview, useFormOptions } from './useCustomersData';
import './customers.css';
import T from './strings.customers';

const FIELD_IDS = { name: 'customer-name', mobile: 'customer-mobile', email: 'customer-email', taxId: 'customer-tax-id' };
const HIDDEN_FIELDS = ['email', 'taxId'];
const LIST = `${NEW_LOOK_PREFIX}/customers`;

/**
 * The New and Edit customer forms (ticket P4-7, acceptance check AC-26), built on the shared Form page. The fields are the till's
 * quick add: name, mobile number, optional email, optional KRA PIN and type. The group and area are shown under More options
 * only when the business really uses them (the server says so through `features`). Edit adds the Disabled box.
 *
 *   mode   'new' or 'edit'
 *   id     the customer number (edit only)
 */
const CustomerForm = ({ mode, id }) => {
  const editing = mode === 'edit';
  const navigate = useNavigate();
  const toast = useToast();
  const user = useAppSelector((s) => s.auth.user);
  const company = user && user.company;
  const options = useFormOptions(company);
  const overview = useCustomerOverview(editing ? id : '', company);
  const back = useRef(null);
  const [values, setValues] = useState(emptyForm());
  const [start, setStart] = useState(emptyForm());
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Editing: the form starts with the customer's own values
  useEffect(() => {
    if (editing && overview.status === 'ready') {
      const own = formFromCustomer(overview.data);
      setValues(own);
      setStart(own);
    }
  }, [editing, overview.status, overview.data]);

  const features = (options.status === 'ready' && options.data.features) || (overview.status === 'ready' && overview.data.features) || { groups: false, territories: false };
  const dirty = isDirty(values, start);
  const set = (key) => (value) => {
    setValues((v) => ({ ...v, [key]: value }));
    setSaved(false);
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const goBack = () => back.current && back.current.click();

  const submit = async (andAdd) => {
    const original = editing ? start : null;
    const found = formProblems(values, original);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      const send = toServerValues(values, original);
      let savedId = id;
      if (editing) await updateCustomer({ id, company, disabled: values.disabled, ...send });
      else savedId = (await createCustomer({ ...send, company })).id;
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
      else toast.error(e.message || T.form.failed);
    } finally {
      setSaving(false);
    }
  };

  if (editing && overview.status === 'error') {
    return (
      <div className="nl-customer-form-state">
        <PageHeader title={T.form.editTitle} />
        <EmptyState icon="alert" tone="error" title={T.form.loadFailed} description={T.form.loadFailedText} action={{ label: T.form.retry, onClick: overview.reload }} />
      </div>
    );
  }
  if (editing && overview.status !== 'ready') {
    return (
      <div className="nl-customer-form-state">
        <PageHeader title={T.form.editTitle} />
        <SkeletonText lines={5} />
      </div>
    );
  }

  const errorList = Object.entries(errors)
    .filter(([, message]) => message)
    .map(([key, message]) => ({ id: FIELD_IDS[key], message }));
  const hiddenProblem = HIDDEN_FIELDS.some((key) => errors[key]);
  const choices = (names) => [{ value: '', label: T.noValue }, ...names.map((value) => ({ value, label: value }))];

  return (
    <FormPage
      title={editing ? T.form.editTitle : T.form.newTitle}
      subtitle={editing ? fill(T.form.editSubtitle, { name: start.name }) : T.form.newSubtitle}
      dirty={dirty}
      saved={saved}
      saving={saving}
      errors={errorList}
      saveLabel={T.form.saveLabel}
      onSave={() => submit(false)}
      onSaveAndAdd={editing ? undefined : () => submit(true)}
      onCancel={goBack}
    >
      <Link ref={back} to={LIST} className="nl-customer-form__back">
        {T.form.backToList}
      </Link>
      <Field id={FIELD_IDS.name} label={T.form.name} value={values.name} error={errors.name} onChange={set('name')} autoComplete="off" />
      <Field id={FIELD_IDS.mobile} label={T.form.mobile} helper={T.form.mobileHelp} type="tel" inputMode="tel" autoComplete="off" value={values.mobile} error={errors.mobile} onChange={set('mobile')} />
      <Select id="customer-type" label={T.form.type} options={TYPES.map((value) => ({ value, label: T.types[value] }))} value={values.type} onChange={set('type')} />
      {editing ? <Checkbox label={T.form.disabled} checked={values.disabled} onChange={set('disabled')} aria-describedby="customer-disabled-help" /> : null}
      {editing ? (
        <p id="customer-disabled-help" className="nl-helper">
          {T.form.disabledHelp}
        </p>
      ) : null}
      <MoreOptions key={hiddenProblem ? 'open' : 'closed'} defaultOpen={hiddenProblem}>
        <Field id={FIELD_IDS.email} label={T.form.email} type="email" autoComplete="off" value={values.email} error={errors.email} onChange={set('email')} />
        <Field id={FIELD_IDS.taxId} label={T.form.kraPin} helper={T.form.kraPinHelp} autoComplete="off" value={values.taxId} error={errors.taxId} onChange={set('taxId')} />
        {features.groups ? <Select id="customer-group" label={T.form.group} options={choices(options.status === 'ready' ? options.data.groups : [])} value={values.group} onChange={set('group')} /> : null}
        {features.territories ? <Select id="customer-area" label={T.form.area} options={choices(options.status === 'ready' ? options.data.territories : [])} value={values.area} onChange={set('area')} /> : null}
      </MoreOptions>
    </FormPage>
  );
};

export default CustomerForm;
