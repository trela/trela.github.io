# Design-dependent accessibility follow-up

Reviewed 2026-11-06 against `origin/main` at `bdb059a`, independently of
[PR #2](https://github.com/trela/trela.github.io/pull/2). This addresses its documented
contrast, narrow-grid reflow, and color-only filter selection gaps. No commits from
PR #2 are included: main already supplies the `data-active` filter state needed by
these styles. Its separate accessible-name and other mechanics work remains in PR #2.

## Changes and measured contrast

Ratios use WCAG relative sRGB luminance, `(Llighter + 0.05) / (Ldarker + 0.05)`.
Displayed ratios are rounded; checks use unrounded values.

| Text / state | Foreground | Background | Contrast |
| --- | --- | --- | --- |
| Previous light secondary text | `#7a869a` | `#ffffff` | 3.68:1 |
| New light secondary text | `#626f84` | `#ffffff` | 5.09:1 |
| New light secondary text | `#626f84` | `#f4f6fa` | 4.70:1 |
| Existing dark secondary text | `#8a97ad` | `#0f1a2c` | 5.90:1 |
| Existing dark secondary text | `#8a97ad` | `#14223a` | 5.39:1 |
| Light selected/hovered publication tag | `#ffffff` | `#00629b` | 6.52:1 |
| Dark selected/hovered publication tag | `#0f1a2c` | `#6cace4` | 7.19:1 |

- Darken only the light `--gray` token within its existing blue-gray family. This
  covers publication metadata/tags, project subtitles, alumni details, and post
  navigation labels. The dark theme's palette is unchanged.
- Publication tag specificity previously kept gray text over the filled hover and
  selected background: 1.77:1 in light mode and 1.22:1 in dark mode on main. Use the
  existing inverse foreground for those states, matching other tags.
- Cap the project/alumni minimum grid tracks at 100% of available content width.
  Allow their flex text children to shrink and wrap long words if needed. At 320px,
  the existing 40px section padding leaves 240px-wide cards; document widths change
  from 330px (research) and 340px (team) to 320px. Gaps, padding, imagery, and
  desktop column behavior are retained.
- Add a 2px underline with a 3px offset to every selected filter. Keep the blue
  fill; hovering an unselected filter does not add the selection underline.
  The cue uses the existing state attribute and does not alter search behavior.

## Validation

- Baseline and changed builds succeed with Ruby 3.1.7 / Jekyll 4.3.2 and the existing
  lockfile. Playwright 1.65.0 / bundled Chromium and axe-core 4.14.0 were used.
- Axe `color-contrast`, all **37 rendered pages in both themes at 1440px**:
  baseline has 936 failing elements across 18 light pages; changed build has
  **zero violations in either theme**. Redirect stubs are excluded.
- All 37 pages in both themes at **320 CSS pixels**: document and body widths are
  320px, with no main-content element crossing the viewport. Baseline overflows
  are reproduced on research and team in both themes.
- Publication and news filters at 320px in both themes: keyboard activation,
  focused selected underline, multiple selected filters, clearing, and distinct
  hover/selection treatment pass. Selected-filter pages pass axe contrast;
  computed foreground/background contrast on filled tags exceeds 4.5:1.
- Geometry comparison against main on research, team, and publications at 1440px
  and 390px in both themes is identical for header/main/footer/sections/headings,
  cards, citations, and images. At 320px, research/team geometry changes as intended;
  publication geometry is unchanged. Screenshots reviewed for narrow project and
  alumni cards and light/dark selected tags show readable wrapping and visible
  underlines. Color changes are intentional, so pixel identity is not expected.
- `node --check _tests/design-gaps.cjs` and `git diff --check` pass.

## Reproduce the automated checks

Build and serve the site using the repository's Ruby environment:

```sh
bundle install
bundle exec jekyll build
python3 -m http.server 4000 --directory _site
```

Install browser audit dependencies outside the checkout, then run in a second shell:

```sh
npm install --prefix /tmp/trela-a11y-tools playwright@1.65.0 @axe-core/playwright@4.14.0
/tmp/trela-a11y-tools/node_modules/.bin/playwright install chromium
NODE_PATH=/tmp/trela-a11y-tools/node_modules node _tests/design-gaps.cjs _site http://127.0.0.1:4000
```

The script fails on contrast violations, 320px overflow, or filter-state regressions.
It writes full axe violations/incomplete results, widths, and filter measurements
outside the site to `/tmp/trela-design-gaps.json` (override with `DESIGN_REPORT`).
For a baseline comparison, build main into a separate directory and serve it on a
second port; pass that directory and URL to the same script with `ALLOW_FAILURES=1`
and a separate `DESIGN_REPORT` path. Generated reports and dependencies are not
committed. Jekyll excludes this underscore-prefixed test directory from publication.

## Limits

This is a targeted follow-up, not a full accessibility audit. Axe still marks
image/pseudo-element backgrounds for manual contrast review on every page,
including header/footer content; a zero-violation result does not certify those
backgrounds. This PR does not change that artwork or establish that all such
backgrounds pass. Non-contrast mechanics from PR #2 are deliberately not copied.
Full screen-reader, contextual alt-text, cross-browser, text-spacing, and browser
zoom/magnification checks remain. The 320px test checks CSS viewport reflow, not
all zoom settings. No claim of complete WCAG conformance or ADA certification is made.
