/* eslint-disable testing-library/no-node-access, testing-library/no-container --
   These tests check that an icon sits beside the words, that a dot is decoration and that a class is applied:
   facts about the page's structure that no role or label query can express. */
/**
 * Ticket P1-3: the base components (Button, Field, Select, Checkbox, Switch, Chip and badge, Card) and the
 * component page. Acceptance check AC-04: each component exists once, with default, hover, focus, disabled,
 * loading and error states; plus the behaviour and accessibility rules of Part 1.
 */
import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../../theme/ThemeProvider';
import ComponentPage from '../ComponentPage';
import { Badge, Button, Card, Checkbox, Chip, Field, Icon, ICON_NAMES, PaymentChip, Select, StatusLabel, Switch, ToastProvider, formatDate, maskDate, parseDate, paymentKey } from './index';

const css = fs.readFileSync(path.join(__dirname, 'components.css'), 'utf8');
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// The body of the rule whose selector starts a line, so a selector inside another rule is not mistaken for it
const ruleStart = (selector) => css.search(new RegExp(`(^|\\n)${escape(selector)}`));
const rule = (selector) => {
  const found = ruleStart(selector);
  expect(found).toBeGreaterThan(-1);
  const start = css.indexOf(selector, found);
  return css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
};

describe('Button', () => {
  test('has the four variants and three heights', () => {
    render(
      <>
        <Button variant="primary">A</Button>
        <Button variant="secondary">B</Button>
        <Button variant="danger">C</Button>
        <Button variant="ghost">D</Button>
        <Button size="till">E</Button>
        <Button size="small">F</Button>
      </>
    );
    expect(screen.getByText('A').closest('button')).toHaveClass('nl-btn--primary');
    expect(screen.getByText('B').closest('button')).toHaveClass('nl-btn--secondary');
    expect(screen.getByText('C').closest('button')).toHaveClass('nl-btn--danger');
    expect(screen.getByText('D').closest('button')).toHaveClass('nl-btn--ghost');
    expect(screen.getByText('E').closest('button')).toHaveClass('nl-btn--till');
    expect(screen.getByText('F').closest('button')).toHaveClass('nl-btn--small');
  });

  test('heights are 40px, 44px at the till and 32px small, from the tokens', () => {
    expect(rule('.nl-btn {')).toMatch(/min-height:\s*var\(--control-height\)/);
    expect(rule('.nl-btn--till {')).toMatch(/min-height:\s*var\(--control-height-till\)/);
    expect(rule('.nl-btn--small {')).toMatch(/min-height:\s*var\(--control-height-small\)/);
    expect(rule('.nl-btn {')).toMatch(/border-radius:\s*var\(--radius-button\)/);
    expect(rule('.nl-btn--small {')).toMatch(/border-radius:\s*var\(--radius-button-small\)/);
  });

  test('runs its action when clicked', () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Save</Button>);
    userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('disabled: cannot be used, and shows the track fill with muted text', () => {
    const onClick = jest.fn();
    render(<Button disabled onClick={onClick}>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeDisabled();
    userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    const disabled = rule('.nl-btn:disabled');
    expect(disabled).toMatch(/background-color:\s*var\(--track\)/);
    expect(disabled).toMatch(/color:\s*var\(--muted\)/);
  });

  test('loading: the spinner replaces the icon, the label stays, and a click does nothing', () => {
    const onClick = jest.fn();
    render(<Button icon="plus" loading onClick={onClick}>Save product</Button>);
    const button = screen.getByRole('button', { name: 'Save product' });
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button.querySelector('[data-icon="spinner"]')).toBeInTheDocument();
    expect(button.querySelector('[data-icon="plus"]')).not.toBeInTheDocument();
    userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  test('shows its icon before the label', () => {
    render(<Button icon="plus">Add</Button>);
    expect(screen.getByRole('button', { name: 'Add' }).querySelector('[data-icon="plus"]')).toBeInTheDocument();
  });

  test('an icon-only button without a name reports an error; with a name it is fine', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    render(<Button icon="x" />);
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/aria-label/));
    spy.mockClear();
    render(<Button icon="x" aria-label="Close" />);
    expect(spy).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    spy.mockRestore();
  });

  test('is a button that does not submit a form unless asked', () => {
    render(<Button>Plain</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });
});

