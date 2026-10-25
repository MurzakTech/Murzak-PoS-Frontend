import React, { useCallback, useEffect, useRef, useState } from 'react';
import useRealtimeRefresh, { pollEvery } from '../../hooks/useRealtimeRefresh';
import {
  createInvoiceForOnlineOrder,
  getOnlineOrder,
  listOnlineOrders,
  markOnlineOrderPaid,
  setOnlineOrderStatus,
} from '../../api/onlineStoreApi';
import Button from '../components/Button';
import Card from '../components/Card';
import { Chip } from '../components/Chip';
import Dialog, { ConfirmDialog } from '../components/Dialog';
import Menu from '../components/Menu';
import Pagination from '../components/Pagination';
import Segmented from '../components/Segmented';
import Table from '../components/Table';
import { useToast } from '../components/Toast';
import { formatDate } from '../components/dates';
import { formatMoney } from '../components/format';
import fill from '../labels/fill';
import S from './strings.ecommerce';
import { orderMessage, printHtml, slipHtml, waLink } from './shareModel';

const T = S.orders;
const STATUSES = ['New', 'Confirmed', 'Ready', 'Delivered', 'Cancelled'];
const FINISHED = ['Delivered', 'Cancelled'];
const POLL_MS = 30000;
const DEFAULT_SIZE = 20;
const ROW_KEY = 'name';

