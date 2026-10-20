import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Field from '../components/Field';
import { SkeletonText } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { getShopDetails, saveTaxId } from '../../api/setupApi';
import StepFrame from './StepFrame';
import { cleanTaxId, isPassed, taxIdOk } from './setupModel';
import T from './strings.setup';

const S = T.shop;
const STEP = 'shop';
const TAX_ID = 'setup-tax-id';

/** A link to a redesigned page stays in the app; a link to a current screen is an ordinary address */
export const StepLink = ({ to, children }) =>
  String(to).startsWith('/') && !String(to).includes('legacy=1') ? (
    <Link className="nl-setup-link" to={to}>
      {children}
    </Link>
  ) : (
    <a className="nl-setup-link" href={to}>
      {children}
    </a>
  );

/**
 * Step 2, the shop's name and tax ID, through the company calls the current Business settings use. The name was set when the account
 * was made and the company call cannot rename a company, so the name is shown but not edited; the tax ID is optional.
 */
const ShopStep = ({ ctx }) => {
  const toast = useToast();
  const [shop, setShop] = useState({ status: 'loading', details: null });
  const [taxId, setTaxId] = useState('');
  const [problem, setProblem] = useState('');

  const load = useCallback(() => {
    setShop({ status: 'loading', details: null });
    getShopDetails(ctx.company)
      .then((details) => {
        setShop({ status: 'ready', details });
        setTaxId(details.taxId);
      })
      .catch(() => setShop({ status: 'error', details: null }));
  }, [ctx.company]);
  useEffect(load, [load]);

  const details = shop.details;
  const dirty = shop.status === 'ready' && cleanTaxId(taxId) !== cleanTaxId(details.taxId);

  const save = async () => {
    if (shop.status !== 'ready') {
      load();
      return;
    }
    if (!taxIdOk(taxId)) {
      setProblem(S.taxIdBad);
      return;
    }
    if (dirty) {
      await saveTaxId({ company: details.name, taxId: cleanTaxId(taxId) });
      toast.success(S.saved);
    }
    await ctx.complete(STEP);
  };

  return (
    <StepFrame ctx={ctx} stepKey={STEP} heading={S.title} help={S.help} dirty={dirty} saved={isPassed(ctx.state, STEP)} errors={problem ? [{ id: TAX_ID, message: problem }] : []} onSave={save}>
      {shop.status === 'loading' ? (
        <div aria-busy="true" aria-label={S.loading}>
          <SkeletonText lines={3} />
        </div>
      ) : shop.status === 'error' ? (
        <div role="alert" className="nl-setup-option">
          <p className="nl-setup-option__text">{S.loadFailed}</p>
          <Button variant="secondary" onClick={load}>
            {S.retry}
          </Button>
        </div>
      ) : (
        <>
          <Field id="setup-shop-name" label={S.name} helper={S.nameHelper} value={details.title} readOnly />
          <Field
            id={TAX_ID}
            label={S.taxId}
            helper={S.taxIdHelper}
            placeholder={S.taxIdPlaceholder}
            value={taxId}
            error={problem}
            autoComplete="off"
            onChange={(v) => {
              setTaxId(v);
              setProblem('');
            }}
          />
          <p className="nl-setup-note">
            {S.moreText} <StepLink to={ctx.links.business}>{S.moreLink}</StepLink>
          </p>
        </>
      )}
    </StepFrame>
  );
};

export default ShopStep;
