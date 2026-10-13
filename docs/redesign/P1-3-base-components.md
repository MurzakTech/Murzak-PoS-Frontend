# P1-3: Base components

Recorded 13 October 2026. Ticket P1-3 of the Murzak POS redesign (Done when: each has all its states on a component page; AC-04 passes for these components).

## What was built

The shared components live in **one folder**, `src/newlook/components/`, built only from the design tokens (P1-1). A screen may combine them but may not restyle them. They exist only inside the New look: the current screens do not use them, so nothing changes with the switch off.

| Component | What it is | States on the component page |
|---|---|---|
| **Button** | Primary (brand fill), secondary (surface with line border), danger (red text), ghost (no border). 40px, 44px at the till, 32px small. Optional icon; icon-only needs a name for screen readers | Default, hover, pressed, focus ring, disabled (track fill, muted text), loading (the spinner replaces the icon, the label stays, a click does nothing) |
| **Field** | Label above, 40px input, helper caption, error text with an icon. **Money** shows KES and takes digits only. **Date** shows and asks for dd/mm/yyyy and gives the screen an ISO date | Default, hover, focus, error, disabled, read-only, money, date |
| **Select** | A closed 40px box with a chevron that opens a menu. Arrow keys move, Home and End jump, Enter or Space picks, Escape closes and keeps focus on the box, typing jumps to a match, a click outside closes it. Disabled options are skipped | Default, placeholder, hover, focus, error, disabled (and open) |
| **Checkbox** | 18px box; the words are part of the control; the unticked border uses input-border so it stays visible | Ticked, unticked, hover, focus, error, disabled |
| **Switch** | 36 by 20px; off state uses input-border; takes effect at once and says "Saved" when its save succeeds, or moves back and says why when it fails | On, off, hover, focus, saves then Saved, fails to save, disabled |
| **Chip, Badge, Status label, Payment chip** | Chip (soft fill), count badge (99+ from 100), status label (icon plus word: Paid check good, Unpaid clock warn, Overdue alert bad, Part returned arrow ink-2), payment chip (a dot in the series colour plus the method name: M-Pesa series-1, Cash series-2, Card series-3, On credit series-4, anything else the compare grey) | Every status and every payment method |
| **Card** | Surface, 1px line, 14px corners, 20px padding, no shadow; optional header (title, subtitle, actions); small cards use the 15px title | With header, small, no header, nested one level |
| **Icons** | 18px, 1.8px stroke, round ends, the current text colour; decoration only (hidden from screen readers) | All ten icons |

**The component page** is at `/new-look/components` (a link on the New look page). It shows every component in every state, with hover, pressed and focus forced so they can be seen at rest, and Light and Dark buttons to see both themes. It opens for owners only, and only while the shop's New look is on.

## How the Spec's rules were applied

- **No new colours.** Hover and pressed are an overlay of the ink colour at 8% and 16% on the component's own fill, so they need no colours of their own and work the same in light and dark. Field, select, checkbox and switch hover use the ink-2 border.
- **Focus** is a 2px brand-text ring with a 2px offset on every interactive component. The only `outline: none` is on the inner text input, whose wrapper shows the ring instead (a test enforces this).
- **Small screens:** below 768px every button, input, select, checkbox, switch and menu option is at least 44px high.
- **Reduced motion:** the spinner stops spinning and the switch does not slide.
- **Colour is never the only signal:** every status is an icon and a word; every payment chip shows the method's name; errors carry an icon and words.
- **Accessibility wiring:** every field has a visible label tied to its input; the helper and the error are read with the input (`aria-describedby`) and an error marks the input invalid; the Select is a labelled combobox with a listbox of options and `aria-activedescendant`; the switch is a real switch.

## How it was checked

- **69 automated tests** for the components (behaviour, keyboard use, accessibility wiring, the Spec's sizes and tokens read from the stylesheet, and "each component is defined once"). The test that forbids hard-coded colours now covers the whole `newlook` folder, including this one.
- **A real browser run, 23 checks, all passing** (light and dark, plus a 375px phone): measured sizes (button 40/32/44px with 10/8px corners, input and select 40px, checkbox 18px, switch 36 by 20px, card 20px padding with 14px corners and a 1px line, card title 17px at 600, page title 28px at 700 in Inter, icon 18px); Tab shows a 2px brand-text ring with a 2px offset; Select opens, moves, picks and closes from the keyboard; money takes digits only; the date is day first; a switch says Saved; on a phone every control is at least 44px and the page does not scroll sideways; no errors in the console.
- All 53 test files (746 tests) pass; lint is clean; the production build compiles.

## Decisions and judgement calls (please read)

1. **"Cards never nest more than one level."** I read this as: a card may sit inside a card, but not a third inside that. A third level reports an error while developing. If you meant "never a card inside a card", tell me; it is a one-line change.
2. **Fields have no "loading" state, and buttons have no "error" state.** AC-04 lists default, hover, focus, disabled, loading and error for each component, but a loading field or an error button makes no sense. Each component has the states that apply to it.
3. **Money fields take digits only** (as the Spec says), so cents cannot be typed. The Spec's money format ("KES 2,350, no decimals unless there are cents") is for display, which a later component will do.
4. **The Select is built here, not taken from a library**, so that it follows the Spec's keyboard rules and the same outline and ring as a Field. It has been tested with the keyboard and in a browser; it has not yet been tried with a screen reader or on a real tablet.
5. **Switch "Saved"** stays for 4 seconds. The Spec's toast rules (6 seconds, pause while hovered, spoken) apply to toasts, which come with P1-5.
6. **Not in this ticket:** Table, Pagination, Filter row, Tabs, Detail panel, Empty state and Skeleton (P1-4); Dialog, Menu, Toast and Drawer (P1-5); Segmented control, Stat tile, Chart card, Search, New menu, Page banner and Number pad (later tickets that need them).
7. **The old screens still use their own buttons and fields.** AC-04's "no screen defines its own button, field, table or card" can only hold once every screen is rebuilt on these components; for now it holds for everything in the New look.
