import React from 'react';
import Field from '../components/Field';
import { SAVED_SECRET } from '../../api/paymentGatewayApi';
import T from './strings.settings';

/**
 * A box for a key or secret. It is always a password box, so it is never drawn in the open. A key that is already saved is not
 * sent back to the browser: the box is empty and says "Saved"; the server's "***" stays in the form's value until a new one is
 * typed, and if the new one is typed away again the saved key is kept.
 *
 *   value    the form's value: the typed text, or "***" for a saved key left alone
 *   wasSaved whether the server already holds this key
 */
const SecretField = ({ id, label, helper, value, wasSaved = false, onChange, error, disabled = false }) => {
  const untouched = value === SAVED_SECRET;
  return (
    <Field
      id={id}
      label={label}
      type="password"
      autoComplete="new-password"
      spellCheck={false}
      value={untouched ? '' : value}
      placeholder={untouched ? '••••••••' : undefined}
      helper={untouched ? T.mpesa.savedKey : helper}
      error={error}
      disabled={disabled}
      onChange={(typed) => onChange(typed === '' && wasSaved ? SAVED_SECRET : typed)}
    />
  );
};

export default SecretField;
