# P5-5: Sign-in page in the New look

Front end only. Acceptance check AC-35: the Sign-in page uses the same tokens and components, shows a clear error in words for a wrong
password, and has the theme toggle. The route stays `/login`. No back end, no redirect, `redirects/live.js` and `newLookRoutes.js` untouched.

## 1. What was built

| File | What it is |
|---|---|
| `src/newlook/auth/SignInPage.jsx` | The page: one card, centred, 360 to 420px wide (shrinks to fit a 320px phone), with the logo and "Murzak POS" name, the heading, the two boxes, Show password, Forgot password, the Sign in button, the Create account (or Murzak portal) link, Terms, Privacy and the help email. A light or dark toggle sits top right. |
| `src/newlook/auth/useSignIn.js` | The sign-in steps. Calls the SAME Redux actions in the same order as `src/pages/Login.js` (see section 3). |
| `src/newlook/auth/signInErrors.js` | Turns what the sign-in reported into our own plain words and says which box to mark. Pure, tested. |
| `src/newlook/auth/deviceFlag.js` | Reads and writes the device-only flag (section 2). |
| `src/newlook/auth/strings.auth.js`, `auth.css` | Every visible word, and the styles (tokens only). |
| `src/newlook/auth/*.test.*` | Four test files (section 6). |
| `src/pages/Login.js` | The ONLY edit: two imports, the existing component renamed `CurrentLogin` (its body is untouched), and a 4-line `Login` on top that picks the page from the flag. |
| `src/newlook/NewLookProvider.jsx` | Two lines: `writeCache` also calls `writeDeviceFlag`. |
| `src/newlook/labels/scanLabels.js` | Added `autoCapitalize` and `autoCorrect` to the technical attribute names (they hold values such as "none", not words). |

Parts used: `Card`, `Field` (password through its `type`), `Checkbox` (Show password), `Button` (till size 44px, ghost icon button for the
toggle and for dismissing the message), `Icon`. The error message follows the existing icon-plus-words alert pattern (`role="alert"`).

## 2. The device flag: design and why

Sign-in happens before anyone is known, so the shop's New look switch (on the server) cannot be asked. Design:

