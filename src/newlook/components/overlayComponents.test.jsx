/* eslint-disable testing-library/no-node-access, testing-library/no-container --
   These tests check where focus is, what sits outside the page flow (a portal), the stacking of overlays and
   which icon a toast shows: structure that no role or label query can express. */
/**
 * Ticket P1-5: the overlay components (Dialog and confirm, Menu, Toast, Drawer) and their focus handling.
 * Done when: focus moves in, is trapped and returns; Escape closes; toasts follow the Messages rule.
 */
import React from 'react';
import fs from 'fs';
import path from 'path';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../../theme/ThemeProvider';
import ComponentPage from '../ComponentPage';
import { Button, ConfirmDialog, Dialog, Drawer, Field, Menu, Select, TOAST_MS, ToastProvider, useToast } from './index';

const css = fs.readFileSync(path.join(__dirname, 'overlay-components.css'), 'utf8');
const block = (selector) => {
  const start = css.search(new RegExp(`(^|\\n)${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{`));
  expect(start).toBeGreaterThan(-1);
  const open = css.indexOf('{', start);
  return css.slice(open + 1, css.indexOf('}', open));
};

/** A button that opens a dialog, so "focus returns to the button that opened it" can be tested */
const WithOpener = ({ children }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open it
      </button>
      {children(open, () => setOpen(false))}
    </>
  );
};

