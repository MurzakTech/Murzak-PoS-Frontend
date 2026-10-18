import React, { useEffect, useState } from 'react';
import Button from '../components/Button';
import Dialog from '../components/Dialog';
import Select from '../components/Select';
import { useToast } from '../components/Toast';
import { DEFAULT_LANGUAGES, getLanguages, setLanguage } from '../../api/languageApi';
import T from './strings.language';

/**
 * The Language choice from the account menu. The choice is kept on the server, so the messages it sends (errors, confirmations,
 * printed documents) come in that language on every device the person signs in on. The words on the screens do not change.
 */
const LanguageDialog = ({ open, onClose }) => {
  const toast = useToast();
  const [languages, setLanguages] = useState(DEFAULT_LANGUAGES);
  const [choice, setChoice] = useState('en');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    let current = true;
    setError('');
    getLanguages()
      .then((r) => {
        if (!current) return;
        setLanguages(r.languages);
        setChoice(r.current);
      })
      .catch(() => current && setError(T.loadFailed));
    return () => {
      current = false;
    };
  }, [open]);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await setLanguage(choice);
      toast.success(T.saved);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={T.title}
      description={T.description}
      busy={saving}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {T.cancel}
          </Button>
          <Button onClick={save} loading={saving}>
            {T.save}
          </Button>
        </>
      }
    >
      <Select label={T.label} options={languages.map((l) => ({ value: l.code, label: l.name }))} value={choice} error={error || undefined} onChange={setChoice} data-autofocus />
    </Dialog>
  );
};

export default LanguageDialog;
