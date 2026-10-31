import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Button from '../components/Button';
import Checkbox from '../components/Checkbox';
import Dialog from '../components/Dialog';
import Icon from '../components/Icon';
import { useToast } from '../components/Toast';
import fill from '../labels/fill';
import { getStorePeople, setStorePeople } from '../../api/storesApi';
import { limitWords, namesList, peopleChange } from './stockModel';
import T from './strings.stock';

const D = T.peopleDialog;

/**
 * Who works here: the people of the business with a tick for each one who works at this store. The owner is told what
 * saving would do before it happens, because a person with no store chosen can use every store: ticking such a person
 * limits them to the stores chosen, and unticking the only store of a limited person lets them use every store again.
 *
 *   store          the store { name, warehouse_name }
 *   onSaved(result) called after a save
 */
const StorePeopleDialog = ({ open, onClose, store, onSaved }) => {
  const toast = useToast();
  const [state, setState] = useState({ status: 'loading', members: [], error: '' });
  const [chosen, setChosen] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState('');
  const label = store.warehouse_name || store.name;

  const load = useCallback(() => {
    setState({ status: 'loading', members: [], error: '' });
    getStorePeople(store.name)
      .then((members) => {
        setState({ status: 'ready', members, error: '' });
        setChosen(new Set(members.filter((m) => m.assigned).map((m) => m.user)));
      })
      .catch((error) => setState({ status: 'error', members: [], error: error.message }));
  }, [store.name]);
  useEffect(() => {
    load();
  }, [load]);

  const change = useMemo(() => peopleChange(state.members, chosen), [state.members, chosen]);
  const toggle = (user, on) =>
    setChosen((current) => {
      const next = new Set(current);
      if (on) next.add(user);
      else next.delete(user);
      return next;
    });

  const save = async () => {
    if (saving || !change.changed) return;
    setSaving(true);
    setFailure('');
    try {
      const result = await setStorePeople({ store: store.name, people: [...chosen] });
      const names = namesList(result.everywhere.map((user) => (state.members.find((m) => m.user === user) || { name: user }).name));
      toast.success(result.everywhere.length ? fill(D.savedFreed, { store: label, names }) : fill(D.saved, { store: label }));
      if (onSaved) onSaved(result);
      onClose();
    } catch (error) {
      setFailure(fill(D.failed, { reason: error.message }));
      setSaving(false);
    }
  };

  const ready = state.status === 'ready';
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={fill(D.title, { store: label })}
      description={D.description}
      busy={saving}
      footer={
        <>
          <Button variant="secondary" disabled={saving} onClick={onClose}>
            {D.cancel}
          </Button>
          <Button loading={saving} disabled={!ready || !change.changed} onClick={save} title={ready && !change.changed ? D.nothingChanged : undefined}>
            {D.save}
          </Button>
        </>
      }
    >
      <div className="nl-stock-form">
        {state.status === 'loading' ? <p className="nl-helper">{D.loading}</p> : null}
        {state.status === 'error' ? (
          <>
            <p className="nl-error" role="alert">
              <Icon name="alert" />
              <span>{fill(D.loadFailed, { reason: state.error })}</span>
            </p>
            <Button variant="secondary" onClick={load}>
              {D.retry}
            </Button>
          </>
        ) : null}
        {ready && state.members.length === 0 ? <p className="nl-helper">{D.none}</p> : null}
        {ready && state.members.length > 0 ? (
          <ul className="nl-stock-people" aria-label={D.listLabel}>
            {state.members.map((m) => (
              <li key={m.user}>
                <Checkbox label={m.name} checked={chosen.has(m.user)} onChange={(on) => toggle(m.user, on)} />
                <span className="nl-stock-sub">{limitWords(m.stores)}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {change.limited.length ? <p className="nl-helper">{fill(D.limitedNote, { names: namesList(change.limited) })}</p> : null}
        {change.freed.length ? <p className="nl-helper">{fill(D.freedNote, { names: namesList(change.freed) })}</p> : null}
        {failure ? (
          <p className="nl-error" role="alert">
            <Icon name="alert" />
            <span>{failure}</span>
          </p>
        ) : null}
      </div>
    </Dialog>
  );
};

export default StorePeopleDialog;
