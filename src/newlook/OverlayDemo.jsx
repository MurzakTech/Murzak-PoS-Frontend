import React, { useState } from 'react';
import { Button, Card, ConfirmDialog, Dialog, Drawer, Field, Menu, useToast } from './components';

/**
 * The overlay components with sample content (ticket P1-5): a form dialog, a destructive confirm, the three-way
 * Leave-the-till dialog, a "+ New" menu, the toast kinds and the drawer. Nothing here is saved anywhere.
 */
const row = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-3)' };
const note = { margin: 'var(--space-3) 0 0', color: 'var(--muted)', fontSize: 'var(--caption-size)' };

const OverlayDemo = () => {
  const toast = useToast();
  const [form, setForm] = useState(false);
  const [name, setName] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [leave, setLeave] = useState(false);
  const [drawer, setDrawer] = useState(false);

  const newItems = ['Sale', 'Product', 'Customer', 'Expense', 'Purchase'].map((label) => ({ label, onClick: () => toast.info(`New ${label.toLowerCase()} (demo, nothing was created)`) }));

  return (
    <Card title="Dialog, menu, toast and drawer" subtitle="Focus moves in, stays inside and returns; Escape closes. Try them with the keyboard only">
      <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
        <div>
          <div style={row}>
            <Button variant="secondary" onClick={() => setForm(true)}>
              Open a dialog
            </Button>
            <Button variant="secondary" onClick={() => setConfirm(true)}>
              Confirm a destructive action
            </Button>
            <Button variant="secondary" onClick={() => setLeave(true)}>
              Leave the till
            </Button>
          </div>
          <p style={note}>
            A dialog does not close when you click outside it. In the confirm, focus starts on Cancel, so pressing Enter at once cannot destroy anything. In Leave the till, focus starts on Stay.
          </p>
        </div>

        <div>
          <div style={row}>
            <Menu label="New" variant="primary" size="default" icon="plus" items={newItems}>
              New
            </Menu>
            <Menu
              label="More actions for this demo"
              items={[
                { label: 'Open details', onClick: () => toast.info('Open details (demo)') },
                { label: 'Print receipt', onClick: () => toast.success('Receipt sent to the printer (demo)') },
                { label: 'Void sale', destructive: true, onClick: () => setConfirm(true) },
                { label: 'Send on WhatsApp', disabled: true },
              ]}
            />
          </div>
          <p style={note}>Arrow keys move, a letter jumps to a match, Escape closes. The destructive action is always last and red. The three dots also sit on every row of the sales list above.</p>
        </div>

        <div>
          <div style={row}>
            <Button variant="secondary" icon="check" onClick={() => toast.success('Sale complete, KES 100')}>
              Success toast
            </Button>
            <Button variant="secondary" icon="info" onClick={() => toast.info('Held sales are kept on this device')}>
              Info toast
            </Button>
            <Button variant="secondary" icon="alert" onClick={() => toast.error('Could not save. Check your connection and try again.')}>
              Error toast
            </Button>
          </div>
          <p style={note}>A toast stays at least 6 seconds and pauses while you point at it. An error stays until you close it.</p>
        </div>

        <div>
          <div style={row}>
            <Button variant="secondary" icon="menu" onClick={() => setDrawer(true)}>
              Open the drawer
            </Button>
          </div>
          <p style={note}>On real screens the drawer is the sidebar below 768px, opened from a menu button. Escape or a tap outside closes it.</p>
        </div>
      </div>

      <Dialog
        open={form}
        onClose={() => setForm(false)}
        title="New category"
        description="Categories group products on the till."
        footer={
          <>
            <Button variant="secondary" onClick={() => setForm(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setForm(false);
                toast.success('Saved');
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <Field label="Category name" value={name} onChange={setName} placeholder="For example, Drinks" />
      </Dialog>

      <ConfirmDialog
        open={confirm}
        title="Void this sale?"
        message="In a real shop this cancels the sale and cannot be undone. Here it is a demo and nothing is saved."
        confirmLabel="Void sale"
        destructive
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          toast.success('Sale voided (demo, nothing was changed)');
        }}
      />

      <Dialog
        open={leave}
        onClose={() => setLeave(false)}
        title="Leave the till?"
        description="This sale has 3 items that are not paid for."
        footer={
          <>
            <Button variant="secondary" onClick={() => setLeave(false)}>
              Hold sale and leave
            </Button>
            <Button variant="danger" onClick={() => setLeave(false)}>
              Leave and clear
            </Button>
            <Button onClick={() => setLeave(false)} data-autofocus="">
              Stay
            </Button>
          </>
        }
      />

      <Drawer open={drawer} onClose={() => setDrawer(false)} label="Main menu">
        <nav aria-label="Demo menu" style={{ display: 'grid', gap: 'var(--space-1)' }}>
          {['Home', 'Sales', 'Products', 'Customers', 'Reports'].map((label) => (
            <Button key={label} variant="ghost" onClick={() => setDrawer(false)} style={{ justifyContent: 'flex-start' }}>
              {label}
            </Button>
          ))}
        </nav>
      </Drawer>
    </Card>
  );
};

export default OverlayDemo;
