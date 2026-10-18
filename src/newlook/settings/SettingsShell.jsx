import React from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../shell';
import { SECTIONS, sectionAddress } from './settingsModel';
import './settings.css';
import T from './strings.settings';

const W = T.shell;

/**
 * The frame of the Settings page (ticket P5-3): the page header, the side list of the five sections (a row of tabs on a
 * phone) and the room for the open section. Every section is a real address, so a link, a refresh or the Back button opens
 * the same section.
 *
 *   section   the key of the open section
 */
const SettingsShell = ({ section, children }) => {
  const meta = W.sections[section] || W.sections.business;
  return (
    <div className="nl-settings-page">
      <PageHeader title={meta.title} subtitle={meta.subtitle} />
      <div className="nl-settings-layout">
        <nav className="nl-settings-nav" aria-label={W.listLabel}>
          <p className="nl-settings-nav__title">{W.listTitle}</p>
          <ul>
            {SECTIONS.map((key) => (
              <li key={key}>
                <Link to={sectionAddress(key)} className="nl-settings-nav__link" aria-current={key === section ? 'page' : undefined}>
                  {W.sections[key].title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="nl-settings-content">{children}</div>
      </div>
    </div>
  );
};

export default SettingsShell;
