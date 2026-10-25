---
name: ui-visual-review
description: A look-at-it-for-real review loop for UI changes: run the app, take screenshots at several widths in light and dark, critique them against the design principles, fix, and repeat. Use after building or changing any screen or component, before calling UI work done, or when asked to review, polish or critique a page.
---

# Visual review loop

Code that compiles is not a design that works. After any UI change, look at it.

## 1. Run it

Check `package.json` scripts: `npm start` (Create React App on port 3000). The back end is a separate service; if it is not reachable, use the mocked-data approach from the existing review scripts described in `docs/redesign/P6-1-accessibility.md` and `P6-2-responsive.md` (mock `/api/method/*` responses), or the component and chart demo pages under `src/newlook` (`ComponentPage.jsx`, `charts/ChartsPage.jsx`, `DataDemo.jsx`, `OverlayDemo.jsx`, `ShellDemo.jsx`), which need no server. Put any throwaway scripts in the scratchpad, not in the repo.

If a plain `npm start` is slow to boot, build once (`npm run build`) and serve `build/` with any static server.

## 2. Capture

Chromium and Playwright are pre-installed (`require('playwright')`; do not run `playwright install`). Capture the changed screen at:

| Width | Why |
|---|---|
| 1280 | Desktop back office |
| 1024 | Small laptop / tablet landscape |
| 768 | Tablet |
| 375 | Phone |

In **light and dark** (set `document.documentElement.dataset.theme = 'dark'`), and in at least one non-default accent (`dataset.accent = 'teal'`). Capture full-page for long screens. Also capture the states: loading, empty, error, long text, many rows, a dialog or panel open, keyboard focus on the main controls.

Open the images with the Read tool and actually look at them.

## 3. Critique against this list

**Hierarchy**
- Can I name the first, second and third thing my eye goes to? Is that the right order?
- Is there exactly one primary action per region?

**Layout and spacing**
- Everything on the 4/8/12/16/20/24/32/40 scale? Anything touching or floating?
- Are related things grouped and unrelated things separated? Are edges aligned? Are numbers right-aligned?
- Any horizontal scroll at 375? Any clipped or overlapping text?

**Type and colour**
- Only tokens used; no stray hex? Contrast fine in both themes? Meaning never by colour alone?
- Numbers tabular, money formatted via the shared formatter?

**Craft**
- Are corner radii nested correctly? Borders and shadows only where the system says?
- Do icons share one stroke and size? Do images reserve space and have a fallback?
- Do loading skeletons match the final layout so nothing jumps?

**Human feel** (see `human-not-ai`)
- Any gradient, glow, emoji or filler copy that is there for decoration? Remove.
- Does the copy sound like a person who knows retail? Is there a next step in every empty and error state?

**Behaviour**
- Keyboard: Tab through everything, visible focus, no trap, Esc closes overlays, Enter submits.
- Touch: targets at least 40px (44px at the till).
- Reduced motion respected? Nothing animates that should be instant?

## 4. Fix and re-capture

List the problems in order of severity, fix them, capture again, compare. Stop when the self-critique questions in `design-fundamentals` all pass, not when the first screenshot looks fine. Two or three rounds is normal.

## 5. Automated checks before finishing

```
npm test -- --watchAll=false --ci src/newlook
npx eslint --ext .js,.jsx src/newlook
node scripts/colour-scan.js
npm run build
```

axe-core can be run on the page for an accessibility scan (the project used axe 4.11 with wcag2a, wcag2aa, wcag21a, wcag21aa and best-practice tags; zero serious or critical issues is the bar).

## 6. Report honestly

When you finish, tell the user what you looked at (widths, themes, states), what you changed because of it, and anything you could not check (for example a real device, a screen reader, the live back end). Do not claim a visual result you did not see.
