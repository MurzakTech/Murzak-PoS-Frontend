import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Skeleton } from '../components/Skeleton';
import Icon from '../components/Icon';
import Button from '../components/Button';
import S from '../strings';
import { MonthProgress, Sparkline } from '../charts';
import ChangeLine from './ChangeLine';

/**
 * One of the four stat tiles (Spec: Dashboard, "Stat tiles"). The tile is a link: the whole card opens the screen behind
 * the number (a stretched link, so anything else inside the tile, such as the "Add the costs" button, still works on its
 * own). It shows the value, an optional detail line, the change against the previous period with an arrow and words, and a
 * grey sparkline of the period, or the month progress meter while there are fewer than 7 days of data.
 *
 *   icon                   a small icon chip in the corner (decorative)
 *   label, value, detail   the tile's words and its main number (already formatted)
 *   change                 { direction, text } from changeInfo, drawn with an arrow and words
 *   goodWhen               'up' or 'down': which way is good news for this number
 *   spark                  numbers for the sparkline ([] for none)
 *   progress               { day, days } to show "Day 12 of 31" instead of the sparkline
 *   to, linkLabel          where the tile opens, and what a screen reader hears
 *   footer                 anything extra under the figures (a note or a button); it is not part of the link
 */
const StatTile = ({ icon, label, value, detail, change, goodWhen, spark = [], progress, to, linkLabel, footer, loading, failed, onRetry }) => {
  if (failed) {
    return (
      <article className="nl-card nl-tile" aria-label={label}>
        <p className="nl-tile__label">{label}</p>
        <div className="nl-card-error">
          <Icon name="alert" />
          <p>{S.home.states.cardErrorTitle}</p>
          <Button variant="ghost" size="small" onClick={onRetry}>
            {S.home.states.retry}
          </Button>
        </div>
      </article>
    );
  }
  if (loading) {
    return (
      <article className="nl-card nl-tile" aria-label={label} aria-busy="true">
        <p className="nl-tile__label">{label}</p>
        <Skeleton width="60%" height="30px" />
        <Skeleton width="80%" height="14px" />
        <Skeleton width="100%" height="32px" />
      </article>
    );
  }
  return (
    <article className="nl-card nl-tile">
      <div className="nl-tile__head">
        <p className="nl-tile__label">
          <RouterLink to={to} className="nl-tile__link" aria-label={`${label}: ${value}. ${linkLabel}`}>
            {label}
          </RouterLink>
        </p>
        {icon ? (
          <span className="nl-chip-icon" aria-hidden="true">
            <Icon name={icon} />
          </span>
        ) : null}
      </div>
      <p className="nl-tile__value">{value}</p>
      {detail ? <p className="nl-tile__detail">{detail}</p> : null}
      {change ? <ChangeLine direction={change.direction} text={change.text} goodWhen={goodWhen} /> : null}
      {progress ? <MonthProgress day={progress.day} days={progress.days} /> : spark.length > 1 ? <Sparkline values={spark} height={32} /> : null}
      {footer ? <div className="nl-tile__footer">{footer}</div> : null}
    </article>
  );
};

export default StatTile;
