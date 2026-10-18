import React from 'react';
import S from '../strings';
import fill from '../labels/fill';

/**
 * Month progress (Spec: "A meter in series-1 on the track colour, with 'Day 12 of 31'. Replaces the sparkline in a stat
 * tile while there are fewer than 7 days of data").
 */
const MonthProgress = ({ day, days }) => {
  const label = fill(S.charts.monthProgress.label, { day, days });
  const share = days ? Math.min(100, Math.max(0, (day / days) * 100)) : 0;
  return (
    <div className="nl-meter">
      <div className="nl-meter__track" role="meter" aria-label={S.charts.monthProgress.short} aria-valuemin={1} aria-valuemax={days} aria-valuenow={day} aria-valuetext={label}>
        <div className="nl-meter__fill" style={{ width: `${share}%` }} />
      </div>
      <span className="nl-meter__label">{label}</span>
    </div>
  );
};

export default MonthProgress;
