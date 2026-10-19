import React, { useMemo, useState } from 'react';
import Button from '../components/Button';
import Select from '../components/Select';
import { useNewLook } from '../NewLookProvider';
import UnitsDialog from './UnitsDialog';
import { firstUnits, unitOptions } from './productsModel';
import { useUnitWordsVersion } from './useShopUnits';
import U from './strings.units';

/**
 * The unit choice of a product form: the shop's industry units first, then its own units, then the common ones, then the rest.
 * Owners and managers also get "Add or change units". `units` is the list of units (useUnits), `shop` the shop's units (useShopUnits).
 */
const UnitPicker = ({ id, label, helper, error, value, onChange, units, shop }) => {
  const { company } = useNewLook();
  const [open, setOpen] = useState(false);
  useUnitWordsVersion(); // the words may change when a unit is added
  const uoms = useMemo(() => (units.status === 'ready' ? units.data : []), [units.status, units.data]);
  const data = shop.data;
  const choices = useMemo(() => unitOptions(uoms, firstUnits(data)), [uoms, data]);

  const changed = (answer) => {
    shop.apply(answer);
    units.reload();
  };

  return (
    <div className="nl-products-formgroup">
      <Select id={id} label={label} helper={helper} options={choices} value={value} error={error} onChange={onChange} />
      {data && data.canManage ? (
        <div>
          <Button variant="ghost" size="small" icon="plus" onClick={() => setOpen(true)}>
            {U.picker.manage}
          </Button>
        </div>
      ) : null}
      <UnitsDialog open={open} shop={data} uoms={uoms} company={company || undefined} onClose={() => setOpen(false)} onChanged={changed} />
    </div>
  );
};

export default UnitPicker;