describe('Field', () => {
  test('the label is visible and tied to the input', () => {
    render(<Field label="Product name" value="" onChange={() => {}} />);
    expect(screen.getByLabelText('Product name')).toBeInTheDocument();
  });

  test('the helper caption is read with the input', () => {
    render(<Field label="Price" helper="In shillings" value="" onChange={() => {}} />);
    expect(screen.getByLabelText('Price')).toHaveAccessibleDescription('In shillings');
  });

  test('error: red text with an icon and words, the input is marked invalid, and it replaces the helper', () => {
    render(<Field label="Name" helper="As customers see it" error="Enter a name" value="" onChange={() => {}} />);
    const input = screen.getByLabelText('Name');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Enter a name');
    expect(screen.queryByText('As customers see it')).not.toBeInTheDocument();
    expect(screen.getByText('Enter a name').closest('p').querySelector('[data-icon="alert"]')).toBeInTheDocument();
  });

  test('disabled and read-only', () => {
    const { rerender } = render(<Field label="Code" value="ITM-1" disabled onChange={() => {}} />);
    expect(screen.getByLabelText('Code')).toBeDisabled();
    rerender(<Field label="Code" value="ITM-1" readOnly onChange={() => {}} />);
    expect(screen.getByLabelText('Code')).toHaveAttribute('readonly');
  });

  test('text: passes what is typed', () => {
    const onChange = jest.fn();
    render(<Field label="Name" value="" onChange={onChange} />);
    userEvent.type(screen.getByLabelText('Name'), 'S');
    expect(onChange).toHaveBeenCalledWith('S');
  });

  describe('money', () => {
    test('shows KES in front and takes digits only', () => {
      const onChange = jest.fn();
      render(<Field kind="money" label="Price" value="" onChange={onChange} />);
      expect(screen.getByText('KES')).toBeInTheDocument();
      userEvent.paste(screen.getByLabelText('Price'), 'KES 2,350.50 abc');
      expect(onChange).toHaveBeenLastCalledWith('235050');
      expect(screen.getByLabelText('Price')).toHaveAttribute('inputmode', 'numeric');
    });
  });

  describe('date', () => {
    test('shows day first and gives the screen an ISO date', () => {
      const onChange = jest.fn();
      render(<Field kind="date" label="Date" value="2026-10-12" onChange={onChange} />);
      expect(screen.getByLabelText('Date')).toHaveValue('12/10/2026');
      expect(screen.getByLabelText('Date')).toHaveAttribute('placeholder', 'dd/mm/yyyy');
    });

    test('typing digits fills in the slashes and reports the date once it is a real one', () => {
      const onChange = jest.fn();
      const Wrapper = () => {
        const [v, setV] = React.useState('');
        return <Field kind="date" label="Date" value={v} onChange={(iso) => { setV(iso); onChange(iso); }} />;
      };
      render(<Wrapper />);
      userEvent.type(screen.getByLabelText('Date'), '12102026');
      expect(screen.getByLabelText('Date')).toHaveValue('12/10/2026');
      expect(onChange).toHaveBeenLastCalledWith('2026-10-12');
    });

    test('a date that does not exist is not reported (31/02/2026)', () => {
      const onChange = jest.fn();
      render(<Field kind="date" label="Date" value="" onChange={onChange} />);
      userEvent.type(screen.getByLabelText('Date'), '31022026');
      expect(onChange).toHaveBeenLastCalledWith('');
    });
  });
});

describe('date helpers', () => {
  test('mask, parse and format', () => {
    expect(maskDate('1210')).toBe('12/10');
    expect(maskDate('12102026999')).toBe('12/10/2026');
    expect(parseDate('12/10/2026')).toBe('2026-10-12');
    expect(parseDate('29/02/2028')).toBe('2028-02-29');
    expect(parseDate('29/02/2026')).toBe('');
    expect(parseDate('12/13/2026')).toBe('');
    expect(parseDate('1/1/2026')).toBe('');
    expect(formatDate('2026-10-12')).toBe('12/10/2026');
    expect(formatDate('')).toBe('');
  });
});

