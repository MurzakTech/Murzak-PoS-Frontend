import React, { useCallback, useEffect, useState } from 'react';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import Field from '../components/Field';
import { SkeletonText } from '../components/Skeleton';
import { useAccess } from '../access/AccessProvider';
import { getCompany, updateCompany } from '../../api/businessApi';
import CompanyCard from './CompanyCard';
import { CARD } from './businessModel';
import LinkList from './LinkList';
import { OLD, cardFromSearch, legacy } from './settingsModel';
import useSettingsUser from './useSettingsUser';
import T from './strings.settings';

const B = T.business;

/**
 * Settings, Business (ticket P5-3): the company name and tax number, the address and phone, and the contact person, each
 * on a card that saves on its own, through the same two server calls the current Business screen uses. The name, short
 * name, country and currency are shown but not changed here: the server finds the business by its name and ignores the
 * other three when it saves. Bank accounts stay on the current screen (a link).
 *
 *   load, save   injectable for tests; they default to the server calls
 *   search       the address's query, for ?section=<card>
 */
const BusinessSection = ({ load = getCompany, save = updateCompany, search = '' }) => {
  const access = useAccess();
  const { company: name } = useSettingsUser();
  const [state, setState] = useState({ status: 'loading', company: null });
  const owner = access.tier === 'owner';
  const wanted = cardFromSearch(search);

  const reload = useCallback(() => {
    setState({ status: 'loading', company: null });
    load(name || undefined)
      .then((company) => setState({ status: 'ready', company }))
      .catch(() => {
        if (name) {
          load(undefined)
            .then((company) => setState({ status: 'ready', company }))
            .catch(() => setState({ status: 'error', company: null }));
        } else {
          setState({ status: 'error', company: null });
        }
      });
  }, [load, name]);
  useEffect(reload, [reload]);

  const saved = (company) => setState({ status: 'ready', company });

  let body;
  if (state.status === 'loading') {
    body = (
      <Card title={B.details.title}>
        <div aria-busy="true" aria-label={B.loading}>
          <SkeletonText lines={5} />
        </div>
      </Card>
    );
  } else if (state.status === 'nocompany') {
    body = (
      <Card>
        <p className="nl-settings-hint">{B.noCompany}</p>
      </Card>
    );
  } else if (state.status === 'error') {
    body = (
      <Card>
        <EmptyState icon="alert" tone="error" title={B.errorTitle} description={B.errorText} action={{ label: T.shell.retry, onClick: reload }} level={3} />
      </Card>
    );
  } else {
    const company = state.company;
    const common = { company, save, onSaved: saved, canEdit: owner };
    body = (
      <>
        {!owner ? <p className="nl-settings-note">{B.ownerNote}</p> : null}
        <CompanyCard {...common} card={CARD.details} title={B.details.title} subtitle={B.details.subtitle} highlighted={wanted === 'business-details'}>
          {({ values, set, errors, readOnly, id }) => (
            <>
              <Field id="business-name" label={B.details.name} value={company.companyName} readOnly helper={B.details.fixed} className="is-wide" />
              <Field id="business-abbr" label={B.details.abbr} value={company.abbr} readOnly />
              <Field id={id('taxId')} label={B.details.taxId} helper={B.details.taxIdHelper} value={values.taxId} onChange={set('taxId')} error={errors.taxId} readOnly={readOnly} />
              <Field id="business-country" label={B.details.country} value={company.country} readOnly />
              <Field id="business-currency" label={B.details.currency} value={company.currency} readOnly />
            </>
          )}
        </CompanyCard>
        <CompanyCard {...common} card={CARD.address} title={B.address.title} subtitle={B.address.subtitle} highlighted={wanted === 'business-address'}>
          {({ values, set, errors, readOnly, id }) => (
            <>
              <Field id={id('line1')} label={B.address.line1} value={values.line1} onChange={set('line1')} error={errors.line1} readOnly={readOnly} className="is-wide" />
              <Field id={id('line2')} label={B.address.line2} value={values.line2} onChange={set('line2')} readOnly={readOnly} className="is-wide" />
              <Field id={id('city')} label={B.address.city} value={values.city} onChange={set('city')} error={errors.city} readOnly={readOnly} />
              <Field id={id('state')} label={B.address.state} value={values.state} onChange={set('state')} readOnly={readOnly} />
              <Field id={id('pincode')} label={B.address.pincode} value={values.pincode} onChange={set('pincode')} readOnly={readOnly} />
              <Field id={id('phone')} label={B.address.phone} value={values.phone} onChange={set('phone')} readOnly={readOnly} inputMode="tel" />
              <Field id={id('email')} label={B.address.email} value={values.email} onChange={set('email')} error={errors.email} readOnly={readOnly} inputMode="email" />
            </>
          )}
        </CompanyCard>
        <CompanyCard {...common} card={CARD.contact} title={B.contact.title} subtitle={B.contact.subtitle} highlighted={wanted === 'business-contact'}>
          {({ values, set, errors, readOnly, id }) => (
            <>
              <Field id={id('firstName')} label={B.contact.firstName} value={values.firstName} onChange={set('firstName')} readOnly={readOnly} />
              <Field id={id('lastName')} label={B.contact.lastName} value={values.lastName} onChange={set('lastName')} readOnly={readOnly} />
              <Field id={id('contactEmail')} label={B.contact.email} value={values.contactEmail} onChange={set('contactEmail')} error={errors.contactEmail} readOnly={readOnly} inputMode="email" />
              <Field id={id('mobile')} label={B.contact.mobile} value={values.mobile} onChange={set('mobile')} readOnly={readOnly} inputMode="tel" />
              <Field id={id('contactPhone')} label={B.contact.phone} value={values.contactPhone} onChange={set('contactPhone')} readOnly={readOnly} inputMode="tel" />
            </>
          )}
        </CompanyCard>
      </>
    );
  }

  return (
    <>
      {body}
      <LinkList id="business-banks" title={B.banks.title} subtitle={B.banks.subtitle} items={[{ key: 'bank-accounts', text: B.banks.note, to: legacy(OLD.bankAccounts) }]} />
      <LinkList id="business-stores" title={B.stores.title} subtitle={B.stores.subtitle} items={[{ key: 'stores', text: B.stores.note, to: legacy(OLD.stores) }]} />
      <LinkList id="business-letterhead" title={B.letterhead.title} subtitle={B.letterhead.subtitle} items={[{ key: 'letterhead', text: B.letterhead.note, to: legacy(OLD.business) }]} />
    </>
  );
};

export default BusinessSection;
