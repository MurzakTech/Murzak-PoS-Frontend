import React, { useEffect, useState } from 'react';
import Button from '../components/Button';
import { Chip } from '../components/Chip';
import Dialog from '../components/Dialog';
import Field from '../components/Field';
import Icon from '../components/Icon';
import { checkSignIn, setPersonPassword } from '../../api/teamApi';
import fill from '../labels/fill';
import { makeStrongPassword } from './teamModel';
import T from './strings.settings';

const S = T.team.people.signIn;
const W = T.team.people.password;
const ICON = { green: 'check', amber: 'alert', red: 'x' };

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    return false;
  }
};

/** "Can this person sign in?": the server's plain checks of the account, each with what to do when it is not fine. */
export const SignInCheckDialog = ({ member, onClose, onSetPassword, check = checkSignIn }) => {
  const [state, setState] = useState({ status: 'loading', report: null, message: '' });
  useEffect(() => {
    let live = true;
    check(member.email)
      .then((report) => live && setState({ status: 'ready', report, message: '' }))
      .catch((e) => live && setState({ status: 'error', report: null, message: e.message || S.failed }));
    return () => {
      live = false;
    };
  }, [member.email, check]);

  const report = state.report;
  return (
    <Dialog
      open
      onClose={onClose}
      title={fill(S.title, { name: member.full_name })}
      footer={
        <>
          <Button variant="secondary" onClick={() => onSetPassword(member)}>
            {S.setPassword}
          </Button>
          <Button onClick={onClose}>{S.close}</Button>
        </>
      }
    >
      <div className="nl-settings-dialog">
        <p className="nl-settings-hint">{S.text}</p>
        {state.status === 'loading' ? <p className="nl-settings-hint" role="status">{S.checking}</p> : null}
        {state.status === 'error' ? (
          <p className="nl-settings-error" role="alert">
            <Icon name="alert" />
            <span>{state.message}</span>
          </p>
        ) : null}
        {report ? (
          <>
            <p className="nl-settings-hint" role="status">{report.ok ? S.ok : report.summary}</p>
            <ul className="nl-signin-checks">
              {report.checks.map((item) => (
                <li key={item.id}>
                  <Chip icon={ICON[item.status] || 'alert'}>{S.status[item.status] || item.status}</Chip> <strong>{item.title}</strong>
                  <div>{item.detail}</div>
                  {item.status !== 'green' && item.fix ? <div className="nl-settings-hint">{item.fix}</div> : null}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </Dialog>
  );
};

/** The owner sets a new password for a person; it is shown once and never kept. */
export const SetPasswordDialog = ({ member, onClose, setPassword = setPersonPassword, suggest = makeStrongPassword }) => {
  const [password, setValue] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null); // the password once it was set
  const [copied, setCopied] = useState('');

  const save = async () => {
    if (password.length < 8) {
      setError(W.tooShort);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await setPassword({ email: member.email, password });
      setSaved(password);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const copy = async () => {
    const ok = await copyText(fill(W.copyText, { email: member.email, password: saved }));
    setCopied(ok ? 'yes' : 'no');
  };

  if (saved) {
    return (
      <Dialog
        open
        onClose={onClose}
        title={fill(W.title, { name: member.full_name })}
        footer={
          <>
            <Button variant="secondary" onClick={copy}>
              {copied === 'yes' ? W.copied : W.copy}
            </Button>
            <Button onClick={onClose}>{W.done}</Button>
          </>
        }
      >
        <div className="nl-settings-dialog">
          <p className="nl-settings-notice" role="status">{fill(W.saved, { name: member.full_name })}</p>
          <dl className="nl-settings-added">
            <div>
              <dt className="nl-label">{T.team.person.addedEmail}</dt>
              <dd>{member.email}</dd>
            </div>
            <div>
              <dt className="nl-label">{W.label}</dt>
              <dd className="nl-settings-added__secret">{saved}</dd>
            </div>
          </dl>
          {copied === 'no' ? (
            <p className="nl-settings-error" role="alert">
              <Icon name="alert" />
              <span>{W.copyFailed}</span>
            </p>
          ) : null}
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={fill(W.title, { name: member.full_name })}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {W.cancel}
          </Button>
          <Button onClick={save} loading={saving}>
            {W.save}
          </Button>
        </>
      }
    >
      <div className="nl-settings-dialog">
        <p className="nl-settings-hint">{W.text}</p>
        <Field id="new-password" label={W.label} helper={W.helper} value={password} onChange={setValue} error={error} autoComplete="new-password" data-autofocus="" />
        <Button variant="secondary" onClick={() => setValue(suggest())}>
          {W.suggest}
        </Button>
      </div>
    </Dialog>
  );
};
