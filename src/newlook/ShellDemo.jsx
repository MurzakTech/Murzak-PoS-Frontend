import React from 'react';
import { Card, Segmented } from './components';
import { useShellPreview } from './NewLookShell';

/**
 * The app shell on the component page (ticket P1-6). The shell is the frame this page is shown in: look at the
 * top bar, the sidebar and the page header above. Some parts need data that other tickets provide (the till, the
 * shop's locations, the + New menu), so this card switches sample versions of them on. Sample only; nothing here
 * is saved. Resize the window to see the sidebar change: 240px, 72px with icons, then a drawer below 768px.
 */
const row = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-3)' };
const label = { color: 'var(--ink-2)', fontWeight: 'var(--font-weight-semibold)' };

const ShellDemo = () => {
  const [preview, setPreview] = useShellPreview();
  const set = (patch) => setPreview({ ...preview, ...patch });

  return (
    <Card title="App shell" subtitle="Top bar 64px, sidebar 240px or 72px or a drawer, page header. Sample versions of the parts that wait for other tickets, and a switch for the redirects">
      <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
        <div style={row}>
          <span style={label}>Till</span>
          <Segmented
            size="small"
            label="Sample till state"
            value={preview.till}
            onChange={(till) => set({ till })}
            options={[
              { value: 'unknown', label: 'Not wired' },
              { value: 'closed', label: 'No till open' },
              { value: 'open', label: 'Till open' },
            ]}
          />
        </div>
        <div style={row}>
          <span style={label}>Locations</span>
          <Segmented
            size="small"
            label="Sample number of locations"
            value={preview.stores}
            onChange={(stores) => set({ stores })}
            options={[
              { value: 'one', label: 'One shop' },
              { value: 'two', label: 'Two shops' },
            ]}
          />
        </div>
        <div style={row}>
          <span style={label}>+ New menu</span>
          <Segmented
            size="small"
            label="+ New menu"
            value={preview.newMenu}
            onChange={(newMenu) => set({ newMenu })}
            options={[
              { value: 'role', label: 'For my role' },
              { value: 'all', label: 'All five' },
            ]}
          />
        </div>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: 'var(--caption-size)' }}>
          The Till open pill and Go to till stay clear of toasts. Press Ctrl K or / to search pages. Tab once from the top of the page to reach the skip link.
        </p>
      </div>
    </Card>
  );
};

export default ShellDemo;
