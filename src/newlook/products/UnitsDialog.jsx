import React, { useMemo, useState } from 'react';
import Button from '../components/Button';
import Checkbox from '../components/Checkbox';
import Dialog from '../components/Dialog';
import Field from '../components/Field';
import Select from '../components/Select';
import { useToast } from '../components/Toast';
import fill from '../labels/fill';
import { addCustomUnit, setUnitsIndustry } from '../../api/unitsApi';
import { checkCustomUnit, takenWords, tidy } from './customUnit';
import U from './strings.units';

const FORM_ID = 'nl-unit-form';

const Body = ({ shop, uoms, company, onClose, onChanged }) => {
  const D = U.dialog;
  const toast = useToast();
  const [name, setName] = useState('');
  const [plural, setPlural] = useState('');
  const [parts, setParts] = useState(false);
  const [problems, setProblems] = useState({});
  const [general, setGeneral] = useState('');
  const [busy, setBusy] = useState(false);
  const taken = useMemo(() => takenWords({ uoms, shop }), [uoms, shop]);
  const industries = shop.industries.map((key) => ({ value: key, label: U.industries[key] || key }));

  const changeIndustry = async (industry) => {
    setBusy(true);
    setGeneral('');
    try {
      onChanged(await setUnitsIndustry(industry, company));
      toast.success(D.industrySaved);
    } catch (error) {
      setGeneral(error.message);
    }
    setBusy(false);
  };

  const add = async (event) => {
    event.preventDefault();
    const found = checkCustomUnit({ name, plural }, taken);
    setProblems(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    setGeneral('');
    try {
      const data = await addCustomUnit({ name: tidy(name), plural: tidy(plural), allowParts: parts, company });
      onChanged(data);
      toast.success(fill(D.added, { name: data.added || tidy(name) }));
      setName('');
      setPlural('');
      setParts(false);
    } catch (error) {
      setGeneral(error.message);
    }
    setBusy(false);
  };

  return (
    <Dialog
      open
      onClose={onClose}
      busy={busy}
      title={D.title}
      description={D.description}
      footer={
        <Button variant="secondary" disabled={busy} onClick={onClose}>
          {D.close}
        </Button>
      }
    >
      <div className="nl-products-dialog-form">
        <Select label={D.industry} helper={D.industryHelper} options={industries} value={shop.industry} disabled={busy} onChange={changeIndustry} />
        <form id={FORM_ID} noValidate onSubmit={add} className="nl-products-dialog-form" aria-label={D.addHeading}>
          <h3 className="nl-products-dialog-heading">{D.addHeading}</h3>
          <Field id="nl-unit-name" label={D.name} placeholder={D.namePlaceholder} value={name} error={problems.name} autoComplete="off" onChange={(value) => { setName(value); setProblems((p) => ({ ...p, name: undefined })); }} />
          <Field id="nl-unit-plural" label={D.plural} helper={D.pluralHelper} placeholder={D.pluralPlaceholder} value={plural} error={problems.plural} autoComplete="off" onChange={(value) => { setPlural(value); setProblems((p) => ({ ...p, plural: undefined })); }} />
          <Checkbox label={D.parts} checked={parts} onChange={setParts} />
          {general ? (
            <p role="alert" className="nl-products-note">
              {general}
            </p>
          ) : null}
          <div>
            <Button type="submit" loading={busy}>
              {D.add}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
};

/**
 * "Your units": choose the kind of shop (its usual units come first in the unit choice) and add the shop's own unit. For owners and
 * managers. onChanged(shop) is called with the server's newer answer after every change.
 */
const UnitsDialog = ({ open, shop, uoms = [], company, onClose, onChanged }) => (open && shop ? <Body shop={shop} uoms={uoms} company={company} onClose={onClose} onChanged={onChanged} /> : null);

export default UnitsDialog;
