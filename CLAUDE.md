# Murzak POS Frontend

React 19 app built with Create React App (`react-scripts`), Redux Toolkit, React Router 6, MUI 7 (old screens) and a custom "New look" design system (new screens) under `src/newlook`. Talks to a separate Frappe/ERPNext-style back end over `/api/method/*`. Used in Kenyan shops: KES, M-Pesa, patchy connectivity, phones and tablets as well as desktops.

## Design standard

The front end must look modern, calm, specific to retail and clearly made by people who care. It must not look generated. Every UI task follows these project skills (in `.claude/skills/`):

| Skill | Use it for |
|---|---|
| `murzak-design-system` | Tokens, shared components, strings file, rules the tests enforce. Read first for any UI change |
| `design-fundamentals` | Hierarchy, spacing, grid, type, colour, contrast, shape, data display, motion |
| `human-not-ai` | Avoiding generic "AI look" and AI-sounding copy; writing plain, warm, specific words |
| `murzak-colour-theory` | Where the brand and POS colours come from, safe text pairs, how to analyse a client's brand |
| `pos-ux-patterns` | The till, payments, M-Pesa, offline, tables, forms, roles, receipts |
| `ui-visual-review` | Screenshot, critique and fix loop before calling UI work done |

For a UI task: invoke `murzak-design-system` and the skill that matches the work, build, then run `ui-visual-review`. Do not report UI work finished on the strength of passing tests alone; look at it.

## Non-negotiables

- New screens go in `src/newlook`, built from `src/newlook/components`. Do not extend the old MUI screens' styling.
- No hard-coded colours, sizes or radii in `src/newlook`; use tokens from `src/newlook/tokens.css`. Works in light, dark and every accent colour.
- No visible words inside components; they live in the strings files. Follow `src/newlook/labels/renameMap.js`.
- Accessible by default: keyboard, focus ring, contrast, `aria-label` on icon-only buttons, reduced motion.
- Nothing the user typed is lost on error, offline or sign-out.
- Write for the user in plain English that translates cleanly to Swahili. No em dashes.

## Commands

```
npm start                                              # dev server on :3000
npm test -- --watchAll=false --ci                      # whole suite (what CI runs)
npm test -- --watchAll=false --ci src/newlook          # New look only
npx eslint --ext .js,.jsx src/newlook                  # lint, include .jsx
node scripts/colour-scan.js                            # hard-coded colour counts (budget may only go down)
npm run build                                          # production build must compile
```

## Where things are documented

`docs/redesign/` holds one note per redesign ticket (design tokens, components, accessibility, responsive, language, offline, receipts and brand). Root-level `*_API_DOCUMENTATION.md` and `*_IMPLEMENTATION_PLAN.md` files describe back-end contracts and feature plans.

## Working style

- Match the surrounding code's naming, comment density and idiom.
- Develop on the branch assigned to the session; open a draft pull request after pushing.
- When explaining to the owner, who is not a developer, define jargon and walk through steps.
