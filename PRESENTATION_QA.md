# Presentation Quality Checks

14 October 2026. State: review-grade draft, pending author review of public copy
and taxonomic labels. Not manuscript or biological model acceptance.

Scientific-introduction revision: the shared text now follows biological
motivation, methodological gap, two-stage approach, evidence and implications.
Cuboid anatomy and earlier development findings were checked against the active
manuscript's Introduction and Discussion. Earlier-model morphometric findings
are explicitly separated from the current exports; no historical numerical
result or axis-specific interpretation is attributed to the newly shown models.
Technical caveats remain in dataset notes/captions and README technical sections.
Dedicated desktop/mobile captures of the project section accompany the full-page
checks. The author should review scientific emphasis and wording, not merely
confirm successful rendering.

- Nine automated boundary tests pass: scientific-array/score preservation against
  the prior published commit; taxonomy joins and fossil-label exceptions; shared
  copy and links; preliminary-result numbers; release/privacy boundaries; and
  deterministic, idempotent presentation generation; citation order, links and
  software credits; malformed/missing-reference rejection and escaped HTML;
  and the author-supplied README screenshot's exact hash, dimensions and caption
  consistency with the exported model and geometry records.
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

Citation update: 13 numbered references and six source-repository credits are
generated identically in all four pages and the README. Primary papers, official
repositories and local implementation records support attribution. Robin Magnet's
pyFM is cited as software rather than as an invented standalone article. The
revised mandible method is explicitly distinguished from the Panine baseline;
the prism decoder is credited to SNK without implying adoption of its pairwise
zero-shot pipeline. Published sources are not attached as evidence for the new
unpublished results. Dedicated reference/software screenshots on desktop and
mobile show readable lists, wrapping long titles and no overlaps. Citation
navigation and source links pass local browser checks; GitHub's Markdown API
retains the numbered citations and custom reference anchors.

README image: the author-selected 1692 x 1159 PNG is copied without pixel changes,
cropping or hidden geometry warnings. Its SHA-256, caption and source metadata are
under assets/readme/. The screenshot links to the current hominoid viewer and is
not deployed as a new scientific figure. The caption states the independent
single-PC interpretation, training-PCA sample size, mean-normal displacement
definition and visible PC1 intersection warning. This is an illustrative image,
not a publication-figure-quality or anatomical-validity certification.

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