describe('Dialog', () => {
  const form = (open, close, extra = {}) => (
    <Dialog
      open={open}
      onClose={close}
      title="New category"
      description="Categories group products."
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button>Save</Button>
        </>
      }
      {...extra}
    >
      <Field label="Category name" value="" onChange={() => {}} />
    </Dialog>
  );

  test('draws nothing while closed; when open it is a modal dialog named by its title and described by its sentence', () => {
    const { rerender } = render(form(false, () => {}));
    expect(screen.queryByRole('dialog')).toBeNull();
    rerender(form(true, () => {}));
    const dialog = screen.getByRole('dialog', { name: 'New category' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('Categories group products.');
  });

  test('focus moves in: to the first control, or to the control marked data-autofocus', () => {
    const first = render(form(true, () => {}));
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    first.unmount();
    render(
      <Dialog open onClose={() => {}} title="Pick">
        <Button>One</Button>
        <Button data-autofocus="">Two</Button>
      </Dialog>
    );
    expect(screen.getByRole('button', { name: 'Two' })).toHaveFocus();
  });

  test('a dialog with nothing to press takes focus itself', () => {
    render(<Dialog open title="Heads up" description="Nothing to do here." />);
    expect(screen.getByRole('dialog')).toHaveFocus();
  });

  test('focus is trapped: Tab from the last control goes to the first, and Shift+Tab the other way', () => {
    render(form(true, () => {}));
    const close = screen.getByRole('button', { name: 'Close' });
    const save = screen.getByRole('button', { name: 'Save' });
    save.focus();
    userEvent.tab();
    expect(close).toHaveFocus();
    userEvent.tab({ shift: true });
    expect(save).toHaveFocus();
  });

  test('focus that strays outside is pulled back in', () => {
    render(
      <>
        <button type="button">Behind</button>
        {form(true, () => {})}
      </>
    );
    act(() => screen.getByRole('button', { name: 'Behind' }).focus());
    expect(screen.getByRole('dialog')).toContainElement(document.activeElement);
  });

  test('Escape closes it; a click outside does not', () => {
    const onClose = jest.fn();
    const { container } = render(form(true, onClose));
    fireEvent.mouseDown(document.querySelector('.nl-overlay'));
    userEvent.click(document.querySelector('.nl-overlay'));
    expect(onClose).not.toHaveBeenCalled();
    userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(container).toBeEmptyDOMElement(); // it is drawn in a portal, not here
  });

  test('closing returns focus to the button that opened it', () => {
    render(<WithOpener>{(open, close) => form(open, close)}</WithOpener>);
    userEvent.click(screen.getByRole('button', { name: 'Open it' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Open it' })).toHaveFocus();
  });

  test('the page behind does not scroll while it is open, and scrolls again after', () => {
    const { rerender } = render(form(true, () => {}));
    expect(document.body.style.overflow).toBe('hidden');
    rerender(form(false, () => {}));
    expect(document.body.style.overflow).toBe('');
  });

  test('while a save is running, Escape and Close wait', () => {
    const onClose = jest.fn();
    render(form(true, onClose, { busy: true }));
    userEvent.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-busy', 'true');
  });

  test('with two open, Escape closes only the top one', () => {
    const outer = jest.fn();
    const inner = jest.fn();
    render(
      <>
        <Dialog open onClose={outer} title="Outer">
          <Button>Outer button</Button>
        </Dialog>
        <Dialog open onClose={inner} title="Inner">
          <Button>Inner button</Button>
        </Dialog>
      </>
    );
    userEvent.keyboard('{Escape}');
    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();
  });

  test('Escape that closes an open Select inside does not also close the dialog', () => {
    const onClose = jest.fn();
    render(
      <Dialog open onClose={onClose} title="With a choice">
        <Select label="Method" options={[{ value: 'a', label: 'Cash' }]} value="a" onChange={() => {}} />
      </Dialog>
    );
    const select = screen.getByRole('combobox');
    select.focus();
    userEvent.keyboard('{ArrowDown}');
    expect(select).toHaveAttribute('aria-expanded', 'true');
    userEvent.keyboard('{Escape}');
    expect(select).toHaveAttribute('aria-expanded', 'false');
    expect(onClose).not.toHaveBeenCalled();
    userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('is a surface with a 14px corner, the dialog shadow and a 16px 700 title', () => {
    expect(block('.nl-dialog')).toMatch(/background:\s*var\(--surface\)/);
    expect(block('.nl-dialog')).toMatch(/border-radius:\s*var\(--radius-card\)/);
    expect(block('.nl-dialog')).toMatch(/box-shadow:\s*var\(--shadow-dialog\)/);
    expect(block('.nl-dialog__title')).toMatch(/font-size:\s*var\(--dialog-title-size\)/);
    expect(block('.nl-dialog__title')).toMatch(/font-weight:\s*var\(--font-weight-bold\)/);
    const tokens = fs.readFileSync(path.join(__dirname, '..', 'tokens.css'), 'utf8');
    expect(tokens).toMatch(/--dialog-title-size:\s*16px/);
    expect(tokens).toMatch(/--shadow-dialog:\s*0 12px 32px rgb\(var\(--ink-rgb\) \/ 0\.12\)/);
  });
});

describe('ConfirmDialog', () => {
  test('a destructive answer is red text and is never the default: focus starts on Cancel', () => {
    const onConfirm = jest.fn();
    render(<ConfirmDialog open title="Void sale 0033?" message="This cancels the sale." confirmLabel="Void sale" destructive onConfirm={onConfirm} onCancel={() => {}} />);
    const dialog = screen.getByRole('alertdialog', { name: 'Void sale 0033?' });
    expect(within(dialog).getByRole('button', { name: 'Void sale' })).toHaveClass('nl-btn--danger');
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();
    userEvent.keyboard('{Enter}');
    expect(onConfirm).not.toHaveBeenCalled();
  });

  test('Cancel is on the left and the answer on the right', () => {
    render(<ConfirmDialog open title="Delete?" confirmLabel="Delete" destructive onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label') || b.textContent)).toEqual(['Close', 'Cancel', 'Delete']);
  });

  test('a safe question puts focus on the answer', () => {
    render(<ConfirmDialog open title="Send the receipt?" confirmLabel="Send" onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Send' })).toHaveClass('nl-btn--primary');
  });

  test('Confirm and Cancel each report; Escape cancels', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    render(<ConfirmDialog open title="Delete?" confirmLabel="Delete" destructive onConfirm={onConfirm} onCancel={onCancel} />);
    userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    userEvent.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('while confirming, the answer shows its spinner and nothing can be dismissed', () => {
    const onCancel = jest.fn();
    render(<ConfirmDialog open title="Delete?" confirmLabel="Delete" destructive loading onConfirm={() => {}} onCancel={onCancel} />);
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    userEvent.keyboard('{Escape}');
    expect(onCancel).not.toHaveBeenCalled();
  });

  test('the Leave-the-till shape: three choices, first focus on Stay', () => {
    render(
      <Dialog
        open
        onClose={() => {}}
        title="Leave the till?"
        footer={
          <>
            <Button variant="secondary">Hold sale and leave</Button>
            <Button variant="danger">Leave and clear</Button>
            <Button data-autofocus="">Stay</Button>
          </>
        }
      />
    );
    expect(screen.getByRole('button', { name: 'Stay' })).toHaveFocus();
  });
});

describe('Menu', () => {
  const run = (name) => jest.fn(() => name);
  const setup = (props = {}) => {
    const actions = { open: run('open'), print: run('print'), void: run('void') };
    render(
      <Menu
        label="More actions for sale 0033"
        items={[
          { label: 'Void sale', destructive: true, onClick: actions.void },
          { label: 'Open details', onClick: actions.open },
          { label: 'Print receipt', onClick: actions.print },
          { label: 'Send on WhatsApp', disabled: true },
        ]}
        {...props}
      />
    );
    return actions;
  };
  const trigger = () => screen.getByRole('button', { name: 'More actions for sale 0033' });
  const names = () => screen.getAllByRole('menuitem').map((i) => i.textContent);

  test('the button is named for screen readers, announces a menu, and starts closed', () => {
    setup();
    expect(trigger()).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(trigger().querySelector('[data-icon="more"]')).not.toBeNull();
  });

  test('a menu with words on its button shows them', () => {
    render(
      <Menu label="New" variant="primary" icon="plus" items={[{ label: 'Sale' }]}>
        New
      </Menu>
    );
    expect(screen.getByRole('button', { name: 'New' })).toHaveTextContent('New');
  });

  test('a click opens it and focus moves to the first action; the destructive action is last, after a divider', () => {
    setup();
    userEvent.click(trigger());
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu', { name: 'More actions for sale 0033' })).toBeInTheDocument();
    expect(names()).toEqual(['Open details', 'Print receipt', 'Send on WhatsApp', 'Void sale']);
    expect(screen.getByRole('menuitem', { name: 'Open details' })).toHaveFocus();
    expect(screen.getByRole('menuitem', { name: 'Void sale' })).toHaveClass('is-destructive');
    expect(screen.getByRole('separator')).toBeInTheDocument();
    expect(block('.nl-menu__item.is-destructive')).toMatch(/color:\s*var\(--bad\)/);
  });

  test('the arrow keys open it and move, wrap, skip a disabled action; Home and End jump', () => {
    setup();
    trigger().focus();
    userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Open details' })).toHaveFocus();
    userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Print receipt' })).toHaveFocus();
    userEvent.keyboard('{ArrowDown}'); // Send on WhatsApp is disabled
    expect(screen.getByRole('menuitem', { name: 'Void sale' })).toHaveFocus();
    userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Open details' })).toHaveFocus();
    userEvent.keyboard('{ArrowUp}');
    expect(screen.getByRole('menuitem', { name: 'Void sale' })).toHaveFocus();
    userEvent.keyboard('{Home}');
    expect(screen.getByRole('menuitem', { name: 'Open details' })).toHaveFocus();
    userEvent.keyboard('{End}');
    expect(screen.getByRole('menuitem', { name: 'Void sale' })).toHaveFocus();
  });

  test('the Up arrow opens it on the last action', () => {
    setup();
    trigger().focus();
    userEvent.keyboard('{ArrowUp}');
    expect(screen.getByRole('menuitem', { name: 'Void sale' })).toHaveFocus();
  });

  test('typing a letter jumps to the action that starts with it', () => {
    setup();
    jest.useFakeTimers();
    userEvent.click(trigger());
    userEvent.keyboard('p');
    expect(screen.getByRole('menuitem', { name: 'Print receipt' })).toHaveFocus();
    act(() => jest.advanceTimersByTime(800)); // the letters typed so far are forgotten
    userEvent.keyboard('v');
    expect(screen.getByRole('menuitem', { name: 'Void sale' })).toHaveFocus();
    jest.useRealTimers();
  });

  test('Escape closes it and puts focus back on the button', () => {
    setup();
    userEvent.click(trigger());
    userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(trigger()).toHaveFocus();
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
  });

  test('choosing an action closes the menu, returns focus to the button, then runs the action', () => {
    const actions = setup();
    userEvent.click(trigger());
    userEvent.keyboard('{ArrowDown}{Enter}');
    expect(actions.print).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(trigger()).toHaveFocus();
  });

  test('a disabled action does nothing', () => {
    const actions = setup();
    userEvent.click(trigger());
    userEvent.click(screen.getByRole('menuitem', { name: 'Send on WhatsApp' }));
    expect(Object.values(actions).every((a) => a.mock.calls.length === 0)).toBe(true);
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  test('a click outside closes it', () => {
    render(
      <>
        <button type="button">Elsewhere</button>
        <Menu label="Actions" items={[{ label: 'One' }]} />
      </>
    );
    userEvent.click(screen.getByRole('button', { name: 'Actions' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Elsewhere' }));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  test('Tab closes it and the focus carries on from the button', () => {
    setup();
    userEvent.click(trigger());
    userEvent.tab();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  test('the list is drawn outside its surroundings, so a table or card cannot clip it', () => {
    const { container } = render(
      <div style={{ overflow: 'hidden' }}>
        <Menu label="Actions" items={[{ label: 'One' }]} />
      </div>
    );
    userEvent.click(screen.getByRole('button', { name: 'Actions' }));
    expect(container.querySelector('[role="menu"]')).toBeNull();
    expect(document.body.querySelector(':scope > [role="menu"]')).not.toBeNull();
    expect(block('.nl-menu')).toMatch(/position:\s*fixed/);
    expect(block('.nl-menu')).toMatch(/box-shadow:\s*var\(--shadow-menu\)/);
  });

  describe('placement', () => {
    const sizes = { width: 180, height: 100 };
    beforeEach(() => {
      Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => sizes.width });
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => sizes.height });
    });
    afterEach(() => {
      delete HTMLElement.prototype.offsetWidth;
      delete HTMLElement.prototype.offsetHeight;
    });
    const at = (rect) => {
      const spy = jest.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function rectOf() {
        return this.getAttribute('aria-haspopup') ? { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.right - rect.left, height: rect.bottom - rect.top } : { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 };
      });
      return spy;
    };
    afterEach(() => jest.restoreAllMocks());

    test('opens below the button, lined up with its right edge', () => {
      at({ left: 400, right: 440, top: 100, bottom: 132 });
      render(<Menu label="Actions" items={[{ label: 'One' }]} />);
      userEvent.click(screen.getByRole('button', { name: 'Actions' }));
      const style = screen.getByRole('menu').style;
      expect(style.top).toBe('136px');
      expect(style.left).toBe('260px');
    });

    test('flips above the button when there is no room below', () => {
      at({ left: 400, right: 440, top: 700, bottom: 732 });
      render(<Menu label="Actions" items={[{ label: 'One' }]} />);
      userEvent.click(screen.getByRole('button', { name: 'Actions' }));
      expect(screen.getByRole('menu').style.top).toBe('596px');
    });

    test('stays inside the window at the left edge', () => {
      at({ left: 0, right: 40, top: 100, bottom: 132 });
      render(<Menu label="Actions" items={[{ label: 'One' }]} />);
      userEvent.click(screen.getByRole('button', { name: 'Actions' }));
      expect(screen.getByRole('menu').style.left).toBe('8px');
    });
  });

  test('actions are 32px high, 44px on a phone', () => {
    expect(block('.nl-menu__item')).toMatch(/min-height:\s*var\(--control-height-small\)/);
    expect(css).toMatch(/@media \(max-width: 767px\)\s*\{\s*\.nl-menu__item\s*\{\s*min-height:\s*var\(--control-height-till\)/);
  });
});

describe('Toast', () => {
  const Buttons = () => {
    const toast = useToast();
    return (
      <>
        <button type="button" onClick={() => toast.success('Sale complete, KES 100')}>success</button>
        <button type="button" onClick={() => toast.info('Held sales are kept on this device')}>info</button>
        <button type="button" onClick={() => toast.error('Could not save')}>error</button>
      </>
    );
  };
  const setup = () =>
    render(
      <ToastProvider>
        <Buttons />
      </ToastProvider>
    );
  const press = (name) => userEvent.click(screen.getByRole('button', { name }));

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('a success is announced politely, with a check and the words', () => {
    setup();
    press('success');
    const status = screen.getByRole('status');
    expect(within(status).getByText('Sale complete, KES 100')).toBeInTheDocument();
    expect(status.querySelector('[data-icon="check"]')).not.toBeNull();
  });

  test('an error is announced at once, with an alert icon and the words', () => {
    setup();
    press('error');
    const alert = screen.getByRole('alert');
    expect(within(alert).getByText('Could not save')).toBeInTheDocument();
    expect(alert.querySelector('[data-icon="alert"]')).not.toBeNull();
    expect(screen.getByRole('status')).not.toHaveTextContent('Could not save');
  });

  test('an info message has its own icon', () => {
    setup();
    press('info');
    expect(screen.getByRole('status').querySelector('[data-icon="info"]')).not.toBeNull();
  });

  test('a success stays at least 6 seconds, then goes', () => {
    expect(TOAST_MS).toBeGreaterThanOrEqual(6000);
    setup();
    press('success');
    act(() => jest.advanceTimersByTime(TOAST_MS - 1));
    expect(screen.getByText('Sale complete, KES 100')).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(1));
    expect(screen.queryByText('Sale complete, KES 100')).toBeNull();
  });

  test('an error stays until it is closed', () => {
    setup();
    press('error');
    act(() => jest.advanceTimersByTime(60000));
    expect(screen.getByText('Could not save')).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Close message' }));
    expect(screen.queryByText('Could not save')).toBeNull();
  });

  test('it pauses while the pointer is over it and carries on with the time that was left', () => {
    setup();
    press('success');
    act(() => jest.advanceTimersByTime(4000));
    const toast = screen.getByText('Sale complete, KES 100').closest('.nl-toast');
    fireEvent.mouseEnter(toast);
    act(() => jest.advanceTimersByTime(30000));
    expect(screen.getByText('Sale complete, KES 100')).toBeInTheDocument();
    fireEvent.mouseLeave(toast);
    act(() => jest.advanceTimersByTime(1999));
    expect(screen.getByText('Sale complete, KES 100')).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(1));
    expect(screen.queryByText('Sale complete, KES 100')).toBeNull();
  });

  test('it also pauses while keyboard focus is inside it', () => {
    setup();
    press('success');
    const close = screen.getByRole('button', { name: 'Close message' });
    act(() => close.focus());
    act(() => jest.advanceTimersByTime(30000));
    expect(screen.getByText('Sale complete, KES 100')).toBeInTheDocument();
    act(() => close.blur());
    act(() => jest.advanceTimersByTime(TOAST_MS));
    expect(screen.queryByText('Sale complete, KES 100')).toBeNull();
  });

  test('the same message is not stacked twice, and different ones stack', () => {
    setup();
    press('success');
    press('success');
    press('info');
    expect(screen.getAllByText('Sale complete, KES 100')).toHaveLength(1);
    expect(screen.getByText('Held sales are kept on this device')).toBeInTheDocument();
  });

  test('keeps clear of anything marked data-toast-keepout (the Till open and Held sales buttons)', () => {
    const rects = (el) => {
      if (el.hasAttribute('data-toast-keepout')) return { left: 300, right: 500, top: 8, bottom: 56, width: 200, height: 48 };
      if (el.classList.contains('nl-toasts')) return { left: 200, right: 600, top: 16, bottom: 80, width: 400, height: 64 };
      return { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 };
    };
    jest.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function rectOf() {
      return rects(this);
    });
    render(
      <ToastProvider>
        <button type="button" data-toast-keepout="">
          Held sales
        </button>
        <Buttons />
      </ToastProvider>
    );
    expect(document.querySelector('.nl-toasts').style.top).toBe('16px');
    press('success');
    expect(document.querySelector('.nl-toasts').style.top).toBe('64px'); // 56 + 8
    jest.restoreAllMocks();
  });

  test('is at the top centre, above a dialog and a menu', () => {
    expect(block('.nl-toasts')).toMatch(/left:\s*50%/);
    expect(block('.nl-toasts')).toMatch(/top:\s*var\(--space-4\)/);
    const z = (selector) => Number(block(selector).match(/z-index:\s*(\d+)/)[1]);
    expect(z('.nl-toasts')).toBeGreaterThan(z('.nl-menu'));
    expect(z('.nl-menu')).toBeGreaterThan(z('.nl-overlay'));
  });

  test('using it outside a provider says what is wrong', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Buttons />)).toThrow('useToast must be used inside a ToastProvider');
    spy.mockRestore();
  });
});

describe('Drawer', () => {
  const drawer = (open, close, extra = {}) => (
    <Drawer open={open} onClose={close} label="Main menu" {...extra}>
      <a href="/sales">Sales</a>
      <a href="/products">Products</a>
    </Drawer>
  );

  test('opens from a menu button as a modal named "Main menu", with focus inside', () => {
    render(<WithOpener>{(open, close) => drawer(open, close)}</WithOpener>);
    userEvent.click(screen.getByRole('button', { name: 'Open it' }));
    const dialog = screen.getByRole('dialog', { name: 'Main menu' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toContainElement(document.activeElement);
  });

  test('holds focus while open', () => {
    render(drawer(true, () => {}));
    const close = screen.getByRole('button', { name: 'Close menu' });
    const last = screen.getByRole('link', { name: 'Products' });
    last.focus();
    userEvent.tab();
    expect(close).toHaveFocus();
    userEvent.tab({ shift: true });
    expect(last).toHaveFocus();
  });

  test('closes with Escape, and focus returns to the menu button', () => {
    render(<WithOpener>{(open, close) => drawer(open, close)}</WithOpener>);
    userEvent.click(screen.getByRole('button', { name: 'Open it' }));
    userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Open it' })).toHaveFocus();
  });

  test('closes with a tap outside, but not with a tap inside', () => {
    const onClose = jest.fn();
    render(drawer(true, onClose));
    userEvent.click(screen.getByRole('link', { name: 'Sales' }));
    expect(onClose).not.toHaveBeenCalled();
    userEvent.click(document.querySelector('.nl-overlay--drawer'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('can close by itself when the window grows to 768px, where the sidebar is shown in place', () => {
    let listener;
    const query = { matches: false, addEventListener: (_, fn) => { listener = fn; }, removeEventListener: () => {} };
    const original = window.matchMedia;
    window.matchMedia = jest.fn(() => query);
    const onClose = jest.fn();
    render(drawer(true, onClose, { closeAtWidth: 768 }));
    expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 768px)');
    expect(onClose).not.toHaveBeenCalled();
    query.matches = true;
    act(() => listener());
    expect(onClose).toHaveBeenCalledTimes(1);
    window.matchMedia = original;
  });

  test('stays open on a wide screen unless it is told to close there (so it can be tried on the component page)', () => {
    const original = window.matchMedia;
    window.matchMedia = jest.fn(() => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} }));
    const onClose = jest.fn();
    render(drawer(true, onClose));
    expect(onClose).not.toHaveBeenCalled();
    window.matchMedia = original;
  });

  test('is 240px, the width of the sidebar, and does not slide for reduced motion', () => {
    expect(block('.nl-drawer')).toMatch(/width:\s*240px/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.nl-drawer\s*\{\s*animation: none/);
  });
});

describe('Styles', () => {
  test('uses no colour of its own: only tokens', () => {
    expect(css.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\brgba?\(\s*\d|\bhsla?\(/);
  });

  test('never removes an outline', () => {
    expect(css).not.toMatch(/outline:\s*(none|0)/);
  });
});

describe('On the component page', () => {
  const show = () =>
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/new-look/components']}>
          <ToastProvider>
            <ComponentPage />
          </ToastProvider>
        </MemoryRouter>
      </ThemeProvider>
    );

  test('the destructive confirm opens with focus on Cancel, and Cancel puts focus back on its button', () => {
    show();
    const opener = screen.getByRole('button', { name: 'Confirm a destructive action' });
    userEvent.click(opener);
    expect(screen.getByRole('alertdialog', { name: 'Void this sale?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    userEvent.keyboard('{Escape}');
    expect(opener).toHaveFocus();
  });

  test('Leave the till starts on Stay', () => {
    show();
    userEvent.click(screen.getByRole('button', { name: 'Leave the till' }));
    expect(screen.getByRole('button', { name: 'Stay' })).toHaveFocus();
  });

  test('the toast buttons raise toasts of each kind', () => {
    show();
    userEvent.click(screen.getByRole('button', { name: 'Success toast' }));
    userEvent.click(screen.getByRole('button', { name: 'Error toast' }));
    const toasts = within(document.querySelector('.nl-toasts'));
    expect(toasts.getByRole('status')).toHaveTextContent('Sale complete, KES 100');
    expect(toasts.getByRole('alert')).toHaveTextContent(/Could not save/);
  });

  test('a row menu in the sales list does not open the row, and Void sale asks first', () => {
    show();
    userEvent.click(screen.getByRole('button', { name: 'More actions for sale 0120' }));
    expect(screen.queryByRole('region', { name: /^Sale / })).toBeNull();
    userEvent.click(screen.getByRole('menuitem', { name: 'Void sale' }));
    expect(screen.getByRole('alertdialog', { name: 'Void sale 0120?' })).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Void sale' }));
    expect(within(document.querySelector('.nl-toasts')).getByRole('status')).toHaveTextContent(/Sale 0120 voided/);
  });

  test('Open details in a row menu opens the panel', () => {
    show();
    userEvent.click(screen.getByRole('button', { name: 'More actions for sale 0120' }));
    userEvent.click(screen.getByRole('menuitem', { name: 'Open details' }));
    expect(screen.getByRole('region', { name: 'Sale 0120' })).toBeInTheDocument();
  });
});
