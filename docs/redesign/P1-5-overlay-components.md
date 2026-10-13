# P1-5: Overlay components

Recorded 13 October 2026. Ticket P1-5 of the Murzak POS redesign (Done when: focus moves in, is trapped and returns; Escape closes; toasts follow the Messages rule).

## What was built

All of these live in `src/newlook/components/`, built only from the design tokens. They exist only inside the New look, so nothing changes with the switch off.

| Component | What it is | How focus and keys behave |
|---|---|---|
| **Dialog** | Surface, 14px corner, the 12px 32px dialog shadow, 16px 700 title, an optional sentence under the title, buttons in a footer, a Close button. Drawn above the page, which does not scroll while it is open | Focus moves in (to the control marked `data-autofocus`, else the first control, else the dialog itself), stays inside (Tab and Shift+Tab wrap; focus that strays is pulled back) and returns to the button that opened it. Escape closes. A click outside does **not** close it. While a save is running (`busy`) Escape and Close wait |
| **Confirm dialog** | A yes or no question built on Dialog. Cancel on the left, the answer on the right | A destructive answer is red text and **never the default**: focus starts on Cancel, so pressing Enter at once cannot destroy anything. It is announced as an alert dialog. For three or more choices (the Leave-the-till dialog) use Dialog with your own buttons and put `data-autofocus` on the safe one (Stay) |
| **Menu** | A list of actions opened from a button: the three dots on a row, or a button with words such as "+ New". The list is drawn above everything, so a table or card cannot clip it, and it flips upward when there is no room below | Enter, Space, a click or the Down arrow opens it on the first action (the Up arrow on the last). Arrow keys move and wrap, Home and End jump, a letter jumps to a match, Escape closes and puts focus back on the button, Tab closes, a click outside closes. A disabled action is skipped. A destructive action is always **last**, after a divider, and red |
| **Toast** | A short message at the top centre. Success has a check, info an information icon, error an alert icon; every one has words | Success and info are announced politely (role status); an error is announced at once (role alert). See "Messages" below |
| **Drawer** | The sidebar on screens narrower than 768px, 240px wide, sliding in from the left | Opens from a menu button, holds focus while open, closes with Escape, a tap outside or its Close button, and returns focus to the menu button |

One piece of shared code (`overlay.js`) does the focus work for Dialog and Drawer, so the rules are written once. Only the overlay on top reacts to Escape and Tab, so a confirm opened over a form closes alone, and an Escape that closes an open Select inside a dialog does not also close the dialog.

**On the component page** (`/new-look/components`): a new card with a form dialog, the destructive confirm, the three-way Leave the till dialog (first focus on Stay), a "+ New" menu and a three-dots menu, success, info and error toast buttons, and the drawer. The sample sales list from P1-4 now has a three-dots menu on every row (Open details, Print receipt, Void sale); using it does not open the row, and Void sale asks first.

## Messages (toasts) and the Spec's two different numbers

The Spec gives two timings for a toast: the Components table says it "auto-hides after 4 seconds", while the Accessibility rules (Messages) say "a toast stays at least 6 seconds and pauses while hovered". The ticket says toasts must follow **the Messages rule**, so I used the accessibility rule:

- a success or info toast stays **6 seconds**, then goes;
- it **pauses** while the pointer is over it or keyboard focus is inside it, and carries on with the time that was left;
- an **error stays until it is closed** (the Components table says the same);
- it never covers the Till open or Held sales buttons: any control marked `data-toast-keepout` makes the toasts slide down below it. The till screens (P3) must add that mark to those two buttons.

The same message is not stacked twice while it is on screen. The Components table should be corrected from 4 to 6 seconds in the next version of the Spec.

## How the Spec's rules were applied

- **No new colours.** The page behind a dialog or drawer is dimmed with the ink colour at 16%, the same overlay amount the pressed state uses (see decision 1). Menu and toast use the menu shadow; the dialog and drawer use the dialog shadow. Destructive text is the `bad` token with the words "Void sale" beside it, so colour is never the only signal.
- **Focus ring** on menu actions is the 2px brand-text ring (drawn just inside each action); no outline is removed anywhere (a test enforces it).
- **Layers:** dialog and drawer, then menu lists, then toasts, so a menu opened inside a dialog shows above it and a toast shows above everything.
- **Small screens:** below 768px every menu action is at least 44px, the dialog's buttons share the width, and every drawer button is 44px.
- **Reduced motion:** the drawer does not slide.
- **Accessibility wiring:** a dialog is `role="dialog"` (alert dialog for a destructive confirm) with `aria-modal`, named by its title and described by its sentence; a menu button says it opens a menu and whether it is open; menu actions are `menuitem`s; the toast areas are always in the page as live regions, so what appears in them is spoken.

## Small changes elsewhere

New token `--dialog-title-size: 16px` (the Spec names the dialog title as 16px 700 but the token table had no 16px); two icons (`more` for the three dots, `menu` for the hamburger); the New look shell now holds the toast provider, so any new screen can raise a toast; the P1-3 and P1-4 tests that render the component page now wrap it in that provider.

## How it was checked

- **59 new automated tests** (focus in, trapped, returned; Escape and stacking; busy; destructive never default; menu keys, order, placement and flip; toast roles, 6 seconds, pause, error stays, keepout; drawer; the sample page). The whole suite is 55 files and 894 tests, all passing; lint is clean for everything in `newlook`; the production build compiles; the colour budget is unchanged (277 in 65 old files, none in `newlook`).
- **A real browser run, 59 checks, all passing** (light and dark at 1280px, the drawer at 375px and 1280px, and a reduced-motion run): the dialog measures 14px corner, 12px 32px shadow, 16px 700 title, 20px padding; Tab and Shift+Tab six times each never leave the dialog; the page behind is locked; a click outside does not close it; Escape closes and focus returns to the opener; the destructive confirm starts on Cancel and its answer is red (and Enter on the default cancels); Leave the till starts on Stay; the menu opens with the arrow key, End goes to the red last action, Escape returns focus; toasts sit at the top centre, a success is still there at 5.5 seconds, pauses under the pointer, goes after, and the error stays until closed; a toast slides below a control marked as keepout; the row menu opens in full over the table, does not open the row, and Void sale asks first; the drawer is 240px, holds focus, closes with a tap outside or Escape, returns focus, and on a phone every drawer button is 44px; no errors in the console.

## Decisions and judgement calls (please read)

1. **The dimming behind a dialog or drawer.** The Spec does not define one. I used the ink colour at 16% (an amount the Spec's own pressed state already uses), so no new colour is invented. In the dark theme the ink colour is light, so it lightens the page slightly instead of darkening it. If you want a stronger or different dimming, say so and I will add it to the colour table first.
2. **Dialog width.** The Spec gives none; I used 440px at most, full width less 16px on a phone.
3. **A click outside a dialog does not close it** (it does close a drawer, as the Spec says). A dialog asks for a decision, and a stray click must never lose a sale.
4. **Toast timing:** 6 seconds, as explained above.
5. **The drawer closes by itself at 768px or more only when told to** (`closeAtWidth`); the app shell (P1-6) will pass 768. The component page leaves it out so the drawer can be tried on a wide screen.
6. **No exit animations.** Overlays appear and disappear at once (only the drawer slides in, and not for reduced motion).

## Not done here (belongs to other tickets)

The app shell that uses the drawer and holds the Held sales and Till open buttons (P1-6, P3); the "+ New" menu with real permissions (P1-7). Live demo-store work remains blocked until a new session can reach the shop's address.
