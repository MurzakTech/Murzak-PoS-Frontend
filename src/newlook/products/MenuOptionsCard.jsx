import React, { useEffect, useState } from 'react';
import Button from '../components/Button';
import Card from '../components/Card';
import Checkbox from '../components/Checkbox';
import Field from '../components/Field';
import Icon from '../components/Icon';
import { SkeletonText } from '../components/Skeleton';
import { listMenuOptions, setMenuOptions } from '../../api/industryApi';
import fill from '../labels/fill';
import { fromEditor, toEditor } from '../../utils/menuOptions';
import T from '../industry/strings.industry';

const W = T.menuOptions;
const blankGroup = () => ({ name: '', required: false, multiple: false, choices: '' });

/**
 * Edit product, restaurants and bars: the dish's menu options. Each group is a name, whether the waiter must choose,
 * whether several can be chosen, and its choices as one comma-separated line ("Extra cheese +50" adds 50 to the price).
 * Saved on its own, so the product form above is not touched.
 *
 *   load, save   injectable for tests; default to the server calls
 */
const MenuOptionsCard = ({ code, company, load = listMenuOptions, save = setMenuOptions }) => {
  const [rows, setRows] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', error: false });

  useEffect(() => {
    let live = true;
    load(company)
      .then((options) => live && setRows(toEditor((options || {})[code])))
      .catch(() => live && setRows([]));
    return () => {
      live = false;
    };
  }, [code, company, load]);

  const change = (index, patch) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
    setMessage({ text: '', error: false });
  };

  const submit = async () => {
    setSaving(true);
    setMessage({ text: '', error: false });
    try {
      const data = await save({ itemCode: code, groups: fromEditor(rows), company });
      setRows(toEditor(data?.groups));
      setMessage({ text: W.saved, error: false });
    } catch (e) {
      setMessage({ text: e.message, error: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="nl-settings-card" data-card="menu-options">
      <Card title={W.title} subtitle={W.subtitle}>
        {rows === null ? (
          <div aria-busy="true" aria-label={W.loading}>
            <SkeletonText lines={2} />
          </div>
        ) : (
          <>
            {rows.length === 0 ? <p className="nl-products-note">{W.none}</p> : null}
            {rows.map((row, index) => (
              <fieldset className="nl-products-formgroup" key={index}>
                <Field id={`mo-name-${index}`} label={W.groupName} placeholder={W.groupNamePlaceholder} value={row.name} autoComplete="off" onChange={(v) => change(index, { name: v })} />
                <Field id={`mo-choices-${index}`} label={W.choices} helper={W.choicesHelper} value={row.choices} autoComplete="off" onChange={(v) => change(index, { choices: v })} />
                <Checkbox label={W.required} checked={row.required} onChange={(on) => change(index, { required: on })} />
                <Checkbox label={W.multiple} checked={row.multiple} onChange={(on) => change(index, { multiple: on })} />
                <Button variant="ghost" size="small" onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}>
                  {fill(W.removeGroup, { name: row.name || W.groupName })}
                </Button>
              </fieldset>
            ))}
            <div className="nl-settings-footer">
              <Button variant="secondary" icon="plus" onClick={() => setRows((prev) => [...prev, blankGroup()])}>
                {W.addGroup}
              </Button>
              <Button onClick={submit} loading={saving}>
                {W.save}
              </Button>
            </div>
            {message.text ? (
              <p className={message.error ? 'nl-settings-error' : 'nl-settings-status is-saved'} role={message.error ? 'alert' : 'status'}>
                <Icon name={message.error ? 'alert' : 'check'} />
                <span>{message.text}</span>
              </p>
            ) : null}
          </>
        )}
      </Card>
    </div>
  );
};

export default MenuOptionsCard;
