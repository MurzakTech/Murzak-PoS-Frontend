import React, { useEffect, useMemo, useState } from 'react';
import SettingsCard from './SettingsCard';
import { CARDS, cardChanged, companyWith, problems, valuesFromCompany } from './businessModel';
import T from './strings.settings';

/**
 * One of the three Business cards. It holds only its own fields; saving sends the whole company (the server call takes the
 * whole company) with this card's values written over what was last saved, so another card's unsaved typing is never sent.
 *
 *   card       'details', 'address' or 'contact'
 *   company    the details as last saved
 *   save       sends a company to the server and resolves when it is saved
 *   onSaved    told the company that was saved
 *   children   (form) => the fields; form is { values, set, errors, readOnly, id }
 */
const CompanyCard = ({ card, title, subtitle, company, save, onSaved, canEdit, highlighted, children }) => {
  const base = useMemo(() => valuesFromCompany(company), [company]);
  const [values, setValues] = useState(base);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // This card's saved details changed (after its own save): start from them. Another card's save leaves typing here alone
  const savedKey = JSON.stringify(CARDS[card].map((key) => base[key]));
  useEffect(() => {
    setValues(base);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey]);

  const dirty = cardChanged(card, values, base);
  const set = (key) => (value) => {
    setValues((v) => ({ ...v, [key]: value }));
    setSaved(false);
    setError('');
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = async () => {
    const found = problems(card, values);
    const shown = {};
    Object.keys(found).forEach((key) => {
      shown[key] = T.business[card][found[key]];
    });
    setErrors(shown);
    if (Object.keys(found).length) return;
    setSaving(true);
    setError('');
    try {
      const sent = await save(companyWith(company, card, values));
      setSaved(true);
      onSaved(sent);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsCard
      id={`business-${card}`}
      title={title}
      subtitle={subtitle}
      dirty={dirty}
      saved={saved}
      saving={saving}
      error={error}
      canEdit={canEdit}
      highlighted={highlighted}
      onSave={submit}
      onUndo={() => {
        setValues(base);
        setErrors({});
        setError('');
      }}
    >
      {children({ values, set, errors, readOnly: !canEdit || saving, id: (key) => `business-${card}-${key}` })}
    </SettingsCard>
  );
};

export default CompanyCard;
