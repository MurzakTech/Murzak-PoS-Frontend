import React from 'react';
import Icon from '../components/Icon';
import { differenceInfo } from './salesModel';
import T from './strings.sales';

/** The cash difference of a till session: an icon and a word (Short, Over or Matches), and a dash while the session is open */
const DifferenceLabel = ({ difference }) => {
  const info = differenceInfo(difference);
  if (info.kind === 'none') {
    return (
      <span>
        <span aria-hidden="true">{info.words}</span>
        <span className="nl-visually-hidden">{T.difference.none}</span>
      </span>
    );
  }
  return (
    <span className={`nl-status nl-status--${info.tone}`} data-difference={info.kind}>
      <Icon name={info.icon} />
      <span>{info.words}</span>
    </span>
  );
};

export default DifferenceLabel;
