# v2 mockups (reference only)

These are the HTML source files of the v2 mockups from the design canvas.
They are NOT runnable on their own (they need the canvas runtime `support.js`,
and images point to `/_blob/...` canvas URLs; local copies are in `thumbs/`).

Use them to read exact values:
- Colours for both themes: the `renderVals()` function at the bottom of each file (`c = dark ? {...} : {...}`).
- Sizes, radii, spacing, font sizes and weights: the inline `style="..."` attributes.
- Icon shapes: the inline `<svg>` paths (week-icons.dc.html is the source of truth for WeekDayIcon).

Screenshots of each board in light and dark are the visual target: see the *.png files next to this README.

| File | Board |
| --- | --- |
| bugun.dc.html | v2 · Bugun (theme: light/dark) |
| bellashuv.dc.html | v2 · Bellashuv (theme: light/dark) |
| profil.dc.html | v2 · Profil (theme: dark/light) |
| week-icons.dc.html | v3 · Streak icons (light and dark strips) |
