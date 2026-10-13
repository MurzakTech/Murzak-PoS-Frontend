/**
 * Puts values into a label that has {placeholders}: fill('Showing {shown} of {total}', { shown: 20, total: 135 }).
 * A placeholder with no value is left as written, so a missing value shows up in testing instead of as a blank.
 */
export const fill = (template, values = {}) => template.replace(/\{([A-Za-z0-9_]+)\}/g, (whole, name) => (values[name] !== undefined && values[name] !== null ? String(values[name]) : whole));

export default fill;
