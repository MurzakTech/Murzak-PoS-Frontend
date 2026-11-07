/**
 * Whether two form values are the same to the person filling the form. "Nothing" is written several ways by the screens
 * (undefined, null, an empty text), a number can arrive as text, and a stray space is not a change. Without this the "Leave
 * without saving?" question appeared on a form nobody had touched.
 */
export const sameValue = (a, b) => {
  if (typeof a === 'boolean' || typeof b === 'boolean') return Boolean(a) === Boolean(b);
  const text = (v) => (v === null || v === undefined ? '' : String(v).trim());
  return text(a) === text(b);
};

/** True when any field of `start` differs from the same field of `values` */
export const formChanged = (values, start) => Object.keys(start || {}).some((key) => !sameValue(values && values[key], start[key]));
