import React from 'react';
import Button from '../components/Button';
import Menu from '../components/Menu';
import S from '../strings';

/**
 * The actions at the right of a page header: the page's main job and, beside it, a "More" menu for everything else, so a header
 * never holds more than two controls (Part 1, App shell and navigation).
 *
 *   primary  the main Button of the page (or nothing, for a person who may not do it)
 *   items    the other actions: [{ label, onClick, icon?, disabled?, hidden? }]. A hidden one is left out.
 *
 * One other action beside a main button, or on its own, is drawn as a plain secondary button (a menu holding one thing is only an
 * extra click). Two or more go in the menu. The menu button is as tall as the others and 44px on a phone, like every header control.
 */
const HeaderActions = ({ primary, items = [] }) => {
  const shown = items.filter((item) => !item.hidden);
  let other = null;
  if (shown.length === 1) {
    const [only] = shown;
    other = (
      <Button variant="secondary" icon={only.icon} disabled={only.disabled} onClick={only.onClick}>
        {only.label}
      </Button>
    );
  } else if (shown.length > 1) {
    other = (
      <Menu label={S.shell.pageHeader.moreLabel} items={shown} variant="secondary" size="default">
        {S.shell.pageHeader.more}
      </Menu>
    );
  }
  if (!primary && !other) return null;
  return (
    <div className="nl-header-actions">
      {other}
      {primary}
    </div>
  );
};

export default HeaderActions;
