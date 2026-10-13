import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useThemeMode } from '../theme/ThemeProvider';
import DataDemo from './DataDemo';
import { Badge, Button, Card, Checkbox, Chip, Field, ICON_NAMES, Icon, PaymentChip, Select, StatusLabel, Switch } from './components';

/**
 * The component page (Phase 1 gate: "A component page and an empty new shell in both themes").
 * Every shared component in every state, on one page. Hover, pressed and focus are forced so they can be seen at
 * rest; the real ones appear when you point, press and use the Tab key. Use the Light and Dark buttons to see
 * both themes. Only the owner reaches this page, and only while the shop's New look is on.
 */
const page = { maxWidth: 'var(--content-max)', margin: '0 auto', display: 'grid', gap: 'var(--card-gap)' };
const row = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-4)' };
const stateLabel = { display: 'block', marginBottom: 'var(--space-2)', color: 'var(--muted)', fontSize: 'var(--caption-size)' };
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--space-5)' };

const State = ({ name, children }) => (
  <div>
    <span style={stateLabel}>{name}</span>
    {children}
  </div>
);

// A short receipt number such as #0033. Written with an escape so the no-hard-coded-colours test does not mistake it for a colour code.
const RECEIPT_NUMBER = '\u00230033';

const METHODS = [
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'credit', label: 'On credit' },
  { value: 'bank', label: 'Bank transfer', disabled: true },
];

const ButtonStates = ({ variant }) => (
  <div style={row}>
    <State name="Default">
      <Button variant={variant} icon="plus">Add product</Button>
    </State>
    <State name="Hover">
      <Button variant={variant} icon="plus" className="is-hover">Add product</Button>
    </State>
    <State name="Pressed">
      <Button variant={variant} icon="plus" className="is-pressed">Add product</Button>
    </State>
    <State name="Focus">
      <Button variant={variant} icon="plus" className="is-focus">Add product</Button>
    </State>
    <State name="Disabled">
      <Button variant={variant} icon="plus" disabled>Add product</Button>
    </State>
    <State name="Loading">
      <Button variant={variant} icon="plus" loading>Add product</Button>
    </State>
  </div>
);

