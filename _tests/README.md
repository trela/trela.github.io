# Accessibility checks

Use the repository's Ruby 3.1 build environment and a current Node.js release:

```sh
bundle install
bundle exec jekyll build
python3 -m http.server 4000 --directory _site
```

In a second terminal, install the audit tools outside the checkout:

```sh
npm install --prefix /tmp/trela-a11y-tools playwright @axe-core/playwright
/tmp/trela-a11y-tools/node_modules/.bin/playwright install chromium
NODE_PATH=/tmp/trela-a11y-tools/node_modules node _tests/accessibility.cjs _site http://127.0.0.1:4000
```

The script runs axe's WCAG 2.1 A/AA rules on every generated page using the shared layout, in light and dark modes at 1440px. It also exercises keyboard skip navigation, the mobile navigation checkbox and Escape, focus-triggered tooltips and Escape, search announcements and clearing, and the persisted dark-mode switch at 390px. Redirect stubs are excluded. The JSON report defaults to `/tmp/trela-accessibility.json` (override with `A11Y_REPORT`). Contrast findings are reported but do not fail the command because changing the site's colors requires a separate design decision. Other automated violations or failed keyboard checks fail the command.

Review axe's `incomplete` results manually. Also check zoom/reflow, native focus indicators, tooltip hover persistence, image alternatives in context, and reading/focus order with screen readers. Automated checks do not establish full WCAG conformance or ADA compliance. This directory is excluded from Jekyll output by its leading underscore.

To compare appearance, build the base revision in a separate worktree and serve it on port 4001 while serving the changed build on port 4000. Then run:

```sh
npm install --prefix /tmp/trela-a11y-tools pngjs pixelmatch
NODE_PATH=/tmp/trela-a11y-tools/node_modules node _tests/visual.cjs http://127.0.0.1:4001 http://127.0.0.1:4000
```

This compares layout geometry and top/middle/bottom viewport screenshots on eight representative pages, at 1440px and 390px, in light and dark modes. It writes a summary and any differences under `/tmp/trela-visual` (override with `A11Y_VISUAL_DIR`). Screenshots load fonts and images and disable animations during capture. Pixel comparison uses a 0.1 color-difference threshold, so it is evidence of visual preservation rather than a guarantee for every browser or interaction.
