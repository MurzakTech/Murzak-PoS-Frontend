import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Card from '../components/Card';
import { oldScreen } from '../redirects/engine';
import { MORE_REPORTS } from './reportsModel';
import T from './strings.reports';

/**
 * "More reports" (AC-40, nothing lost): the six current reports and their 13 sub-reports, each opened on its current
 * screen. The link carries legacy=1 (oldScreen), so once the New look redirects are on it still opens the current
 * screen instead of bouncing back here. Reports that have a new answer above (sales, stock, what is not selling) are
 * listed too, because the current screens hold more detail than the new ones (group by category or customer, Excel and
 * PDF files, value trends, advice for old stock).
 */
const MoreReports = () => (
  <Card title={T.more.title} subtitle={T.more.text} small aria-label={T.more.title}>
    <ul className="nl-more">
      {MORE_REPORTS.map((group) => {
        const words = T.more.groups[group.key];
        return (
          <li className="nl-more__group" key={group.key}>
            <h3 className="nl-more__title">{words.title}</h3>
            <p className="nl-more__text">{words.text}</p>
            <ul className="nl-more__links">
              {group.links.map((link) => (
                <li key={link.key}>
                  <RouterLink className="nl-more__link" to={oldScreen(link.path)}>
                    {words.links[link.key]}
                  </RouterLink>
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ul>
  </Card>
);

export default MoreReports;
