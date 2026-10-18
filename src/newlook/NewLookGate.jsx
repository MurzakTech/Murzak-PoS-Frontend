import React, { lazy, Suspense } from 'react';
import { useNewLook } from './NewLookProvider';
import { PageSkeleton } from '../components/Common';

const NotFound = lazy(() => import('../pages/NotFound'));

/**
 * Lets a redesigned screen open only while this shop's New look switch is on.
 *
 * With the switch off the address behaves as it did before the redesign existed: the "page not found"
 * screen. While the answer is still being fetched (nothing saved on this device yet) it shows a loading
 * placeholder rather than flashing "not found".
 */
const NewLookGate = ({ children }) => {
  const { enabled, status } = useNewLook();

  if (status === 'loading' || status === 'idle') return <PageSkeleton />;
  if (!enabled) {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <NotFound />
      </Suspense>
    );
  }
  return children;
};

export default NewLookGate;
