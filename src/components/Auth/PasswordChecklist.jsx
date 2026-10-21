import React from 'react';
import Icon from '../../newlook/components/Icon';
import { PASSWORD_RULES } from '../../utils/passwordRules';

/**
 * A live list of the password rules, ticked off as the person types.
 * Styled with NewLook tokens without MUI.
 */
const PasswordChecklist = ({ password = '', className = '' }) => (
  <ul
    aria-label="Password requirements"
    className={className}
    style={{
      listStyle: 'none',
      padding: 0,
      margin: 'var(--space-2) 0 0 0',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: 'var(--space-1) var(--space-2)',
    }}
  >
    {PASSWORD_RULES.map((rule) => {
      const met = rule.test(password);
      return (
        <li
          key={rule.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-1)',
            fontSize: 'var(--caption-size)',
            color: met ? 'var(--good)' : 'var(--muted)',
            fontWeight: met ? 600 : 400,
          }}
        >
          {met ? (
            <span style={{ display: 'inline-flex', color: 'var(--good)' }}>
              <Icon name="check" />
            </span>
          ) : (
            <span
              style={{
                display: 'inline-block',
                width: 12,
                height: 12,
                borderRadius: '50%',
                border: '1.5px solid var(--base)',
                margin: '3px',
              }}
              aria-hidden="true"
            />
          )}
          <span>{rule.label}</span>
          <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
            {met ? ' (done)' : ' (not yet)'}
          </span>
        </li>
      );
    })}
  </ul>
);

export default PasswordChecklist;
