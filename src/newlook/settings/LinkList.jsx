import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import T from './strings.settings';

const W = T.shell;

/**
 * A card of links to the current screens (the sensitive settings stay there: keys, bank details, discount rules). Each
 * row has a title, one plain sentence and an Open button that names what it opens. `items` is
 * [{ key, title, text, to }]; an item whose `to` is null shows its sentence without a button.
 *
 *   id, highlighted   the card's name in the address and whether the address asked for it
 */
const LinkList = ({ id, title, subtitle, items, highlightKey = '', note }) => (
  <div id={id ? `settings-card-${id}` : undefined} className="nl-settings-card" data-card={id}>
    <Card title={title} subtitle={subtitle}>
      {note ? <p className="nl-settings-hint">{note}</p> : null}
      <ul className="nl-settings-links">
        {items.map((item) => (
          <LinkRow key={item.key} item={item} fallbackTitle={title} highlighted={highlightKey === item.key} />
        ))}
      </ul>
    </Card>
  </div>
);

const LinkRow = ({ item, fallbackTitle, highlighted }) => {
  const row = React.useRef(null);
  React.useEffect(() => {
    if (highlighted && row.current && row.current.scrollIntoView) row.current.scrollIntoView({ block: 'center' });
  }, [highlighted]);
  return (
    <li ref={row} id={`settings-card-${item.key}`} data-card={item.key} className={['nl-settings-link', highlighted && 'is-highlighted'].filter(Boolean).join(' ')} aria-current={highlighted ? 'true' : undefined}>
      <div className="nl-settings-link__text">
        {item.title ? <h3 className="nl-settings-link__title">{item.title}</h3> : null}
        <p className="nl-settings-hint">{item.text}</p>
        {item.note ? <p className="nl-settings-hint">{item.note}</p> : null}
      </div>
      {item.to ? (
        <Button as={Link} to={item.to} variant="secondary" icon="chevronRight" iconEnd aria-label={`${W.openCurrent} ${item.title || fallbackTitle}`}>
          {W.openCurrent}
        </Button>
      ) : null}
    </li>
  );
};

export default LinkList;
