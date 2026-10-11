/**
 * Self-hosted photo library.
 *
 * Every picture in this folder is bundled with the website itself (nothing is
 * loaded from another company's server, so it cannot disappear or be blocked,
 * and it works offline once the site is installed).
 *
 * To add a photo, save it in this folder using one of the file names listed in
 * PHOTOS.md (for example "industry-pharmacy.jpg"). No code change is needed:
 * the page that uses that name picks it up on the next build. A name with no
 * file simply shows nothing (or the page's own fallback), so the library can
 * grow one picture at a time.
 */
const library = {};

// require.context only exists in the website build. The test runner has no
// pictures to load (the call throws there), so there the library is empty.
try {
  const context = require.context('./', false, /\.(jpe?g|png|webp)$/i);
  context.keys().forEach((key) => {
    const name = key.replace(/^\.\//, '').replace(/\.[^.]+$/, '');
    library[name] = context(key);
  });
} catch (e) {
  // no pictures available in this environment
}

/** The address of a photo, or null when that photo has not been added yet. */
export const photoUrl = (name) => library[name] || null;

/** The names of every photo that has been added. */
export const photoNames = () => Object.keys(library);