describe('Select', () => {
  const options = [
    { value: 'mpesa', label: 'M-Pesa' },
    { value: 'cash', label: 'Cash' },
    { value: 'card', label: 'Card' },
    { value: 'bank', label: 'Bank transfer', disabled: true },
  ];
  const mount = (props = {}) => {
    const onChange = jest.fn();
    render(<Select label="Payment method" options={options} value="cash" onChange={onChange} {...props} />);
    return { onChange, box: screen.getByRole('combobox', { name: /payment method/i }) };
  };

  test('is a closed box showing the chosen option and a chevron', () => {
    const { box } = mount();
    expect(box).toHaveTextContent('Cash');
    expect(box).toHaveAttribute('aria-expanded', 'false');
    expect(box.querySelector('[data-icon="chevronDown"]')).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  test('shows the placeholder when nothing is chosen', () => {
    const { box } = mount({ value: '', placeholder: 'Choose a method' });
    expect(box).toHaveTextContent('Choose a method');
  });

  test('opens on click, picks with a click, and closes', () => {
    const { box, onChange } = mount();
    userEvent.click(box);
    expect(box).toHaveAttribute('aria-expanded', 'true');
    const list = screen.getByRole('listbox');
    expect(within(list).getAllByRole('option')).toHaveLength(4);
    userEvent.click(within(list).getByRole('option', { name: 'Card' }));
    expect(onChange).toHaveBeenCalledWith('card');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  test('arrow keys move, Enter picks', () => {
    const { box, onChange } = mount({ value: 'mpesa' });
    box.focus();
    userEvent.keyboard('{arrowdown}'); // opens on the chosen option
    expect(box).toHaveAttribute('aria-expanded', 'true');
    userEvent.keyboard('{arrowdown}');
    expect(box.getAttribute('aria-activedescendant')).toMatch(/-opt-1$/);
    userEvent.keyboard('{arrowdown}');
    expect(box.getAttribute('aria-activedescendant')).toMatch(/-opt-2$/);
    userEvent.keyboard('{enter}');
    expect(onChange).toHaveBeenCalledWith('card');
  });

  test('arrow keys skip a disabled option, and Home and End jump', () => {
    const { box } = mount({ value: 'card' });
    box.focus();
    userEvent.keyboard('{arrowdown}');
    userEvent.keyboard('{arrowdown}'); // from Card, the next is Bank transfer (disabled): stay on Card
    expect(box.getAttribute('aria-activedescendant')).toMatch(/-opt-2$/);
    userEvent.keyboard('{home}');
    expect(box.getAttribute('aria-activedescendant')).toMatch(/-opt-0$/);
    userEvent.keyboard('{end}');
    expect(box.getAttribute('aria-activedescendant')).toMatch(/-opt-2$/);
  });

  test('a disabled option cannot be picked', () => {
    const { box, onChange } = mount();
    userEvent.click(box);
    userEvent.click(screen.getByRole('option', { name: 'Bank transfer' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  test('Escape closes and keeps focus on the box', () => {
    const { box } = mount();
    box.focus();
    userEvent.keyboard('{enter}');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    userEvent.keyboard('{esc}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(box).toHaveFocus();
  });

  test('typing jumps to the option that starts with the letters', () => {
    const { box, onChange } = mount({ value: 'cash' });
    box.focus();
    userEvent.keyboard('m'); // opens and jumps to M-Pesa
    expect(box.getAttribute('aria-activedescendant')).toMatch(/-opt-0$/);
    userEvent.keyboard('{enter}');
    expect(onChange).toHaveBeenCalledWith('mpesa');
  });

  test('a click outside closes it', () => {
    const { box } = mount();
    userEvent.click(box);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    userEvent.click(document.body);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  test('error and helper are read with the box; disabled cannot be opened', () => {
    const { box } = mount({ error: 'Choose how the customer paid' });
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(box).toHaveAccessibleDescription('Choose how the customer paid');
  });

  test('disabled', () => {
    const { box } = mount({ disabled: true });
    expect(box).toBeDisabled();
    userEvent.click(box);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  test('uses the same outline and focus ring as a Field', () => {
    expect(rule('.nl-select__button {')).toMatch(/border:\s*1px solid var\(--input-border\)/);
    expect(rule('.nl-input-wrap {')).toMatch(/border:\s*1px solid var\(--input-border\)/);
    expect(rule('.nl-select__button {')).toMatch(/border-radius:\s*var\(--radius-input\)/);
    expect(rule('.nl-input-wrap {')).toMatch(/border-radius:\s*var\(--radius-input\)/);
    expect(css).toMatch(/\.nl-select__button:focus-visible[\s\S]*?outline:\s*var\(--focus-ring\)/);
  });
});

describe('Checkbox', () => {
  test('clicking the words ticks the box', () => {
    const onChange = jest.fn();
    render(<Checkbox label="Track expiry dates" checked={false} onChange={onChange} />);
    userEvent.click(screen.getByText('Track expiry dates'));
    expect(onChange).toHaveBeenCalledWith(true, expect.anything());
  });

  test('is a checkbox with a name, ticked or not, and can be disabled', () => {
    const { rerender } = render(<Checkbox label="Remember me" checked onChange={() => {}} />);
    expect(screen.getByRole('checkbox', { name: 'Remember me' })).toBeChecked();
    rerender(<Checkbox label="Remember me" checked={false} disabled onChange={() => {}} />);
    expect(screen.getByRole('checkbox', { name: 'Remember me' })).toBeDisabled();
  });

  test('is 18px and its unticked border is the input-border colour so it stays visible', () => {
    const box = rule('.nl-check__box {');
    expect(box).toMatch(/width:\s*18px/);
    expect(box).toMatch(/height:\s*18px/);
    expect(box).toMatch(/border:\s*1px solid var\(--input-border\)/);
  });
});

describe('Switch', () => {
  test('is a switch with a name, 36 by 20px, and its off state is the input-border colour', () => {
    render(<Switch label="M-Pesa" checked={false} onChange={() => {}} />);
    expect(screen.getByRole('switch', { name: 'M-Pesa' })).not.toBeChecked();
    const track = rule('.nl-switch__track {');
    expect(track).toMatch(/width:\s*36px/);
    expect(track).toMatch(/height:\s*20px/);
    expect(track).toMatch(/background:\s*var\(--input-border\)/);
  });

  test('the label is clickable and the switch moves at once', () => {
    const onChange = jest.fn();
    render(<Switch label="Card" checked={false} onChange={onChange} />);
    userEvent.click(screen.getByText('Card'));
    expect(screen.getByRole('switch', { name: 'Card' })).toBeChecked();
    expect(onChange).toHaveBeenCalledWith(true);
  });

  test('says "Saved" once the save succeeds', async () => {
    render(<Switch label="Card" checked={false} onChange={() => Promise.resolve()} />);
    userEvent.click(screen.getByRole('switch', { name: 'Card' }));
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  test('moves back and says why when the save fails', async () => {
    render(<Switch label="Card" checked={false} onChange={() => Promise.reject(new Error('Could not save.'))} />);
    userEvent.click(screen.getByRole('switch', { name: 'Card' }));
    expect(await screen.findByText('Could not save.')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Card' })).not.toBeChecked();
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });

  test('disabled', () => {
    render(<Switch label="Cash" checked disabled onChange={() => {}} />);
    expect(screen.getByRole('switch', { name: 'Cash' })).toBeDisabled();
  });
});

describe('Chip, badge, status label and payment chip', () => {
  test('a chip shows its words, with an optional icon', () => {
    render(<Chip icon="clock">Open since 08:15</Chip>);
    expect(screen.getByText('Open since 08:15').querySelector('[data-icon="clock"]')).toBeInTheDocument();
  });

  test('a badge shows a count, and 100 or more as 99+', () => {
    render(
      <>
        <Badge count={7} />
        <Badge count={120} />
      </>
    );
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  test.each([
    ['paid', 'Paid', 'check', 'good'],
    ['unpaid', 'Unpaid', 'clock', 'warn'],
    ['overdue', 'Overdue', 'alert', 'bad'],
    ['part-returned', 'Part returned', 'undo', 'neutral'],
  ])('status %s is an icon plus the word "%s", never colour alone', (status, words, icon, tone) => {
    render(<StatusLabel status={status} />);
    const label = screen.getByText(words).closest('.nl-status');
    expect(label.querySelector(`[data-icon="${icon}"]`)).toBeInTheDocument();
    expect(label).toHaveClass(`nl-status--${tone}`);
  });

  test('status colours are the Part 1 tokens: good, warn, bad and ink-2', () => {
    expect(rule('.nl-status--good {')).toMatch(/var\(--good\)/);
    expect(rule('.nl-status--warn {')).toMatch(/var\(--warn\)/);
    expect(rule('.nl-status--bad {')).toMatch(/var\(--bad\)/);
    expect(rule('.nl-status--neutral {')).toMatch(/var\(--ink-2\)/);
  });

  test.each([
    ['M-Pesa', 'mpesa', 'series-1'],
    ['MPESA', 'mpesa', 'series-1'],
    ['Cash', 'cash', 'series-2'],
    ['Card', 'card', 'series-3'],
    ['On credit', 'credit', 'series-4'],
    ['Bank transfer', 'other', 'compare'],
  ])('payment method %s uses the %s colour (%s)', (method, key, token) => {
    expect(paymentKey(method)).toBe(key);
    render(<PaymentChip method={method} />);
    const chip = screen.getByText(method).closest('.nl-pay');
    expect(chip).toHaveAttribute('data-method', key);
    // The dot is in the method's series colour; any other method keeps the base dot, which is the compare grey
    const dotRule = key === 'other' ? rule('.nl-pay__dot {') : rule(`.nl-pay[data-method='${key}'] .nl-pay__dot {`);
    expect(dotRule).toContain(`var(--${token})`);
  });

  test('the method name is always shown, the dot is decoration', () => {
    render(<PaymentChip method="Cash" />);
    expect(screen.getByText('Cash')).toBeVisible();
    expect(document.querySelector('.nl-pay__dot')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('Card', () => {
  test('shows a title (as a heading), a subtitle, actions and a body', () => {
    render(
      <Card title="Sales" subtitle="Today" actions={<Button size="small">Export</Button>}>
        Body text
      </Card>
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Sales' })).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
    expect(screen.getByText('Body text')).toBeInTheDocument();
  });

  test('has a 1px line, a 14px corner, 20px of padding and no shadow', () => {
    const card = rule('.nl-card {');
    expect(card).toMatch(/padding:\s*var\(--card-padding\)/);
    expect(card).toMatch(/border:\s*var\(--card-border\)/);
    expect(card).toMatch(/border-radius:\s*var\(--radius-card\)/);
    expect(card).toMatch(/box-shadow:\s*var\(--shadow-card\)/);
  });

  test('small cards use the smaller title', () => {
    expect(rule('.nl-card--small .nl-card__title')).toMatch(/var\(--card-title-size-small\)/);
  });

  test('a card inside a card is allowed, a third level is reported', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <Card title="One">
        <Card title="Two" level={3}>
          x
        </Card>
      </Card>
    );
    expect(spy).not.toHaveBeenCalled();
    render(
      <Card title="One">
        <Card title="Two" level={3}>
          <Card title="Three" level={4}>
            x
          </Card>
        </Card>
      </Card>
    );
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/nest only one level/));
    spy.mockRestore();
  });
});

describe('Icon', () => {
  test('every icon is decoration: hidden from screen readers, with a stroke that follows the text colour', () => {
    ICON_NAMES.forEach((name) => {
      const { container, unmount } = render(<Icon name={name} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
      expect(svg).toHaveAttribute('stroke', 'currentColor');
      expect(svg).toHaveAttribute('stroke-linecap', 'round');
      expect(svg.children.length).toBeGreaterThan(0);
      unmount();
    });
  });

  test('is 18px with a 1.8px stroke, from the tokens', () => {
    const icon = rule('.nl-icon {');
    expect(icon).toMatch(/width:\s*var\(--icon-size\)/);
    expect(icon).toMatch(/stroke-width:\s*var\(--icon-stroke\)/);
  });
});

describe('rules shared by every component', () => {
  test('the keyboard focus ring is 2px in brand-text with a 2px offset, on every interactive component', () => {
    const ring = css.slice(css.indexOf('.nl-btn:focus-visible'), css.indexOf('/* ---------- Button'));
    expect(ring).toMatch(/outline:\s*var\(--focus-ring\)/);
    expect(ring).toMatch(/outline-offset:\s*var\(--focus-ring-offset\)/);
    ['.nl-btn:focus-visible', '.nl-input-wrap:focus-within', '.nl-select__button:focus-visible', '.nl-check__input:focus-visible', '.nl-switch__input:focus-visible'].forEach((selector) => {
      expect(ring).toContain(selector);
    });
  });

  test('no outline is removed without a replacement', () => {
    // The only "outline: none" is on the inner input, whose wrapper shows the focus ring instead
    const removed = css.match(/outline:\s*none/g) || [];
    expect(removed).toHaveLength(1);
    expect(rule('.nl-input {')).toMatch(/outline:\s*none/);
  });

  test('below 768px every tap target is at least 44px', () => {
    const small = css.slice(css.indexOf('@media (max-width: 767px)'), css.indexOf('/* ---------- Reduced motion'));
    ['.nl-btn', '.nl-input-wrap', '.nl-select__button', '.nl-check', '.nl-switch', '.nl-select__option'].forEach((selector) => {
      expect(small).toContain(selector);
    });
    expect(small).toMatch(/min-height:\s*var\(--control-height-till\)/);
  });

  test('with reduced motion nothing moves', () => {
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toMatch(/\.nl-spinner\s*\{\s*animation:\s*none/);
    expect(reduced).toMatch(/transition:\s*none/);
  });

  test('hover and pressed are an overlay of the ink colour, so they need no colours of their own', () => {
    expect(css).toMatch(/\.nl-btn:hover[\s\S]*?linear-gradient\(rgb\(var\(--ink-rgb\) \/ 0\.08\)/);
    expect(css).toMatch(/\.nl-btn:active[\s\S]*?linear-gradient\(rgb\(var\(--ink-rgb\) \/ 0\.16\)/);
  });

  test('each component is defined once, in this folder (no second copy of a class)', () => {
    ['.nl-btn {', '.nl-field {', '.nl-select__button {', '.nl-check__box {', '.nl-switch__track {', '.nl-chip {', '.nl-card {'].forEach((selector) => {
      expect(css.match(new RegExp(`(^|\\n)${escape(selector)}`, 'g'))).toHaveLength(1);
    });
  });
});

describe('the component page', () => {
  const show = () =>
    render(
      <ThemeProvider>
        <MemoryRouter>
          <ToastProvider>
            <ComponentPage />
          </ToastProvider>
        </MemoryRouter>
      </ThemeProvider>
    );

  test('shows every component, with its states', () => {
    show();
    ['Button', 'Field', 'Select', 'Checkbox and switch', 'Chips, badges and labels', 'Card', 'Icons'].forEach((name) => {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    });
    // Each button variant in its six states
    expect(screen.getAllByRole('button', { name: 'Add product' })).toHaveLength(24);
    ['Default', 'Hover', 'Pressed', 'Focus', 'Disabled', 'Loading'].forEach((state) => {
      expect(screen.getAllByText(state).length).toBeGreaterThanOrEqual(4);
    });
    // Field states
    expect(screen.getByText('Enter a name for the product')).toBeInTheDocument();
    expect(screen.getByLabelText('Product code')).toBeDisabled();
    expect(screen.getByLabelText('Receipt number')).toHaveAttribute('readonly');
    // Every status and payment chip
    ['Paid', 'Unpaid', 'Overdue', 'Part returned'].forEach((words) => expect(screen.getAllByText(words).length).toBeGreaterThan(0));
    ['M-Pesa', 'Cash', 'Card', 'On credit', 'Bank transfer'].forEach((name) => expect(screen.getAllByText(name).length).toBeGreaterThan(0));
  });

  test('has one page title and a way to switch between the light and dark themes', () => {
    show();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    userEvent.click(screen.getByRole('button', { name: 'Dark' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    userEvent.click(screen.getByRole('button', { name: 'Light' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  test('every icon-only button on it has a name, and nothing logs an error', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    show();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  test('a switch on the page says Saved after it saves', async () => {
    show();
    userEvent.click(screen.getByRole('switch', { name: 'M-Pesa' }));
    await waitFor(() => expect(screen.getAllByText('Saved').length).toBeGreaterThan(0));
  });
});

describe('Payment chip and the rename map', () => {
  test.each([
    ['Credit Card', 'Card', 'card'],
    ['credit card', 'Card', 'card'],
    ['Cheque', 'Other', 'other'],
    ['Bank Draft', 'Other', 'other'],
    ['Wire Transfer', 'Other', 'other'],
  ])('%s shows as %s with the %s colour group', (method, shown, key) => {
    const { container } = render(<PaymentChip method={method} />);
    expect(screen.getByText(shown)).toBeInTheDocument();
    expect(screen.queryByText(method)).not.toBeInTheDocument();
    expect(container.querySelector('.nl-pay')).toHaveAttribute('data-method', key);
  });

  test('a method with no rename shows as it is', () => {
    const { container } = render(<PaymentChip method="M-Pesa" />);
    expect(screen.getByText('M-Pesa')).toBeInTheDocument();
    expect(container.querySelector('.nl-pay')).toHaveAttribute('data-method', 'mpesa');
  });

  test('a hidden name draws nothing', () => {
    const { container } = render(<PaymentChip method="Territory" />);
    expect(container.querySelector('.nl-pay')).toBeNull();
  });
});
