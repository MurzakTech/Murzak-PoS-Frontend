import React from 'react';
import { useNavigate } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import { SkeletonText } from '../components/Skeleton';
import { PageHeader } from '../shell';
import { useAccess } from '../access/AccessProvider';
import { isPageLive, usePreviewRedirects } from '../redirects/live';
import { toNewAddress } from '../redirects/engine';
import T from './strings.expenses';

/**
 * Lets only an owner or a manager through to the Expenses pages (ticket P5-1). Until the server has said who the person is nothing is
 * drawn but a short wait; a cashier (or anyone whose role cannot be told) sees a plain message with a way back to Home. The server
 * refuses a cashier's request as well: this only chooses what to draw.
 */
const ExpensesGate = ({ children }) => {
  const access = useAccess();
  const navigate = useNavigate();
  const previewOn = usePreviewRedirects();
  const allowed = access.tier === 'owner' || access.tier === 'manager';
  const waiting = !access.tier && (access.status === 'idle' || access.status === 'loading');
  // Home is the canonical redesigned page
  const home = isPageLive('/', previewOn) ? toNewAddress('/') : '/';

  if (allowed) return children;
  if (waiting) {
    return (
      <div>
        <PageHeader title={T.title} subtitle={T.subtitle} />
        <SkeletonText lines={4} />
      </div>
    );
  }
  return (
    <div>
      <PageHeader title={T.title} subtitle={T.subtitle} />
      <EmptyState icon="alert" title={T.noAccess.title} description={T.noAccess.text} action={{ label: T.noAccess.home, onClick: () => navigate(home) }} />
    </div>
  );
};

export default ExpensesGate;
