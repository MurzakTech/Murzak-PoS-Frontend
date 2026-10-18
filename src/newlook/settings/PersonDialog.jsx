import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Dialog from '../components/Dialog';
import Field from '../components/Field';
import Select from '../components/Select';
import { addRoles, createPerson, removeRoles, updatePerson } from '../../api/teamApi';
import fill from '../labels/fill';
import { OLD, legacy } from './settingsModel';
import { TIERS, fieldForError, isLastOwner, personProblems, planTierChange, rolesForNewPerson } from './teamModel';
import T from './strings.settings';

const P = T.team.person;

const emptyValues = (member) => ({
  firstName: member ? member.first_name : '',
  lastName: member ? member.last_name : '',
  email: member ? member.email : '',
  phone: member ? member.phone : '',
  password: '',
  tier: member ? member.tier : 'cashier',
});

/**
 * Add a person, or change one (ticket P5-3), in a dialog. Adding asks for a name, the email they sign in with, a first
 * password and a role (Owner, Manager or Cashier). Changing asks for the name, the mobile number and the role. Every
 * problem shows beside its field. Only an owner can reach this (the server checks too).
 *
 * Changing the role gives the roles of the new kind first and only then takes the old ones away, with the same staff calls the
 * current Staff screen uses; other roles a person has are left alone. The password is used for the one call and is not kept.
 *
 *   member    the person being changed (null to add)
 *   members   everyone, to know whether this is the last owner
 *   tiers     what list_team sent: the roles of each kind
 *   me        the signed-in person's email (a person cannot change their own role)
 *   company   the business
 *   api       { create, update, add, remove } injectable for tests; default to the staff calls
 *   onClose   closes the dialog; onDone() is called after a save so the list is read again
 */
const PersonDialog = ({ member, members, tiers, me, company, onClose, onDone, api = {} }) => {
  const calls = { create: createPerson, update: updatePerson, add: addRoles, remove: removeRoles, ...api };
  const adding = !member;
  const start = useMemo(() => emptyValues(member), [member]);
  const [values, setValues] = useState(start);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const self = !adding && member.email === me;
  const lastOwner = !adding && isLastOwner(member, members);
  const tierLocked = self || lastOwner;
  const set = (key) => (value) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
    setError('');
  };

  const submit = async () => {
    const found = personProblems(values, adding);
    const shown = {};
    Object.keys(found).forEach((key) => {
      shown[key] = P[found[key]];
    });
    setErrors(shown);
    if (Object.keys(found).length) return;
    setSaving(true);
    setError('');
    try {
      if (adding) {
        await calls.create({ firstName: values.firstName.trim(), lastName: values.lastName.trim(), email: values.email.trim(), password: values.password, phone: values.phone.trim(), roles: rolesForNewPerson(values.tier, tiers), company });
      } else {
        if (values.firstName.trim() !== start.firstName || values.lastName.trim() !== start.lastName || values.phone.trim() !== start.phone) {
          await calls.update({ email: member.email, firstName: values.firstName.trim(), lastName: values.lastName.trim(), phone: values.phone.trim() });
        }
        if (values.tier !== member.tier) {
          const plan = planTierChange(member, values.tier, tiers);
          if (plan.add.length) await calls.add({ email: member.email, roles: plan.add });
          if (plan.remove.length) await calls.remove({ email: member.email, roles: plan.remove });
        }
      }
      onDone();
    } catch (e) {
      const field = fieldForError(e.message);
      if (field && field in values) setErrors({ [field]: e.message });
      else setError(e.message);
      setSaving(false);
    }
  };

  const tierOptions = TIERS.map((key) => ({ value: key, label: T.team.roles[key] }));
  const title = adding ? P.addTitle : fill(P.editTitle, { name: member.full_name });

  return (
    <Dialog
      open
      onClose={onClose}
      title={title}
      busy={saving}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {P.cancel}
          </Button>
          <Button onClick={submit} loading={saving}>
            {adding ? P.add : P.save}
          </Button>
        </>
      }
    >
      <form
        className="nl-settings-dialog"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (!saving) submit();
        }}
      >
        {error ? (
          <p className="nl-settings-error" role="alert">
            {error}
          </p>
        ) : null}
        <Field id="person-first-name" label={P.firstName} value={values.firstName} onChange={set('firstName')} error={errors.firstName} data-autofocus="" autoComplete="off" />
        <Field id="person-last-name" label={P.lastName} value={values.lastName} onChange={set('lastName')} error={errors.lastName} autoComplete="off" />
        <Field id="person-email" label={P.email} value={values.email} onChange={set('email')} error={errors.email} readOnly={!adding} helper={adding ? undefined : P.emailFixed} inputMode="email" autoComplete="off" />
        <Field id="person-phone" label={P.phone} value={values.phone} onChange={set('phone')} error={errors.phone} inputMode="tel" autoComplete="off" />
        {adding ? <Field id="person-password" label={P.password} helper={P.passwordHint} value={values.password} onChange={set('password')} error={errors.password} type="password" autoComplete="new-password" /> : null}
        <Select id="person-role" label={P.role} options={tierOptions} value={values.tier} onChange={set('tier')} disabled={tierLocked} helper={tierLocked ? (self ? T.team.people.yourself : T.team.people.lastOwner) : T.team.roleHints[values.tier]} />
        {!adding ? (
          <p className="nl-settings-hint">
            {P.fineTune}: <Link to={legacy(OLD.staff)}>{P.fineTuneLink}</Link>
          </p>
        ) : null}
      </form>
    </Dialog>
  );
};

export default PersonDialog;
