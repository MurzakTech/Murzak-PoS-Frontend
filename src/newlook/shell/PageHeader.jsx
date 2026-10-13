import React, { useEffect } from 'react';
import Tabs from '../components/Tabs';

/**
 * The page header (Part 1, App shell and navigation): the title (28px, one per page), an optional one-line
 * subtitle, the page's own actions on the right (at most two), then tabs. Sub-pages are tabs, never a second menu.
 * The browser tab title is set to match ("Sales | Murzak POS"), so a person who lands on a page by a link, or
 * switches between windows, hears where they are.
 *
 *   actions  up to two Buttons (a third is reported while developing, as the Spec allows two)
 *   tabs     { label, tabs: [{ key, label, to, count? }], value } shown under the title
 */
export const MAX_HEADER_ACTIONS = 2;
export const SITE_NAME = 'Murzak POS';

const PageHeader = ({ title, subtitle, actions, tabs }) => {
  const count = React.Children.toArray(actions).length;
  if (process.env.NODE_ENV !== 'production' && count > MAX_HEADER_ACTIONS) {
    // eslint-disable-next-line no-console
    console.error(`PageHeader: a page has at most ${MAX_HEADER_ACTIONS} header actions (this one has ${count}).`);
  }

  useEffect(() => {
    const before = document.title;
    document.title = `${title} | ${SITE_NAME}`;
    return () => {
      document.title = before;
    };
  }, [title]);

  return (
    <div className="nl-page-header">
      <div className="nl-page-header__row">
        <div className="nl-page-header__text">
          <h1 className="nl-page-header__title">{title}</h1>
          {subtitle ? <p className="nl-page-header__subtitle">{subtitle}</p> : null}
        </div>
        {count ? <div className="nl-page-header__actions">{actions}</div> : null}
      </div>
      {tabs ? <Tabs label={tabs.label || `${title} views`} tabs={tabs.tabs} value={tabs.value} /> : null}
    </div>
  );
};

export default PageHeader;
