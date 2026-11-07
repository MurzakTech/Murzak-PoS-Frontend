import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Field from '../components/Field';
import { sectionAddress } from './settingsModel';
import { searchSettings } from './settingsSearch';
import T from './strings.settings';

const S = T.search;

/** "Find a setting": type a plain word, get the places it can be found, each a link to its section. */
const SettingsSearch = () => {
  const [text, setText] = useState('');
  const found = searchSettings(text, S.entries);
  return (
    <div className="nl-settings-search">
      <Field id="settings-search" label={S.label} placeholder={S.placeholder} value={text} onChange={setText} autoComplete="off" />
      {text.trim() ? (
        found.length > 0 ? (
          <ul className="nl-settings-search__list" aria-label={S.resultsLabel}>
            {found.map((entry) => (
              <li key={entry.label}>
                <Link to={sectionAddress(entry.section)} onClick={() => setText('')}>
                  {entry.label}
                </Link>
                <span className="nl-settings-hint"> {T.shell.sections[entry.section].title}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="nl-settings-hint" role="status">
            {S.none}
          </p>
        )
      ) : null}
    </div>
  );
};

export default SettingsSearch;
