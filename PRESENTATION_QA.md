# Presentation Quality Checks

14 October 2026. State: review-grade draft, pending author review of public copy
and taxonomic labels. Not manuscript or biological model acceptance.

- Six automated boundary tests pass: scientific-array/score preservation against
  the prior published commit; taxonomy joins and fossil-label exceptions; shared
  copy and links; preliminary-result numbers; release/privacy boundaries; and
  deterministic, idempotent presentation generation.
- All four datasets pass Chrome desktop (1500 x 1000) and mobile (390 x 844)
  checks for nonblank surfaces, framing, slider movement, animation, reset,
  display modes, navigation and absent score-download files/controls.
- All eight PCA plots are square. Desktop viewports measure 724 x 724 px and
  plotting frames 650 x 650 px; mobile viewports measure 374 x 374 px and frames
  300 x 300 px. Shared x/y numeric limits preserve equal SD-to-pixel scaling.
- Genus checks cover 296 anthropoid and 136 hominoid plotted observations,
  complete counted legends, matching cross-dataset colors, group emphasis,
  keyboard tooltips/Escape and mobile selection. Metadata retain named fossil
  genera without inventing comparative assignments. KB3133 remains Unassigned.
- Source geometry, colors, scores, model identity, confirmation exclusions and
  scientific geometry warnings are unchanged. The fifth viewer is not simulated;
  actual joint inference remains the separately documented implementation task.

Salience self-audit: anatomy remains the first-viewport evidence; controls and
the signed scale are subordinate to the meshes. Square plots preserve the score
geometry. Genus colors alone cannot distinguish 30-plus groups reliably, so the
named legend, selector, partition symbols and specimen tooltips supply redundant
identification. Shared project prose follows the plots in unframed sections.
Desktop and mobile screenshots were checked for overflow, clipping and hierarchy.
This is an agent self-audit, not independent reverse-feedback review. Ask the
author whether the page communicates the two-stage method and preliminary status
without implying that latent grouping proves biological validity.

Reproduce boundary tests with `python3 scripts/test_presentation.py` and browser
tests with `node scripts/check_site.cjs BASE_URL OUTPUT_DIRECTORY` in an environment
with Playwright and Chrome. The browser script writes screenshots and a structured
receipt, including measured aspect ratios. Each deployment must pass these checks
again against the live site before it is reported as verified.
