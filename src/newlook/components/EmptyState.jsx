import React from 'react';
import Icon from './Icon';
import Button from './Button';
import EmptyArt from './EmptyArt';
import { photoUrl } from '../../assets/photos';

/**
 * The empty state (Part 1, Components): an icon, a plain headline, one sentence and one primary action. Used for
 * every list and chart with no data, and for a list that failed to load (then the icon is "alert" and the
 * action is "Try again"). Say what is missing and what to do next; no codes.
 *
 *   action  { label, onClick, icon? } shown as the one primary button
 *   art     the name of a line-art picture shown above the headline instead of the icon (sales, products, customers)
 *   photo   the name of a picture in the self-hosted library (src/assets/photos); shown instead of the icon when it exists
 *   tone    "error" colours the icon with the error colour (the words still say what went wrong)
 */
const EmptyState = ({ icon = 'inbox', art, photo, title, description, action, level = 2, tone = 'neutral', className = '' }) => {
  const picture = photo ? photoUrl(photo) : null;
  const Heading = `h${Math.min(Math.max(level, 1), 6)}`;
  return (
    <div className={['nl-empty', tone === 'error' && 'is-error', className].filter(Boolean).join(' ')}>
      {picture ? (
        <img className="nl-empty__photo" src={picture} alt="" />
      ) : art && tone !== 'error' ? (
        <EmptyArt name={art} />
      ) : (
        <span className="nl-empty__icon">
          <Icon name={icon} />
        </span>
      )}
      <Heading className="nl-empty__title">{title}</Heading>
      {description ? <p className="nl-empty__text">{description}</p> : null}
      {action ? (
        <Button icon={action.icon} onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </div>
  );
};

export default EmptyState;