const OnlineOrdersTab = ({ company }) => {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [data, setData] = useState({ rows: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState('');
  const [detail, setDetail] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const latest = useRef(0);

  const load = useCallback(
    async (quiet = false) => {
      const id = ++latest.current;
      if (!quiet) setLoading(true);
      try {
        const result = await listOnlineOrders({ company, status: status || undefined, page, pageSize: size });
        if (id !== latest.current) return;
        setData({ rows: result.rows, total: result.total });
        setFailed(false);
      } catch (error) {
        if (id === latest.current && !quiet) setFailed(true);
      } finally {
        if (id === latest.current) setLoading(false);
      }
    },
    [company, status, page, size]
  );

  useEffect(() => {
    load();
  }, [load]);

  // A new order shows at once when the server says so; the slow poll is the safety net
  const live = useRealtimeRefresh({ kind: 'online_order', company, enabled: Boolean(company), onRefresh: () => load(true) });
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) load(true);
    }, pollEvery(POLL_MS, live));
    return () => clearInterval(timer);
  }, [load, live]);

  const run = async (row, action, message) => {
    setBusy(row.name);
    try {
      const result = await action();
      toast.success(typeof message === 'function' ? message(result) : message);
      await load(true);
    } catch (error) {
      toast.error(error.message || T.actionFailed);
    } finally {
      setBusy('');
    }
  };

  const advance = (row) => {
    const next = T.nextTo[row.status];
    return run(row, () => setOnlineOrderStatus({ order: row.name, status: next, company }), fill(T.statusChanged, { order: row.name, status: T.statuses[next] }));
  };
  const markPaid = (row) => run(row, () => markOnlineOrderPaid(row.name, company), fill(T.paidMarked, { order: row.name }));
  const makeInvoice = (row) => run(row, () => createInvoiceForOnlineOrder(row.name, company), (invoice) => fill(T.invoiceMade, { invoice }));
  const confirmCancel = async () => {
    const row = cancelling;
    await run(row, () => setOnlineOrderStatus({ order: row.name, status: 'Cancelled', company }), fill(T.statusChanged, { order: row.name, status: T.statuses.Cancelled }));
    setCancelling(null);
  };

  const messageCustomer = () => {
    const { row, order } = detail;
    const text = orderMessage({ order: row.name, customer: order.customer_name || order.customer, status: row.status, delivery: row.delivery_method });
    if (!text) {
      toast.info(T.noMessage);
      return;
    }
    window.open(waLink(text, order.phone), '_blank', 'noopener,noreferrer');
  };
  const printSlip = () => {
    const { row, order } = detail;
    const ok = printHtml(
      slipHtml({
        order: row.name,
        customer: order.customer_name || order.customer,
        phone: order.phone,
        address: order.address,
        delivery: row.delivery_method,
        lines: order.lines,
        total: order.grand_total,
      })
    );
    if (!ok) toast.error(T.slipBlocked);
  };

  const openDetail = async (row) => {
    setDetail({ row, order: null });
    try {
      const order = await getOnlineOrder(row.name, company);
      setDetail((current) => (current && current.row.name === row.name ? { row, order } : current));
    } catch (error) {
      setDetail(null);
      toast.error(error.message || T.actionFailed);
    }
  };

  const columns = [
    {
      key: 'name',
      header: T.columns.order,
      nowrap: true,
      render: (r) => (
        <div>
          <strong>{r.name}</strong>
          <span className="nl-stock-sub">{formatDate(String(r.creation || '').slice(0, 10))}</span>
        </div>
      ),
    },
    {
      key: 'customer',
      header: T.columns.customer,
      render: (r) => (
        <div>
          <strong>{r.customer_name || r.customer}</strong>
          <span className="nl-stock-sub">{r.phone}</span>
        </div>
      ),
    },
    { key: 'channel', header: T.columns.channel, hideOnPhone: true, render: (r) => T.channels[r.channel] || r.channel },
    { key: 'grand_total', header: T.columns.total, money: true },
    {
      key: 'payment',
      header: T.columns.payment,
      hideOnPhone: true,
      render: (r) => (
        <div>
          <Chip tone={r.paid ? 'brand' : 'neutral'}>{r.paid ? T.paid : T.notPaid}</Chip>
          <span className="nl-stock-sub">{r.payment}</span>
        </div>
      ),
    },
    {
      key: 'delivery',
      header: T.columns.delivery,
      hideOnTablet: true,
      render: (r) => (
        <div>
          {r.delivery_method === 'Pickup' ? T.pickup : T.delivery}
          <span className="nl-stock-sub">{r.address}</span>
        </div>
      ),
    },
    { key: 'status', header: T.columns.status, render: (r) => <Chip tone={r.status === 'New' ? 'brand' : 'neutral'}>{T.statuses[r.status] || r.status}</Chip> },
    {
      key: 'actions',
      header: T.columns.actions,
      render: (r) => {
        const finished = FINISHED.includes(r.status);
        const items = [
          { label: T.view, onClick: () => openDetail(r) },
          !r.paid && r.status !== 'Cancelled' && { label: T.markPaid, onClick: () => markPaid(r) },
          r.status !== 'Cancelled' && { label: T.makeInvoice, onClick: () => makeInvoice(r) },
          !finished && { label: T.cancel, destructive: true, onClick: () => setCancelling(r) },
        ].filter(Boolean);
        return (
          <div className="nl-store__row-actions">
            {T.next[r.status] ? (
              <Button size="small" loading={busy === r.name} disabled={Boolean(busy)} onClick={() => advance(r)}>
                {T.next[r.status]}
              </Button>
            ) : null}
            <Menu label={fill(T.more, { order: r.name })} items={items} />
          </div>
        );
      },
    },
  ];

  const filters = [{ value: '', label: T.all }, ...STATUSES.map((value) => ({ value, label: T.statuses[value] }))];
  const empty = status ? T.emptyFiltered : T.empty;

  return (
    <div className="nl-store">
      <Card title={T.title} subtitle={T.intro}>
        <div className="nl-store__filters">
          <Segmented
            label={T.filterLabel}
            size="small"
            options={filters}
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          />
          <Button variant="ghost" size="small" onClick={() => load()}>
            {T.refresh}
          </Button>
        </div>
        <Table
          caption={T.caption}
          columns={columns}
          rows={data.rows}
          rowKey={ROW_KEY}
          loading={loading}
          error={failed}
          onRetry={() => load()}
          onRowOpen={openDetail}
          empty={empty}
        />
        <Pagination
          page={page}
          size={size}
          total={data.total}
          shown={data.rows.length}
          onPage={setPage}
          onSize={(next) => {
            setSize(next);
            setPage(1);
          }}
        />
        {live ? <p className="nl-store__help">{T.live}</p> : null}
      </Card>

      <ConfirmDialog
        open={Boolean(cancelling)}
        title={cancelling ? fill(T.cancelTitle, { order: cancelling.name }) : ''}
        message={T.cancelMessage}
        confirmLabel={T.cancelConfirm}
        cancelLabel={T.cancelKeep}
        destructive
        loading={Boolean(busy)}
        onConfirm={confirmCancel}
        onCancel={() => setCancelling(null)}
      />

      <Dialog
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail ? fill(T.detailTitle, { order: detail.row.name }) : ''}
        closeLabel={T.close}
        footer={
          <>
            {detail && detail.order ? (
              <>
                <Button variant="secondary" onClick={printSlip}>
                  {T.printSlip}
                </Button>
                <Button variant="secondary" onClick={messageCustomer}>
                  {T.messageCustomer}
                </Button>
              </>
            ) : null}
            <Button variant="secondary" onClick={() => setDetail(null)}>
              {T.close}
            </Button>
          </>
        }
      >
        {detail && detail.order ? (
          <div className="nl-store__detail">
            <dl className="nl-store__facts">
              <div>
                <dt>{T.customer}</dt>
                <dd>{detail.order.customer_name || detail.order.customer}</dd>
              </div>
              {detail.order.phone ? (
                <div>
                  <dt>{T.phone}</dt>
                  <dd>{detail.order.phone}</dd>
                </div>
              ) : null}
              {detail.order.address ? (
                <div>
                  <dt>{T.address}</dt>
                  <dd>{detail.order.address}</dd>
                </div>
              ) : null}
            </dl>
            <table className="nl-store__lines">
              <thead>
                <tr>
                  <th scope="col">{T.product}</th>
                  <th scope="col">{T.quantity}</th>
                  <th scope="col">{T.price}</th>
                  <th scope="col">{T.amount}</th>
                </tr>
              </thead>
              <tbody>
                {detail.order.lines.map((line) => (
                  <tr key={line.item_code}>
                    <td>{line.item_name || line.item_code}</td>
                    <td>{line.qty}</td>
                    <td>{formatMoney(line.rate)}</td>
                    <td>{formatMoney(line.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" colSpan={3}>
                    {T.total}
                  </th>
                  <td>{formatMoney(detail.order.grand_total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
};

export default OnlineOrdersTab;
