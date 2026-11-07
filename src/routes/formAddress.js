/** True for a page that is a form (its address ends in /new or /edit), which loads with a form-shaped placeholder */
export const isFormAddress = (path) => /\/(new|edit)(\/|$)/.test(path || '');