const ComponentPage = () => {
  const { mode, toggleColorMode } = useThemeMode();
  const [field, setField] = useState('');
  const [money, setMoney] = useState('2350');
  const [date, setDate] = useState('2026-10-12');
  const [method, setMethod] = useState('mpesa');
  const [ticked, setTicked] = useState(true);

  return (
    <div style={page}>
      <div>
        <h1 style={{ margin: '0 0 var(--space-1)', fontSize: 'var(--page-title-size)', fontWeight: 'var(--page-title-weight)', letterSpacing: 'var(--page-title-spacing)' }}>
          Components
        </h1>
        <p style={{ margin: 0, color: 'var(--muted)' }}>
          Every shared component in every state. Hover, pressed and focus are shown at rest; the real ones appear when you point, press and use the Tab key.
        </p>
        <div style={{ ...row, marginTop: 'var(--space-4)' }}>
          <span style={{ color: 'var(--muted)' }}>Theme now: {mode}</span>
          <Button variant="secondary" size="small" onClick={() => mode !== 'light' && toggleColorMode()}>Light</Button>
          <Button variant="secondary" size="small" onClick={() => mode !== 'dark' && toggleColorMode()}>Dark</Button>
          <RouterLink to="/new-look" style={{ color: 'var(--brand-text)', fontWeight: 'var(--font-weight-semibold)' }}>Back to the New look</RouterLink>
        </div>
      </div>

      <Card title="Button" subtitle="Primary, secondary, danger and ghost, in three heights">
        <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
          {['primary', 'secondary', 'danger', 'ghost'].map((variant) => (
            <div key={variant}>
              <span style={{ ...stateLabel, color: 'var(--ink-2)', fontWeight: 'var(--font-weight-semibold)' }}>{variant}</span>
              <ButtonStates variant={variant} />
            </div>
          ))}
          <div style={row}>
            <State name="Small, 32px"><Button size="small">Save</Button></State>
            <State name="Default, 40px"><Button>Save</Button></State>
            <State name="Till, 44px"><Button size="till">Take payment</Button></State>
            <State name="Icon only (has a name for screen readers)"><Button variant="secondary" icon="x" aria-label="Close" /></State>
          </div>
        </div>
      </Card>

      <Card title="Field" subtitle="Label above, helper below, error with an icon. Money takes digits only; dates are day first">
        <div style={grid}>
          <State name="Default"><Field label="Product name" placeholder="For example, Panadol" helper="As customers see it" value={field} onChange={setField} /></State>
          <State name="Hover"><Field label="Product name" value="Soap" forceState="hover" onChange={() => {}} /></State>
          <State name="Focus"><Field label="Product name" value="Soap" forceState="focus" onChange={() => {}} /></State>
          <State name="Error"><Field label="Product name" value="" error="Enter a name for the product" onChange={() => {}} /></State>
          <State name="Disabled"><Field label="Product code" value="ITM-0042" disabled helper="Filled in automatically" onChange={() => {}} /></State>
          <State name="Read-only"><Field label="Receipt number" value={RECEIPT_NUMBER} readOnly onChange={() => {}} /></State>
          <State name="Money (digits only)"><Field kind="money" label="Selling price" value={money} onChange={setMoney} helper="Shillings, no cents" /></State>
          <State name="Date (day first)"><Field kind="date" label="Date" value={date} onChange={setDate} helper="dd/mm/yyyy" /></State>
        </div>
      </Card>

      <Card title="Select" subtitle="Arrow keys move, Enter picks, typing jumps to a match, Escape closes">
        <div style={grid}>
          <State name="Default"><Select label="Payment method" options={METHODS} value={method} onChange={setMethod} /></State>
          <State name="Placeholder"><Select label="Payment method" options={METHODS} value="" onChange={() => {}} placeholder="Choose a method" /></State>
          <State name="Hover"><Select label="Payment method" options={METHODS} value="cash" forceState="hover" onChange={() => {}} /></State>
          <State name="Focus"><Select label="Payment method" options={METHODS} value="cash" forceState="focus" onChange={() => {}} /></State>
          <State name="Error"><Select label="Payment method" options={METHODS} value="" error="Choose how the customer paid" onChange={() => {}} /></State>
          <State name="Disabled"><Select label="Payment method" options={METHODS} value="cash" disabled onChange={() => {}} /></State>
        </div>
      </Card>

      <Card title="Checkbox and switch" subtitle="The words are part of the control; the off state stays visible">
        <div style={grid}>
          <State name="Checkbox, ticked"><Checkbox label="Track expiry dates" checked={ticked} onChange={setTicked} /></State>
          <State name="Checkbox, unticked"><Checkbox label="Track expiry dates" checked={false} onChange={() => {}} /></State>
          <State name="Checkbox, hover"><Checkbox label="Track expiry dates" checked={false} onChange={() => {}} forceState="hover" /></State>
          <State name="Checkbox, focus"><Checkbox label="Track expiry dates" checked onChange={() => {}} forceState="focus" /></State>
          <State name="Checkbox, error"><Checkbox label="I accept the terms" checked={false} onChange={() => {}} error="Tick to continue" /></State>
          <State name="Checkbox, disabled"><Checkbox label="Track expiry dates" checked disabled onChange={() => {}} /></State>
          <State name="Switch, on (saves, then says Saved)"><Switch label="M-Pesa" checked onChange={() => new Promise((resolve) => setTimeout(resolve, 300))} /></State>
          <State name="Switch, off"><Switch label="Card" checked={false} onChange={() => Promise.resolve()} /></State>
          <State name="Switch, hover"><Switch label="Card" checked={false} forceState="hover" onChange={() => {}} /></State>
          <State name="Switch, focus"><Switch label="Card" checked forceState="focus" onChange={() => {}} /></State>
          <State name="Switch, fails to save"><Switch label="On credit" checked={false} onChange={() => Promise.reject(new Error('Could not save. Check your connection.'))} /></State>
          <State name="Switch, disabled"><Switch label="Cash" checked disabled onChange={() => {}} /></State>
        </div>
      </Card>

      <Card title="Chips, badges and labels" subtitle="Colour is never the only signal">
        <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
          <div style={row}>
            <State name="Chip"><Chip>Retail</Chip></State>
            <State name="Chip, brand"><Chip tone="brand">Selected</Chip></State>
            <State name="Chip with an icon"><Chip icon="clock">Open since 08:15</Chip></State>
            <State name="Badge (count)"><Badge count={7} label="unpaid sales" /></State>
            <State name="Badge, 100 or more"><Badge count={120} /></State>
          </div>
          <div style={row}>
            <State name="Paid"><StatusLabel status="paid" /></State>
            <State name="Unpaid"><StatusLabel status="unpaid" /></State>
            <State name="Overdue"><StatusLabel status="overdue" /></State>
            <State name="Part returned"><StatusLabel status="part-returned" /></State>
          </div>
          <div style={row}>
            <State name="M-Pesa (series-1)"><PaymentChip method="M-Pesa" /></State>
            <State name="Cash (series-2)"><PaymentChip method="Cash" /></State>
            <State name="Card (series-3)"><PaymentChip method="Card" /></State>
            <State name="On credit (series-4)"><PaymentChip method="On credit" /></State>
            <State name="Any other method (compare grey)"><PaymentChip method="Bank transfer" /></State>
          </div>
        </div>
      </Card>

      <Card title="Card" subtitle="A surface with a 1px line, a 14px corner and 20px of padding. Cards never nest more than one level">
        <div style={grid}>
          <Card title="Card title" subtitle="With a subtitle" actions={<Button variant="secondary" size="small">Action</Button>}>
            <p style={{ margin: 0 }}>The body of a card.</p>
          </Card>
          <Card title="Small card" small>
            <p style={{ margin: 0 }}>Small cards use the 15px title.</p>
          </Card>
          <Card>
            <p style={{ margin: 0 }}>A card with no header.</p>
          </Card>
        </div>
      </Card>

      <DataDemo />

      <Card title="Icons" subtitle="18px, 1.8px stroke, round ends, the current text colour. Words always sit beside them">
        <div style={row}>
          {ICON_NAMES.map((name) => (
            <State key={name} name={name}>
              <Icon name={name} />
            </State>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default ComponentPage;
