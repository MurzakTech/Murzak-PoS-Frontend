import React, { createContext, useContext } from 'react';

/**
 * The one card of the redesign (Part 1, Components): a surface with a 1px line, a 14px corner, 20px of padding and no
 * shadow, with an optional header (title, subtitle, actions on the right).
 *
 * "Cards never nest more than one level": a card may sit inside a card, but not a third one inside that. A
 * third level reports an error in development, so a screen is rebuilt flatter instead.
 *
 *   small   uses the 15px card title of small cards instead of 17px
 *   level   the heading level of the title (2 by default), so a page keeps a sensible outline
 */
export const MAX_CARD_DEPTH = 2;
const DepthContext = createContext(0);

const Card = ({ title, subtitle, actions, small = false, level = 2, as: Tag = 'section', className = '', children, ...rest }) => {
  const depth = useContext(DepthContext) + 1;
  if (process.env.NODE_ENV !== 'production' && depth > MAX_CARD_DEPTH) {
    // eslint-disable-next-line no-console
    console.error(`Card: cards may nest only one level deep (this one is level ${depth}).`);
  }
  const Heading = `h${Math.min(Math.max(level, 1), 6)}`;
  const hasHeader = title || subtitle || actions;

  return (
    <DepthContext.Provider value={depth}>
      <Tag className={['nl-card', small && 'nl-card--small', className].filter(Boolean).join(' ')} {...rest}>
        {hasHeader ? (
          <div className="nl-card__header">
            <div>
              {title ? <Heading className="nl-card__title">{title}</Heading> : null}
              {subtitle ? <p className="nl-card__subtitle">{subtitle}</p> : null}
            </div>
            {actions ? <div className="nl-card__actions">{actions}</div> : null}
          </div>
        ) : null}
        {children}
      </Tag>
    </DepthContext.Provider>
  );
};

export default Card;
