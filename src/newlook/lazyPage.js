import { lazy } from 'react';

/**
 * A page that loads only when its address is opened (route-level code splitting, ticket P6-3). The result is an ordinary React.lazy
 * component with a readable `pageName`, so a test can say which page a route opens without loading it.
 */
export const lazyPage = (load, name) => {
  const Page = lazy(load);
  Page.pageName = name;
  return Page;
};

/** The same for a page the module exports by name rather than as its default */
export const lazyNamed = (load, exportName, pageName = exportName) => lazyPage(() => load().then((module) => ({ default: module[exportName] })), pageName);
