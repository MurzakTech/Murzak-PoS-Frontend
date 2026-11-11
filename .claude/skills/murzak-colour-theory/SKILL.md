---
name: murzak-colour-theory
description: The colour theory behind Murzak's brand and the POS palette: where each colour comes from, which pairs are safe for text, how the warm accents relate to the cool brand, and how to analyse a client's brand colours. Use when choosing or changing a colour, adding a chart series or status colour, designing a client-branded screen or site, or when a palette feels muddy, loud or inaccessible.
---

# Murzak colour theory

Measured, not guessed. Numbers below come from `src/assets/logo_mark.png` and `src/newlook/tokens.css`. The live websites (murzaktech.tech and client sites) could not be opened from the build environment, so anything about them is marked "to verify" until someone supplies the URLs or brand files.

## 1. The brand, read from the logo

The Murzak "M" is two overlapping shapes: a violet left stroke, a sky-blue right stroke, and a deep indigo where they cross.

| Role in the logo | Approx. colour | Hue | White text on it | On white background |
|---|---|---|---|---|
| Violet | `#9848f8` | 267° | 4.55:1 | 4.55:1 |
| Sky blue | `#18a8f8` | 201° | 2.63:1 (fails) | 2.63:1 (fails) |
| Deep indigo (overlap) | about `#3b2fc0` | 245° | 8.9:1 | 8.9:1 |

Colour theory reading:
- **Analogous harmony.** Violet and sky sit 66° apart on the wheel, so they blend smoothly. Calm, trustworthy, technical. Typical of software that wants to feel dependable.
- **The overlap is the bridge.** Where blue and violet cross, the eye reads a darker indigo. The app's brand colour, indigo `#4f46e5` (hue 243°), is that overlap colour. That is why the app can use indigo as its working colour and still feel like the logo.
- **Cool and saturated.** Both logo hues are around 70 to 90% saturation. At that intensity they are good for identity and large shapes, poor for body text on white (sky fails, violet only just passes).

Practical rule: **the logo colours are for identity moments (the mark, a hero, a gradient), never for small text.** Small brand-coloured text and icons use `--brand-text` (indigo, 6.3:1 on white).

## 2. How the POS palette is built

| Layer | Tokens | Theory |
|---|---|---|
| Neutrals (about 90% of the screen) | `--bg #f4f4f8`, `--surface #fff`, `--ink #12131a`, `--ink-2`, `--muted`, `--line` | Slightly cool greys with a hint of violet, so neutrals belong to the brand instead of fighting it. Pure grey beside indigo looks dead |
| Brand (the 10%) | `--brand`, `--brand-text`, `--soft`, `--track` | One hue at several lightnesses: fill, text, tint, track. A monochromatic ramp, so it never clashes |
| Warm accents | `--series-2` orange `#eb6834` (hue 17°), `--series-4` amber `#eda100` (41°) | The brand is hue 243°, so its **complement** is near 63° (yellow-orange). Orange and amber are the warm side of that complement. Used for cash, costs and credit, so they pop against indigo without a second brand colour |
| Green (card) | `--series-3 #1baf7a` (159°) | Sits between the cool brand and the warm accents, so it separates both |
| Meaning | `--good #006300`, `--bad #c93232`, `--warn #a85d00` | Deep, darker versions so they pass 4.5:1 as text (7.5, 5.3 and 5.0 on white). Always with an icon and words |

Why a few colours: four chart series (indigo, orange, green, amber) are the most the eye can tell apart reliably, and the system caps charts at four. Pairs are far apart in hue, not just lightness, which also helps colour-blind readers.

## 3. Rules that follow

1. **Contrast first.** Text 4.5:1, large text and UI parts 3:1. Mid-tone chart colours fail 3:1 on white (`--series-3` 2.8, `--series-4` 2.2), so a series must also be labelled directly.
2. **Never put white text on sky `#18a8f8`.** Put `--ink` on it, or darken it. Gradients from violet to sky are fine behind a mark, not behind words.
3. **One accent at a time.** The shop owner picks one accent. Do not add a second brand hue to a screen.
4. **Dark mode: lower the lightness, do not invert.** Light brand fill (`#7c75f0`) with dark text is correct for buttons; for big areas such as the Home hero use a deep tint (`color-mix` of the brand with `--surface`) and light `--ink` text (measured 8.6 to 12:1) so large surfaces do not glare.
5. **Tints from tokens.** Make soft backgrounds with `color-mix(in srgb, var(--brand) N%, var(--surface))`, never new hex values, so they follow every accent and both themes.
6. **Meaning colours stay meaning colours.** Do not use red, green or amber as decoration.

## 4. Analysing a client's brand (or Murzak's own website)

When given a URL, logo or brand guide:

1. **Extract** the real values: logo pixels (cluster dominant colours), then CSS custom properties and the `theme-color` meta tag. Record hex, hue, saturation, lightness.
2. **Classify the harmony** from hue gaps: monochromatic (under 30°), analogous (30 to 90°), complementary (about 180°), triadic (about 120° apart).
3. **Find the roles:** primary (identity), secondary, neutral, accent, and meaning colours. Note what the client actually uses for buttons and links, which can differ from the logo.
4. **Test it:** contrast of text on each background, white and black text on each brand colour, and the colour-blind check on any chart set.
5. **Map to the POS system:** the shop's accent must be one of the tested accents (indigo, blue, teal, green, amber, red, pink, purple, slate), or a new accent added to `tokens.css` with both themes and the contrast test in `brand/accents.test.js`. Never type a client hex into a component.
6. **Record the finding** in `docs/` next to the brand note, with the extracted values and the chosen accent.

## 5. To verify (needs the sites or brand files)

- Murzak's own site colours at murzaktech.tech (not reachable from the build environment).
- Each client's brand values.
- Whether the site uses the same indigo as the app or the logo violet and sky.

Ask the owner for the URLs or exported brand files, then follow section 4.
