import React, { useCallback, useEffect, useState } from 'react';
import Button from '../components/Button';
import Card from '../components/Card';
import { Chip } from '../components/Chip';
import { ConfirmDialog } from '../components/Dialog';
import EmptyState from '../components/EmptyState';
import Icon from '../components/Icon';
import Menu from '../components/Menu';
import Table from '../components/Table';
import { useAccess } from '../access/AccessProvider';
import { deactivatePerson, listTeam, reactivatePerson } from '../../api/teamApi';
import fill from '../labels/fill';
import PersonDialog from './PersonDialog';
import { canUseTill, isLastOwner } from './teamModel';
import useSettingsUser from './useSettingsUser';
import T from './strings.settings';

const P = T.team.people;
const ROW_KEY = 'email';

/**
 * Settings, Team and security, People (ticket P5-3): everyone in the shop with their role (Owner, Manager or Cashier),
 * whether their roles let them use the till, and whether they are active. An owner can add a person, change one, and
 * deactivate or reactivate one; a manager can look. This replaces the Staff page. Reading the team is the one new server
 * call (list_team); the changes are the staff calls the Staff page used.
 *
 *   load        injectable for tests; defaults to list_team
 *   api         { deactivate, reactivate } and the dialog's calls, injectable for tests
 */
const TeamPeople = ({ load = listTeam, api = {}, dialogApi }) => {
  const access = useAccess();
  const { company } = useSettingsUser();
  const owner = access.tier === 'owner';
  const calls = { deactivate: deactivatePerson, reactivate: reactivatePerson, ...api };
  const [state, setState] = useState({ status: 'loading', data: null });
  const [dialog, setDialog] = useState(null); // null, { member } (member null to add)
  const [asking, setAsking] = useState(null); // the person about to be deactivated
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [problem, setProblem] = useState('');

  const reload = useCallback(
    (quiet = false) => {
      if (!quiet) setState({ status: 'loading', data: null });
      return load({ company })
        .then((data) => setState({ status: 'ready', data }))
        .catch((e) => setState({ status: 'error', data: null, message: e.message }));
    },
    [company, load]
  );
  useEffect(() => {
    reload();
  }, [reload]);

  const done = () => {
    setDialog(null);
    setNotice(P.saved);
    setProblem('');
    reload(true);
  };

  const confirmDeactivate = async () => {
    setBusy(true);
    try {
      await calls.deactivate(asking.email);
      setAsking(null);
      setNotice(P.saved);
      setProblem('');
      await reload(true);
    } catch (e) {
      setAsking(null);
      setProblem(e.message);
    } finally {
      setBusy(false);
    }
  };

  const reactivate = async (member) => {
    try {
      await calls.reactivate(member.email);
      setNotice(P.saved);
      setProblem('');
      await reload(true);
    } catch (e) {
      setProblem(e.message);
    }
  };

  const data = state.data;
  const me = data && data.me;

  const menu = (member) => {
    const self = member.email === me;
    const last = isLastOwner(member, data.members);
    const items = [{ label: P.edit, onClick: () => setDialog({ member }) }];
    if (member.enabled) items.push({ label: P.deactivate, destructive: true, disabled: self || last, onClick: () => setAsking(member) });
    else items.push({ label: P.reactivate, onClick: () => reactivate(member) });
    return <Menu label={fill(P.moreFor, { name: member.full_name })} items={items} />;
  };

  const columns = [
    {
      key: 'person',
      header: P.columns.person,
      render: (m) => (
        <span className="nl-settings-person">
          <span className="nl-settings-person__name">
            {m.full_name}
            {m.email === me ? ` (${P.you})` : ''}
          </span>
          <span className="nl-settings-person__sub nl-settings-person__phone-only">
            {T.team.roles[m.tier]}, {canUseTill(m.roles) ? P.tillYes : P.tillNo}, {m.enabled ? P.active : P.deactivated}
          </span>
        </span>
      ),
    },
    { key: 'tier', header: P.columns.role, hideOnPhone: true, hideOnTablet: true, render: (m) => <Chip tone={m.tier === 'owner' ? 'brand' : 'neutral'}>{T.team.roles[m.tier]}</Chip> },
    {
      key: 'till',
      header: P.columns.till,
      hideOnPhone: true,
      hideOnTablet: true,
      render: (m) => (
        <Chip icon={canUseTill(m.roles) ? 'check' : 'x'}>{canUseTill(m.roles) ? P.tillYes : P.tillNo}</Chip>
      ),
    },
    { key: 'status', header: P.columns.status, hideOnPhone: true, hideOnTablet: true, render: (m) => <Chip icon={m.enabled ? 'check' : 'x'}>{m.enabled ? P.active : P.deactivated}</Chip> },
  ];
  if (owner) columns.push({ key: 'actions', header: P.columns.actions, align: 'right', render: (m) => menu(m) });

  let body;
  if (state.status === 'error' && /only an owner or a manager/i.test(state.message || '')) {
    body = <p className="nl-settings-hint">{P.noAccess}</p>;
  } else if (state.status === 'error') {
    body = <EmptyState icon="alert" tone="error" title={P.errorTitle} description={P.errorText} action={{ label: T.shell.retry, onClick: () => reload() }} level={3} />;
  } else {
    body = (
      <>
        {notice ? (
          <p className="nl-settings-notice" role="status">
            <Icon name="check" />
            {notice}
          </p>
        ) : null}
        {problem ? (
          <p className="nl-settings-error" role="alert">
            <Icon name="alert" />
            <span>{problem}</span>
          </p>
        ) : null}
        {data ? <p className="nl-settings-hint">{fill(P.counts, { active: data.counts.active, total: data.counts.total })}</p> : null}
        <Table
          caption={P.caption}
          columns={columns}
          rows={data ? data.members : []}
          rowKey={ROW_KEY}
          className="is-compact"
          loading={state.status === 'loading'}
          empty={{ icon: 'user', title: P.emptyTitle, description: P.emptyText, action: owner ? { label: P.add, onClick: () => setDialog({ member: null }) } : undefined }}
        />
      </>
    );
  }

  return (
    <div className="nl-settings-card" data-card="people">
      <Card
        title={P.title}
        subtitle={P.subtitle}
        actions={
          owner && state.status === 'ready' ? (
            <Button icon="plus" onClick={() => setDialog({ member: null })}>
              {P.add}
            </Button>
          ) : null
        }
      >
        {!owner && state.status === 'ready' ? <p className="nl-settings-note">{P.addHint}</p> : null}
        {body}
      </Card>
      {dialog ? <PersonDialog member={dialog.member} members={data.members} tiers={data.tiers} me={me} company={data.company} onClose={() => setDialog(null)} onDone={done} onSaved={() => reload(true)} api={dialogApi} /> : null}
      <ConfirmDialog
        open={Boolean(asking)}
        title={asking ? fill(T.team.deactivate.title, { name: asking.full_name }) : ''}
        message={asking ? fill(T.team.deactivate.message, { name: asking.full_name }) : ''}
        confirmLabel={T.team.deactivate.confirm}
        cancelLabel={T.team.deactivate.cancel}
        destructive
        loading={busy}
        onConfirm={confirmDeactivate}
        onCancel={() => setAsking(null)}
      />
    </div>
  );
};

export default TeamPeople;
