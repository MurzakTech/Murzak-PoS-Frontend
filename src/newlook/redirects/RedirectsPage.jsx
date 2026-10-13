import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Segmented, StatusLabel, Table } from '../components';
import { PageHeader } from '../shell';
import { REDIRECTS } from './redirectTable';
import { toNewAddress } from './engine';
import { usePreviewRedirects, setPreview } from './live';

/**
 * Every old address and where it goes (acceptance check AC-06), for the owner to review. "Try it" opens the old
 * address; with the preview switched on it lands on the new page, and without it the current screen opens, as it
 * does for everyone until the new page is built. The assumptions behind "Needs a look" entries are listed in the note.
 */
const WORDS = { sure: 'Clear in the Spec', unclear: 'Needs a look', keep: 'Outside the redesign' };
const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'unclear', label: 'Needs a look' },
  { value: 'sure', label: 'Clear in the Spec' },
  { value: 'keep', label: 'Outside the redesign' },
];

const RedirectsPage = () => {
  const preview = usePreviewRedirects();
  const [filter, setFilter] = useState('all');
  const rows = useMemo(() => REDIRECTS.map((r, i) => ({ id: String(i), ...r })).filter((r) => filter === 'all' || r.status === filter), [filter]);

  const columns = [
    { key: 'from', header: 'Old address', render: (r) => <code>{r.from}</code> },
    { key: 'to', header: 'New page', render: (r) => (r.to ? <code>{toNewAddress(r.to)}</code> : 'Stays as it is') },
    { key: 'status', header: 'Status', render: (r) => <StatusLabel status={r.status === 'sure' ? 'paid' : r.status === 'unclear' ? 'unpaid' : 'part-returned'}>{WORDS[r.status]}</StatusLabel> },
    { key: 'note', header: 'Note' },
    { key: 'try', header: <span className="nl-visually-hidden">Try it</span>, render: (r) => (!r.from.includes(':') && r.from !== '*' ? <Link to={r.from}>Try it</Link> : null) },
  ];

  return (
    <div style={{ display: 'grid', gap: 'var(--card-gap)' }}>
      <PageHeader title="Old addresses" subtitle={`${REDIRECTS.length} old addresses and the new pages they lead to.`} />
      <Card title="Preview the redirects" subtitle="Only on this device. Off, every old address keeps opening the current screen until its new page is built">
        <Segmented
          label="Preview the redirects"
          value={preview ? 'on' : 'off'}
          onChange={(v) => setPreview(v === 'on')}
          options={[
            { value: 'off', label: 'Off' },
            { value: 'on', label: 'On' },
          ]}
        />
      </Card>
      <Segmented label="Show" size="small" value={filter} onChange={setFilter} options={FILTERS} />
      <Table caption="Old addresses and their new pages" columns={columns} rows={rows} />
    </div>
  );
};

export default RedirectsPage;