- `NewLookProvider` writes `localStorage` key `murzak_new_look_device` = `'1'` or `'0'` every time it learns the switch (the server's answer when someone is signed in, and when the owner turns the look on or off in Settings).
- `Login.js` reads it once when the page opens. `'1'` shows the new page. Anything else (no value, `'0'`, storage blocked) shows the current page exactly as today.
- Departure from the suggested name: the key is `murzak_new_look_device`, not `murzak_new_look:device`, because the provider keeps its per-shop answers under `murzak_new_look:<shop name>` and a shop called "device" would have shared the key.
- Signing out keeps the flag. `src/utils/session.js` removes only a fixed list of keys, and this one is not in it (a device setting like `themeMode`; it holds no personal data). A test checks this.
- Consequences to know: the very first sign-in on a device, and a device that is signed in only after the owner switches the look on, still see the current page once; from then on the device follows the shop. If the owner switches the look OFF, the next time anyone signs in on that device and the provider hears it, the flag turns to `'0'` (until then, the sign-in page on that device is still the new design). On a device shared between two shops, the flag is whatever the last signed-in shop said.
- No server call is added to the sign-in page, and nothing about it needs the network.

## 3. Same sign-in logic, not a new one

`Login.js` keeps its flow inside the component, and the ticket allows only a thin switch there, so `useSignIn` repeats the orchestration (about 50 lines) but calls the same actions: `loginUser`, `fetchCurrentUser`, `checkOnboardingStatus`, `clearError`, and `classifyLoginId` for the email or phone. Same order, same data sent (`{ email | phone, password }`, then `{ ..., otp }` for the code), same redirect (`location.state.from`, else `/dashboard`; `/onboarding` when there is no company), same skip when already signed in, same clearing of the error on leaving. Session handling (tokens, `clearSession`) is inside the thunks and the slice, which are not touched.

`loginSwitch.test.jsx` runs the password, code, profile and redirect sequence through the current page and through the new page against the same mocked API and checks the requests are identical. If the rules in `Login.js` ever change, change `useSignIn.js` to match.

## 4. Error words (AC-35)

The page never shows the server's sentence. It uses it only to tell the kinds apart, then shows its own words (`strings.auth.js`) in an alert (`role="alert"`) with an alert icon, and marks the box:

| What happened | Words shown | Box marked, focus goes to |
|---|---|---|
| Wrong password or email, no such account, account switched off (all the same) | "That email, phone number or password is not right. Check them and try again." | Password (red outline, "Check your password.", `aria-invalid`) |
| Locked after too many wrong tries | "Too many wrong tries. Wait 15 minutes, then try again. Or choose Forgot password to set a new one." (the real number of minutes, singular for 1) | none; first box |
| Too many requests | "Too many tries in a short time. Wait a minute and try again." | none |
| Offline, no connection, slow, busy, server fault | Plain sentence for each, never blaming the password | none |
| Wrong two-step code | "That code is not right. Open your authenticator app and type the newest code." | Code box (emptied, focused) |
| Anything unknown | "We could not sign you in. Try again, and email support if it keeps happening." | none |

Before sending, empty or malformed boxes get a sentence beside them ("Enter your password.") and the focus goes to the first one; nothing is sent. The message can be dismissed; a new attempt clears it.

## 5. Two-step code, keyboard, themes

- Code step: heading "Enter your code", the code box has the focus, numbers only (a pasted "123 456" becomes `123456`), `inputmode="numeric"` and `autocomplete="one-time-code"`, Enter submits, a short code is explained (not sent), a wrong code empties the box and refocuses it, and "Use a different account" goes back (email kept, password emptied). The "lost your phone" advice is kept.
- Keyboard: native form, so Enter submits from any box; Tab order is email, password, Show password, Forgot password, Sign in; the focus ring is the shared `--focus-ring`; the first box is focused when the page opens.
- Theme toggle: top right, a ghost icon button named "Switch to dark theme" or "Switch to light theme". It uses `useThemeMode`, the same hook as the app shell, so the choice is saved under `themeMode`, survives signing out, and the page opens in the saved choice (or the device setting).
- Small screens: tap targets 44px, 16px page gutter, the card narrows to 288px on a 320px phone. Dark values come from the tokens.

## 6. How AC-35 was checked

| Part of AC-35 | Check |
|---|---|
| Same tokens and components | Built from `Card`, `Field`, `Checkbox`, `Button`, `Icon`; `auth.css` uses only variables. The token test and the colour ratchet pass (no hex or rgb in `src/newlook`). |
| Clear error in words for a wrong password | `SignInPage.test.jsx` "a wrong password" (alert text, no raw server words, password marked, focus returns, same words for a switched-off account, lock with minutes, no connection) and `signInErrors.test.js`. |
| Theme toggle | `SignInPage.test.jsx` "the theme toggle": light to dark and back, saved in `themeMode`, `data-theme` on the page, opens in the saved theme. |
| Two-step code, keyboard, paste, back | `SignInPage.test.jsx` "the two-step code" and "keyboard". |
| Flag on versus off | `loginSwitch.test.jsx` (never signed in, `'0'`, `'1'`, blocked storage) and `deviceFlag.test.jsx` (the provider writes the flag; sign-out keeps it). |
| Old behaviour unchanged | `Login.js` diff is the two imports, one rename and the wrapper; there were no existing Login tests. The current page is rendered by the flag-off tests, and the parity test runs the same flow through it. |

Results: new tests 58 (auth folder, 4 files), all of `src/newlook` 54 suites and 2337 tests, the rest of the app 58 suites and 707 tests, all passing. ESLint with `--ext .js,.jsx` on `src/newlook/auth`, `NewLookProvider.jsx` and `Login.js` is clean. Word scanner, colour ratchet and token tests pass.

## 7. Old action, where it is now

| Old action on `/login` | Now (New look on) |
|---|---|
| Sign in with email or phone number | Same box, same rules (`classifyLoginId`), same request |
| Show or hide the password | "Show password" tick under the box |
| Two-step 6-digit code, and "Use a different account" | Code step with paste, and the same way back |
| Wrong password, locked and other errors in an alert | Alert in plain words, plus the box marked |
| Signed out for being idle note (`?reason=idle`) | Same note |
| Forgot password link to `/forgot-password` | Same link, same page (not redesigned here) |
| Terms and Privacy links, help email | Kept |
| Create account (shared build) or Murzak portal link (per-shop build) | Kept, by the same `IS_TENANT_BUILD` rule |
| Already signed in: skip the form | Kept |
| Theme toggle | New |

## 8. Decisions and things to know

- The shop name is not shown: before sign-in nobody is known, and showing the last shop's name on a shared till would leak it. The logo and the "Murzak POS" name are text a screen reader can read.
- No preview route was added. To see the page, set `localStorage.setItem('murzak_new_look_device', '1')` and open `/login` while signed out. A signed-in person is sent on to the dashboard, as with the current page.
- Not changed, but worth knowing: the existing `loginUser` action also raises its own pop-up ("Login Failed" with the tidied server words) through the app's notification system. That pop-up is the same as on the current page. For a switched-off account its words differ from those for a wrong password, so that pop-up (not this page) could hint that the account exists. Fixing it means changing the action, which this ticket does not touch; the lead may want a small follow-up ticket.
- The key name departure, and the "one more old or new sign-in page after the switch changes" consequence, are in section 2.

## 9. Needs browser check (lead)

1. Signed out, `murzak_new_look_device` = `'1'`: open `/login`. One centred card, 420px wide on a desktop and a 320px phone (no sideways scroll, tap targets at least 44px), light and dark.
2. Toggle to dark and reload: the page stays dark; sign in and out: the shell opens in the same theme.
3. Wrong password against the real server: the alert reads in plain words, the password box has a red outline with the words "Check your password.", and the focus ring is on the password box. Check it with a screen reader if possible (the alert should be read once).
4. An account with two-step sign-in: the code step, paste from an authenticator, a wrong code, "Use a different account".
5. With the flag `'0'` or absent: `/login` is exactly the old page.
6. Sign in with the New look on, sign out: the next `/login` is the new design; switch the look off in Settings, sign out: the page is the old one after the provider has heard the change.
7. The pop-up note in section 8 (the "Login Failed" notification beside the new alert): is it acceptable to see both?
