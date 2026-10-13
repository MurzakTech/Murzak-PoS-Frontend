/**
 * Every visible word of the New look shell and shared components, in one place (ticket P1-10).
 * Change a label here and it changes everywhere. A test (labels/labelsInOnePlace.test.js) fails if a word is
 * written inside a component instead, or if an old term from the rename map appears.
 */
import shell from './strings.shell';
import components from './strings.components';

export default { shell, components };
