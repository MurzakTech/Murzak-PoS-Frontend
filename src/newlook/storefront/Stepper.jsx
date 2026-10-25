import React from 'react';

/** Fewer, the number, more. The minus is drawn with CSS so it reads clearly at small sizes and needs no word. */
const Stepper = ({ name, qty, max, onChange, t }) => (
  <div className="sf-stepper" role="group" aria-label={name}>
    <button type="button" className="sf-stepper__button" aria-label={t('decrease', { name })} onClick={() => onChange(qty - 1)}>
      <span className="sf-stepper__minus" aria-hidden="true" />
    </button>
    <span className="sf-stepper__qty" aria-live="polite">
      {qty}
    </span>
    <button
      type="button"
      className="sf-stepper__button"
      aria-label={t('increase', { name })}
      disabled={qty >= max}
      onClick={() => onChange(qty + 1)}
    >
      <span className="sf-stepper__plus" aria-hidden="true" />
    </button>
  </div>
);

export default Stepper;
