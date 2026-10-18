import React from 'react';
import LinkList from './LinkList';
import PaymentMethodsCard from './PaymentMethodsCard';
import TillOptionsCard from './TillOptionsCard';
import DeviceCard from './DeviceCard';
import { OLD, legacy } from './settingsModel';
import T from './strings.settings';

const L = T.till.links;

/**
 * Settings, Till and payments (tickets P3-1 and P5-3): the payment method switches, the till options, the choices kept on
 * this device, and links to the current screens for what holds keys or rules (payment gateways, bank accounts, discount
 * rules, loyalty programmes).
 *
 *   payments   { load, save } for the payment method switches (tests)
 *   options    { load, save, afterSave } for the till options (tests)
 *   device     { read, write } for the device choices (tests)
 */
const TillSection = ({ payments = {}, options = {}, device = {}, search = '' }) => {
  const highlight = new URLSearchParams(search).get('section') || '';
  const items = [
    { key: 'payment-gateways', title: L.gateways.title, text: L.gateways.text, to: legacy(OLD.paymentGateways) },
    { key: 'payment-methods', title: L.credit.title, text: L.credit.text, to: legacy(OLD.paymentMethods) },
    { key: 'bank-accounts', title: L.banks.title, text: L.banks.text, to: legacy(OLD.bankAccounts) },
    { key: 'inventory-discounts', title: L.discounts.title, text: L.discounts.text, to: legacy(OLD.inventoryDiscounts) },
    { key: 'loyalty-programs', title: L.loyalty.title, text: L.loyalty.text, to: legacy(OLD.loyalty) },
  ];
  return (
    <>
      <PaymentMethodsCard {...payments} />
      <TillOptionsCard {...options} />
      <DeviceCard {...device} />
      <LinkList id="till-links" title={L.title} subtitle={L.subtitle} items={items} highlightKey={highlight} />
    </>
  );
};

export default TillSection;
