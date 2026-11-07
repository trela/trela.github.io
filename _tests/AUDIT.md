# Accessibility review results

Reviewed 2026-11-06 against `origin/main` at `bdb059a`.

- Both revisions built successfully with Jekyll 4.3.2, Ruby 3.1.7 and the unchanged Gemfile.lock.
- axe-core's WCAG 2.1 A/AA rules checked all 37 rendered pages using the shared layout in light and dark modes at 1440px. The final run reported **no non-contrast violations**. All remaining automated violations were contrast findings: 936 elements across 18 light-mode pages; none in dark mode. Counts include repeated publication metadata and tags.
- Keyboard checks passed at 390px for the first-tab skip link, focus transfer into main content, mobile navigation with Space and Escape, focus-triggered tooltips and Escape, search/no-results announcements and clearing (including a pending debounce), and the persisted dark-mode switch. The 404 search field has an explicit accessible name.
- Unfocused comparisons on eight representative pages at 1440px and 390px in both modes found identical geometry and zero differing pixels in 96 paired top/middle/bottom screenshots using pixelmatch's 0.1 threshold.
- Native Chromium focus indicators were checked on links, buttons, search fields and the custom checkbox controls and retained. No focus-ring redesign was needed.

## Additional review on 2026-11-06

Reviewed the existing branch at `2a8c69b`, its diff against `main`, shared templates/scripts/styles, and rendered pages. No stylesheet, imagery, or research/content edits were needed.

- Reproduced two tooltip failures on the prior branch: mouse departure hid the tooltip while its link retained keyboard focus, and Escape during the 200ms show delay allowed the tooltip to appear afterward. Shared tooltip handling now preserves content while either focus or hover remains, including hover over the popup, and cancels pending display on Escape. This addresses behavior described in [WCAG 2.1 SC 1.4.13](https://www.w3.org/WAI/WCAG21/Understanding/content-on-hover-or-focus.html).
- Search announcements include the query so searches with equal result counts can be distinguished. The existing text-based Clear search link now clears in place, cancels pending work, and returns focus to the search field, like the icon control. Modified clicks retain normal link behavior.
- Active tag links expose an “active filter” accessible name that retains their visible text and supports multiple selected filters. Primary navigation and Home expose `aria-current="page"` only on their own destination pages.
- Expanded browser regression checks cover these cases, including hover/focus combinations, delayed Escape, multiple filters, and current-page metadata. The full audit again checks 37 pages in both themes: no non-contrast violations, with the same 936 contrast findings across 18 light-mode pages. Keyboard and tooltip checks pass.
- Compared this review's changes against `2a8c69b`: eight pages × two widths × two themes, with identical geometry and zero differing pixels in all 96 paired viewport screenshots (pixelmatch threshold 0.1). Both builds use Ruby 3.1.7, Jekyll 4.3.2, and the unchanged lockfile.

## Remaining gaps and deliberately deferred changes

- **Contrast (WCAG 1.4.3):** light-mode gray `#7a869a` text on white measures approximately **3.68:1**, below the 4.5:1 requirement for normal-sized text. Examples include publication venues/years/tags, research project subtitles, alumni degree details, and previous/next post labels. These colors, font sizes and backgrounds were left unchanged under the design-preservation requirement.
- **Reflow (WCAG 1.4.10):** at a 320px viewport, the existing research project grid produces a 330px document width and the team alumni grid produces a 340px document width. Fixing their minimum column widths or section padding would change layout, so this remains a design follow-up. The other four main pages tested had no document-level horizontal overflow at that width.
- **Manual review:** axe marked contrast over pseudo-element/image backgrounds for manual review on every page, including header/footer text. A clean automated result in a mode is not proof that all contrast passes. Screen-reader checks with NVDA/VoiceOver, 200–400% zoom and text-spacing adjustments, tooltips across browsers and magnification settings, and alternative-text quality in context remain necessary. Active filters now have assistive names, but their existing visual distinction still relies on color and needs a design review for a non-color cue (1.4.1). No social embeds are configured today; third-party accessibility should be reviewed if they are added.
- No colors, fonts, typography, spacing, layout, imagery, research prose, biographies or publication data were intentionally changed. The skip link and screen-reader text are hidden from the normal layout; the skip link appears on focus.

This is a practical accessibility improvement toward WCAG 2.1 Level AA. It is **not an ADA certification**, a legal opinion, or a claim of complete WCAG conformance. Automated code/browser checks alone cannot establish legal compliance.
