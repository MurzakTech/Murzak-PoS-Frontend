import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Checkbox from '../components/Checkbox';
import Dialog from '../components/Dialog';
import Field from '../components/Field';
import Icon from '../components/Icon';
import { addRoles, createPerson, removeRoles, updatePerson } from '../../api/teamApi';
import fill from '../labels/fill';
import { OLD, legacy } from './settingsModel';
import { formatPhone } from '../labels/renameMap';
import RolePicker from './RolePicker';
import { fieldForError, isLastOwner, makePassword, personProblems, planTierChange, rolesForNewPerson } from './teamModel';
import T from './strings.settings';

const P = T.team.person;

const emptyValues = (member) => ({
  firstName: member ? member.first_name : '',
  lastName: member ? member.last_name : '',
  email: member ? member.email : '',
  phone: member ? formatPhone(member.phone || '') : '',
  password: '',
  tier: member ? member.tier : 'cashier',
});

/** Puts text on the clipboard; false when the browser will not let it (the person is then told to copy it by hand). */
const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Add a person, or change one (ticket P5-3), in a dialog.
 *
 * Adding asks for a name, the email they sign in with, what they will do (Owner, Manager or Cashier, as three cards that say what
 * each can do), a first password (typed, or made for them with one press) and, last, an optional mobile number. When the person
 * is added, the dialog shows what to give them (the email and the first password, with a Copy button), because the password is
 * not kept anywhere else; the person presses Done to close it. Changing asks for the name, the mobile number and the role.
 * Every problem shows beside its field. Only an owner can reach this (the server checks too).
 *
 * Changing the role gives the roles of the new kind first and only then takes the old ones away, with the same staff calls the
 * current Staff screen uses; other roles a person has are left alone.
 *
 *   member    the person being changed (null to add)
 *   members   everyone, to know whether this is the last owner
 *   tiers     what list_team sent: the roles of each kind
 *   me        the signed-in person's email (a person cannot change their own role)
 *   company   the business
 *   api       { create, update, add, remove } injectable for tests; default to the staff calls
 *   onClose   closes the dialog without a change
 *   onDone    called when the person is finished with the dialog after a change (on Done, once a person was added)
 *   onSaved   called as soon as a person is added, so the list is read again while the first-password page is still open
 */
const PersonDialog = ({ member, members, tiers, me, company, onClose, onDone, onSaved, api = {} }) => {
  const calls = { create: createPerson, update: updatePerson, add: addRoles, remove: removeRoles, ...api };
  const adding = !member;
  const start = useMemo(() => emptyValues(member), [member]);
  const [values, setValues] = useState(start);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [added, setAdded] = useState(null); // { name, email, password, tier } once a person has been added
  const [copied, setCopied] = useState('');

  const self = !adding && member.email === me;
  const lastOwner = !adding && isLastOwner(member, members);
  const tierLocked = self || lastOwner;
  const set = (key) => (value) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
    setError('');
  };

  const makeOne = () => {
    set('password')(makePassword());
    setShowPassword(true);
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
        // The first password is shown once, on the next page, and kept nowhere after that
        setAdded({ name: `${values.firstName.trim()} ${values.lastName.trim()}`.trim(), email: values.email.trim(), password: values.password, tier: values.tier });
        setSaving(false);
        if (onSaved) onSaved();
        return;
      }
      if (values.firstName.trim() !== start.firstName || values.lastName.trim() !== start.lastName || values.phone.trim() !== start.phone) {
        await calls.update({ email: member.email, firstName: values.firstName.trim(), lastName: values.lastName.trim(), phone: values.phone.trim() === start.phone ? member.phone : values.phone.trim() });
      }
      if (values.tier !== member.tier) {
        const plan = planTierChange(member, values.tier, tiers);
        if (plan.add.length) await calls.add({ email: member.email, roles: plan.add });
        if (plan.remove.length) await calls.remove({ email: member.email, roles: plan.remove });
      }
      onDone();
    } catch (e) {
      const field = fieldForError(e.message);
      if (field && field in values) setErrors({ [field]: e.message });
      else setError(e.message);
      setSaving(false);
    }
  };

  const copy = async () => {
    const ok = await copyText(fill(P.copyText, { email: added.email, password: added.password }));
    setCopied(ok ? 'yes' : 'no');
  };

  // ---------- The page shown once a person has been added ----------
  if (added) {
    return (
      <Dialog
        open
        onClose={onDone}
        title={fill(P.addedTitle, { name: added.name })}
        footer={
          <>
            <Button variant="secondary" onClick={copy}>
              {copied === 'yes' ? P.copied : P.copy}
            </Button>
            <Button onClick={onDone}>{P.done}</Button>
          </>
        }
      >
        <div className="nl-settings-dialog">
          <p className="nl-settings-hint">{P.addedText}</p>
          <dl className="nl-settings-added">
            <div>
              <dt className="nl-label">{P.addedEmail}</dt>
              <dd>{added.email}</dd>
            </div>
            <div>
              <dt className="nl-label">{P.addedPassword}</dt>
              <dd className="nl-settings-added__secret">{added.password}</dd>
            </div>
            <div>
              <dt className="nl-label">{P.addedRole}</dt>
              <dd>{T.team.roles[added.tier]}</dd>
            </div>
          </dl>
          {copied === 'no' ? (
            <p className="nl-settings-error" role="alert">
              <Icon name="alert" />
              <span>{P.copyFailed}</span>
            </p>
          ) : null}
        </div>
      </Dialog>
    );
  }

  const title = adding ? P.addTitle : fill(P.editTitle, { name: member.full_name });
  const lockedNote = tierLocked ? (self ? T.team.people.yourself : T.team.people.lastOwner) : undefined;

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
        <RolePicker label={P.role} value={values.tier} onChange={set('tier')} disabled={tierLocked} note={lockedNote} />
        {adding ? (
          <div className="nl-settings-password">
            <Field id="person-password" label={P.password} helper={P.passwordHint} value={values.password} onChange={set('password')} error={errors.password} type={showPassword ? 'text' : 'password'} autoComplete="new-password" />
            <div className="nl-settings-password__tools">
              <Button variant="secondary" size="small" onClick={makeOne}>
                {P.makePassword}
              </Button>
              <Checkbox label={P.showPassword} checked={showPassword} onChange={setShowPassword} />
            </div>
          </div>
        ) : null}
        <Field id="person-phone" label={P.phone} value={values.phone} onChange={set('phone')} error={errors.phone} inputMode="tel" autoComplete="off" />
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
