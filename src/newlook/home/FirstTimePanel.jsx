import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import Icon from '../components/Icon';
import S from '../strings';

const T = S.home.states.noSales;
const ICONS = { products: 'box', till: 'till', sale: 'receipt', payments: 'wallet' };

/**
 * The first-time panel (Spec: Dashboard, States): a shop with no sales yet sees this in place of the tiles and charts, with
 * the four steps that get it to a first sale. Each step opens the screen where it is done.
 *
 *   steps   [{ key: 'products' | 'till' | 'sale' | 'payments', to, done? }]
 */
const FirstTimePanel = ({ steps }) => (
  <Card title={T.title} subtitle={T.text} className="nl-first-time">
    <ol className="nl-first-time__steps">
      {steps.map((step, index) => (
        <li key={step.key} className={`nl-first-time__step${step.done ? ' is-done' : ''}`}>
          <span className="nl-first-time__icon">
            <Icon name={step.done ? 'check' : ICONS[step.key]} />
          </span>
          <div className="nl-first-time__text">
            <p className="nl-first-time__label">
              {index + 1}. {T.steps[step.key].label}
            </p>
            <p className="nl-first-time__hint">{T.steps[step.key].hint}</p>
          </div>
          <Button as={RouterLink} to={step.to} size="small" variant={index === 0 ? 'primary' : 'secondary'} aria-label={`${T.start}: ${T.steps[step.key].label}`}>
            {T.start}
          </Button>
        </li>
      ))}
    </ol>
  </Card>
);

export default FirstTimePanel;
