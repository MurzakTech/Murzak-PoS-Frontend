# P1-10: One strings file, and the rename map applied

Recorded 13 October 2026. Ticket P1-10 of the Murzak POS redesign (Done when: no old term appears in the shell or the shared components).

## What was done

- **One strings file:** `src/newlook/strings.js` now holds every visible word of the New look shell and shared components, grouped as `shell` (the top bar, menu, + New, search, help, the access words, the placeholder and old-addresses pages) and `components` (tables, pagination, filters, tabs, detail panel, dialogs, drawer, toasts, status words, payment chips, empty and loading states, number formats). A label with a changing part is **one string with `{placeholders}`** (for example `Showing {shown} of {total}`), filled in by `labels/fill.js`, so a translator can reorder the sentence. The visible English is unchanged, character for character: this ticket moves words, it does not reword them.
- **The rename map is applied.** The payment chip now shows the **display** name and takes its colour from it: Credit Card shows as Card with the Card colour; Bank Draft, Cheque and Wire Transfer show as Other with the grey; a name the Spec hides (for example Territory) draws nothing; **MPESA now shows as M-Pesa** (see decision 1). Words that reach a screen from data go through `displayName()`; words written in the New look come straight from the strings.
- **A scanner guards it** (`labels/scanLabels.js`, tested by `labels/labelsInOnePlace.test.js`). It parses each file and fails a test if a visible word is written inside a component instead of in the strings file (text between tags, `aria-label`, `title`, `placeholder`, any unknown attribute, and fields or defaults named label, title, description, placeholder, words, hint, message and the like), or if **any old term from the rename map appears in any text** of the shell, the shared components or the other New look screens. It checks 49 files. A word added in the wrong place later fails here instead of slipping in.

## Result

Today **no old term appears** anywhere in the 49 files, and no visible word is written inside a component. The scan had found 22 files with visible words written inside them before the move (and no old terms). The strings file holds **166** words and sentences (112 for the shell, 54 for the components).

## How it was checked

- **Automated tests:** the whole suite is 61 files and 1,233 tests, all passing. New: the scanner's own tests (what it sees and what it ignores), one stray-word test and one old-term test for each of the 49 files, a test that the strings file itself holds no old term, tests for the payment chip and the rename map (five old names, a hidden name, MPESA), and tests for MPESA in the rename map.
- **Real browser:** the earlier browser checks (shell 66, overlay 59, data 40, old addresses 26, role in the user menu 7) were run again after the change and **all still pass**, which shows that nothing visible changed.
- **Lint:** clean for the New look, the API and the routes, **for both `.js` and `.jsx` files**. See the note below.
- The production build compiles; the colour budget is unchanged (277 old, none in the New look).

## A correction to my earlier lint reports

Until this ticket, the lint command I ran (`eslint src/newlook`) only looked at `.js` files, so most New look files (`.jsx`) had not been checked by lint, although the production build does check the files it compiles. In this ticket I ran lint on `.js` and `.jsx` together and found 9 small items in my own files (test variable names that the test-library rules do not like, an unused import and a redundant `role` on the detail panel). All are fixed, and the lint commands in this and later reports include `.jsx`. The 5 older lint errors in `src/hooks` test files are not mine and are left alone.

## Decisions and judgement calls (please read)

1. **MPESA to M-Pesa is not in the Spec's rename table.** It comes from the Phase 0 review, where the pay screen showed MPESA, while the Spec writes M-Pesa everywhere. I added it to the rename map and marked it as an extra, and left it out of the old-terms scan because "mpesa" is also the internal key of the method. Tell me if you would rather not.
2. **Two strings for the Till open pill** ("Till open" and "since {time}"), because the time sits in its own piece that the style sheet hides on narrow screens. The text a screen reader reads is still one sentence.
3. **One earlier test changed.** The P1-3 payment-chip test used to expect the text "MPESA"; it now correctly reads "M-Pesa", so that row moved into the new rename-map tests.
4. **Not moved, on purpose:** the component page and the three demo pages (sample content, not the product); the notes and page titles inside the old-addresses table (data for you to review, in the Spec's words); words a screen passes to a component (a table's column headers, tab labels); and developer-only messages (for example the warning when a header has three actions).
5. **The "Hidden unless used" rules are still not applied.** The rename map records them (Stock Entry, Customer Group, Territory, the warehouse names), but applying them needs to know whether the shop makes goods or uses customer groups, which needs a setting that no ticket has built yet.
6. **The old screens are untouched.** This ticket covers the New look only; the words on the current screens change when each screen is rebuilt, and the scanner will cover each new screen as it is added.

## Not done here (belongs to other tickets)

Rebuilt screens use the strings file from the start (each ticket adds its words to it); the Swahili for the strings (the back end has the translation process for its own messages; the front end has none yet, and one strings file is what makes that possible later). Live demo-store work is with the second session.
