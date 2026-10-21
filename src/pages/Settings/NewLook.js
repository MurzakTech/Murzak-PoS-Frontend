import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import PageHeader from '../../newlook/shell/PageHeader';
import { Button, Card, Switch, ConfirmDialog, Icon, Badge } from '../../newlook/components';
import { useNewLook } from '../../newlook/NewLookProvider';

/**
 * Settings > New look. Owners only.
 * Migrated to NewLook design tokens and components (0 MUI imports).
 */
const NewLook = () => {
  const { enabled, status, company, setEnabled } = useNewLook();
  const [confirmOn, setConfirmOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const known = status === 'ready' || status === 'error';

  const save = async (value) => {
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      await setEnabled(value);
      setSaved(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      setConfirmOn(false);
    }
  };

  const onToggle = (checked) => {
    if (checked) setConfirmOn(true);
    else save(false);
  };

  return (
    <div style={{ padding: '0 var(--page-gutter)', maxWidth: 840 }}>
      <PageHeader
        title="New look"
        subtitle="Show this shop the redesigned screens"
      />

      {status === 'error' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-input)',
            backgroundColor: 'var(--soft)',
            color: 'var(--warn)',
            border: '1px solid var(--line)',
            marginBottom: 'var(--space-4)',
            fontSize: 'var(--body-size)',
          }}
        >
          <Icon name="alert" />
          <span>We could not check the setting just now, so this page may be out of date. Reload to try again.</span>
        </div>
      )}

      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-input)',
            backgroundColor: 'var(--soft)',
            color: 'var(--bad)',
            border: '1px solid var(--bad)',
            marginBottom: 'var(--space-4)',
            fontSize: 'var(--body-size)',
          }}
          role="alert"
        >
          <Icon name="alert" />
          <span>{error}</span>
        </div>
      )}

      <Card style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
          <h2 style={{ fontSize: 'var(--card-title-size)', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
            New look{company ? ` for ${company}` : ''}
          </h2>
          {known ? (
            <Badge tone={enabled ? 'positive' : 'neutral'}>
              {enabled ? 'On' : 'Off'}
            </Badge>
          ) : (
            <span style={{ fontSize: 'var(--caption-size)', color: 'var(--muted)' }}>Checking...</span>
          )}
        </div>

        <p style={{ fontSize: 'var(--body-size)', color: 'var(--muted)', lineHeight: 1.6, margin: '0 0 var(--space-6) 0' }}>
          The New look is on by default. While it is on, people see the redesigned screens, and the few screens that have not
          been redesigned stay as they were. If you turn it off, everyone in the shop sees the app exactly as it was before. You
          can switch back at any time; no sale, stock figure or account changes either way.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <Switch
            id="toggle-newlook"
            checked={enabled}
            onChange={onToggle}
            disabled={!known || busy}
          />
          <label htmlFor="toggle-newlook" style={{ fontSize: 'var(--body-size)', fontWeight: 600, color: 'var(--ink)', cursor: 'pointer' }}>
            Use the New look in this shop
          </label>
        </div>

        <div style={{ minHeight: 28, marginTop: 'var(--space-2)' }} aria-live="polite">
          {busy && <span style={{ fontSize: 'var(--caption-size)', color: 'var(--muted)' }}>Saving...</span>}
          {saved && !busy && (
            <span style={{ fontSize: 'var(--body-size)', color: 'var(--good)', fontWeight: 600 }}>
              Saved. The change reaches each device the next time it signs in or reloads.
            </span>
          )}
        </div>

        {enabled && (
          <div style={{ marginTop: 'var(--space-4)' }}>
            <Button as={RouterLink} to="/" variant="secondary">
              Open Home
            </Button>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={confirmOn}
        onClose={() => setConfirmOn(false)}
        onConfirm={() => save(true)}
        loading={busy}
        title="Turn on the New look?"
        message="Everyone who signs in at this shop will see the redesigned screens that are ready. It is best to do this when the till is closed or no cashier has items in the cart. You can switch it off again here at any time."
        confirmText="Turn on"
        cancelText="Keep it off"
      />
    </div>
  );
};

export default NewLook;
