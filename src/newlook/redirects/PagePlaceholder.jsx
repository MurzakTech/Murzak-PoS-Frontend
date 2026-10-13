import React from 'react';
import { matchPath, useLocation, useNavigate } from 'react-router-dom';
import { Card, EmptyState } from '../components';
import { PageHeader } from '../shell';
import S from '../strings';
import { NEW_PAGES } from './redirectTable';
import { NEW_LOOK_PREFIX, oldAddressFor } from './engine';

/**
 * The page a new address shows until its real screen is built. It names the page and sends the person back to the
 * current screen that does the same job, so nobody is stranded. Each ticket that builds a page replaces this
 * placeholder with the real screen and adds the page to BUILT_PAGES (live.js).
 */
const PagePlaceholder = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const page = NEW_PAGES.find((p) => matchPath({ path: `${NEW_LOOK_PREFIX}${p.path === '/' ? '' : p.path}`, end: true }, pathname));
  const title = page ? page.title : S.shell.placeholder.fallbackTitle;
  const old = page ? oldAddressFor(page.path) : null;

  return (
    <div>
      <PageHeader title={title} subtitle={S.shell.placeholder.subtitle} />
      <Card>
        <EmptyState
          icon="info"
          title={S.shell.placeholder.emptyTitle}
          description={S.shell.placeholder.emptyDescription}
          action={old ? { label: S.shell.placeholder.openCurrent, onClick: () => navigate(old) } : undefined}
        />
      </Card>
    </div>
  );
};

export default PagePlaceholder;
