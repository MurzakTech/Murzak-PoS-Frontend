import React from 'react';
import Icon from '../components/Icon';
import { differenceInfo, expiryView, levelView, statusView } from './stockModel';

/**
 * The small labels of the stock screens. Every one is an icon plus a word, so colour is never the only signal.
 */
const Tagged = ({ view, data }) => (
  <span className={`nl-status nl-status--${view.tone}`} {...data}>
    <Icon name={view.icon} />
    <span>{view.words}</span>
  </span>
);

/** In stock, Low or Out */
export const LevelLabel = ({ level }) => <Tagged view={levelView(level)} data={{ 'data-level': level }} />;

/** Draft, Submitted or Cancelled */
export const EntryStatus = ({ status }) => <Tagged view={statusView(status)} data={{ 'data-entry-status': status }} />;

/** Expired, Within 7 days or Expiring soon */
export const ExpiryLabel = ({ state }) => <Tagged view={expiryView(state)} data={{ 'data-expiry': state }} />;

/** Short, Over or Matches for one counted line; the plain words "Not counted" until a number is typed */
export const CountDifference = ({ expected, counted }) => {
  const info = differenceInfo(expected, counted);
  if (info.kind === 'none') return <span className="nl-stock-sub">{info.words}</span>;
  return <Tagged view={info} data={{ 'data-difference': info.kind }} />;
};
