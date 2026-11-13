import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { toNewAddress } from '../redirects/engine';
import { has } from './industryModel';
import T from './strings.industry';
import useIndustryProfile from './useIndustryProfile';

const REPORTS = [
  { key: 'register', feature: 'dispensing_register', path: '/reports/dispensing-register' },
  { key: 'controlled', feature: 'controlled_register', path: '/reports/controlled-register' },
  { key: 'cashup', feature: 'waiter_cashup', path: '/reports/waiter-cashup' },
  { key: 'levy', feature: 'tourism_levy', path: '/reports/tourism-levy' },
  { key: 'platforms', feature: 'waiter_cashup', path: '/reports/delivery-platforms' },
];

/**
 * The reports that only a pharmacy or a restaurant and bar needs, shown on the Reports page as question cards when the
 * business's kind of shop switches them on. A general shop sees nothing here.
 */
const IndustryReports = () => {
  const { profile } = useIndustryProfile(null);
  const shown = REPORTS.filter((report) => has(profile, report.feature));
  if (shown.length === 0) return null;
  return (
    <ul className="nl-reports__questions" aria-label={T.reports.label}>
      {shown.map((report) => (
        <li className="nl-report-card" key={report.key}>
          <h2 className="nl-report-card__title">
            <RouterLink className="nl-report-card__link" to={toNewAddress(report.path)}>
              {T.reports[report.key].title}
            </RouterLink>
          </h2>
          <p className="nl-report-card__text">{T.reports[report.key].text}</p>
        </li>
      ))}
    </ul>
  );
};

export default IndustryReports;
