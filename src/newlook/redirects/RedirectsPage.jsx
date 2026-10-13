import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Segmented, StatusLabel, Table } from '../components';
import { PageHeader } from '../shell';
import S from '../strings';
import fill from '../labels/fill';
import { REDIRECTS } from './redirectTable';
import { toNewAddress } from './engine';
import { usePreviewRedirects, setPreview } from './live';

/**
 * Every old address and where it goes (acceptance check AC-06), for the owner to review. "Try it" opens the old
 * address; with the preview switched on it lands on the new page, and without it the current screen opens, as it
 * does for everyone until the new page is built. The assumptions behind "Needs a look" entries are listed in the note.
 */
const R = S.shell.redirectsPage;
const WORDS = { sure: R.status.sure, unclear: R.status.unclear, keep: R.status.keep };
const FILTERS = [
  { value: 'all', label: R.all },
  { value: 'unclear', label: WORDS.unclear },
  { value: 'sure', label: WORDS.sure },
  { value: 'keep', label: WORDS.keep },
];

const RedirectsPage = () => {
  const preview = usePreviewRedirects();
  const [filter, setFilter] = useState('all');
  const rows = useMemo(() => REDIRECTS.map((r, i) => ({ id: String(i), ...r })).filter((r) => filter === 'all' || r.status === filter), [filter]);

  const columns = [
    { key: 'from', header: R.columnOld, render: (r) => <code>{r.from}</code> },
    { key: 'to', header: R.columnNew, render: (r) => (r.to ? <code>{toNewAddress(r.to)}</code> : R.staysAsItIs) },
    { key: 'status', header: R.columnStatus, render: (r) => <StatusLabel status={r.status === 'sure' ? 'paid' : r.status === 'unclear' ? 'unpaid' : 'part-returned'}>{WORDS[r.status]}</StatusLabel> },
    { key: 'note', header: R.columnNote },
    { key: 'try', header: <span className="nl-visually-hidden">{R.columnTry}</span>, render: (r) => (!r.from.includes(':') && r.from !== '*' ? <Link to={r.from}>{R.tryIt}</Link> : null) },
  ];

  return (
    <div style={{ display: 'grid', gap: 'var(--card-gap)' }}>
      <PageHeader title={R.title} subtitle={fill(R.subtitle, { count: REDIRECTS.length })} />
      <Card title={R.previewTitle} subtitle={R.previewSubtitle}>
        <Segmented
          label={R.previewTitle}
          value={preview ? 'on' : 'off'}
          onChange={(v) => setPreview(v === 'on')}
          options={[
            { value: 'off', label: R.off },
            { value: 'on', label: R.on },
          ]}
        />
      </Card>
      <Segmented label={R.show} size="small" value={filter} onChange={setFilter} options={FILTERS} />
      <Table caption={R.tableCaption} columns={columns} rows={rows} />
    </div>
  );
};

export default RedirectsPage;
