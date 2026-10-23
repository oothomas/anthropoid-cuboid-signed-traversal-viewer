# Professional Results Presentation

State: design-briefed, 14 October 2026. Public communication draft for author
review; not manuscript adoption. Existing scientific arrays remain unchanged.

## Reader Question And Audience

What biological shapes and models are shown, how were these morphospaces built,
and what can a visitor infer from the decoded variation? Readers include
morphologists, computational biologists and collaborators unfamiliar with the
training campaign. Their tasks are to inspect anatomy, locate specimens by genus,
and distinguish preliminary observations from validated biological conclusions.

## Design And Reading Order

Keep the four usable traversal surfaces as the first experience, with a compact
project identity and manuscript-in-preparation status. Retain dataset navigation,
signed scale, geometry warnings and existing controls. Follow surfaces with the
two PCA plots, then the shared project introduction, methods, preliminary results,
implications and interpretation limits. The README uses the identical project
text, with approved illustrative screenshots and concise model/display notes.

Use unframed full-width sections, restrained white/gray backgrounds, dark text,
teal links and the existing blue-white-orange/red displacement scale. No marketing
hero or decorative illustrations. Meshes are the primary visual evidence.

## PCA Encoding

Anthropoid and hominoid points use the reconciled project sampling-label genus,
joined by exact specimen identifier, not guessed from filenames. Genus colors are
consistent between those datasets. Preserve historical project taxonomic names;
this display update does not revise taxonomy. KB3133 remains Unassigned. Training
observations are circles and projected tuning observations triangles. A visible
alphabetical genus legend includes plotted counts; a genus selector emphasizes
one group without changing scores or PCA fitting. Tooltips and keyboard focus
provide specimen, genus, taxon label, partition and scores. These redundant cues
are essential because 30-plus categories cannot be identified by color alone.
Mouse plots retain partition encoding; no invented group metadata are added.

Axes: PC1/PC2 and PC3/PC4; units are training-score standard deviations; variance
percentages describe latent score variance, not reconstruction accuracy. Counts:
anthropoids 244 training + 52 tuning; hominoids 110 + 26; mandibles 93 training;
humeri 77 training. No confirmation observations or templates are added.

Author requirement: all PCA plots are 1:1, with square SVG viewports, square
inner plotting frames and identical x/y numeric limits. One SD therefore occupies
the same pixel distance horizontally and vertically on desktop and mobile; no
stretching is allowed. This preserves score-space geometry, not unstandardized
PC variance (axes remain in SD units as labeled).

## Shared Copy And Evidence

Single editable copy source: content/project.json. Generated outputs: README.md
and the project section of all four site/<dataset>/viewer/index.html files.
The introduction follows the manuscript's biological problem, correspondence
gap, two-stage contribution and implications. It names the cuboid joint surfaces,
plantar tuberosity and tendon groove to establish the anatomical motivation.
Initial results describe the reconstruction and decoding outputs available for
all four datasets. Earlier morphometric agreement and anatomical-localization
findings are explicitly identified as earlier-model development evidence, without
importing their numerical values or claiming completion of current cross-seed
and comparative assessments. Run
details and geometry caveats remain in dataset notes, captions and provenance,
not the scientific introduction. Genus source is the
reconciled sampling ledger, recorded by hash and minimal public assignments in
content/taxonomy.json. Dataset captions, provenance, QA and release hashes are
updated alongside the presentation. No new hypothesis or evolutionary claim.

Caption scaffold: Fig 1. Decoded shape variation and latent principal-component
scores in [dataset]. Retain the existing model, template, sample-size, signed
scale and geometry caveats; add genus colors, partition symbols and taxonomy
source where applicable. No manuscript figure number is assigned to this website.

## QA And Promotion

### Citation And Software Attribution Update, 14 October 2026

Reader question: which published methods support each step, and which upstream
implementations underpin this study? Add sentence-level numbered citation links,
an always-visible reference list and a separate source-software list after the
scientific narrative. One registry supplies the README and all four pages;
references are numbered by first appearance. Use full bibliographic titles and
author names/initials, linked to DOI or primary sources. Repository credits name
the implementation's specific role rather than implying upstream endorsement.

Correct the dataset-specific Stage 1 attribution: the revised mandibles use a
separately initialized adaptive-triangulation surface-map method, not merely a
Panine refinement. Credit the SNK-inspired prism head without describing the
autoencoder as SNK's pairwise matching method. Credit Robin Magnet's pyFM directly
as software; do not imply that other papers by the author were used without
implementation evidence. Citations support background and borrowed methods,
not this study's unpublished model-specific findings.

Keep anatomy as the first visual signal. References use an unframed ordered list,
14px type, hanging numbers, generous line height and wrapping titles; no color
encoding is needed beyond the existing accessible link color. Add jump links,
descriptive citation labels and keyboard-focus targets. Test desktop/mobile
readability, citation order and destinations, identical shared text, unchanged
scientific hashes and 1:1 PCA plots. Source registry: content/references.json;
generator: scripts/refresh_presentation.py; QA: PRESENTATION_QA.md and the local
traversal_citations_20261014 review package. No new analytical figure or table is
created by the citation update.

### Author-Supplied README Screenshot

The author subsequently selected a 1692 x 1159 px screenshot of the current
non-fossil hominoid viewer, showing PC1-PC4 at +1.6 SD. Reuse this image exactly,
without cropping, retouching, rescaling its stored pixels or hiding geometry
warnings. Place it after the README introduction and link it to the hominoid
viewer. It illustrates decoded anatomical variation for readers arriving at the
repository; it is not a new manuscript figure or evidence of biological validity.
Keep the original aspect ratio. The caption identifies the seed/epoch, the 110
training specimens used for PCA, independent single-PC changes and signed
mean-normal displacement. Source image, caption and provenance live under
assets/readme/. Check image hash, dimensions, caption against export metadata,
and GitHub rendering. Salience: colored anatomy should be noticed before the
interface controls; preserve the visible scale and geometry warnings as context.

Check shared-copy equivalence, exact taxonomy joins, unchanged coordinates and
binary hashes, all relative links under the Pages project prefix, absent score
downloads, finite plots, keyboard/touch interaction, consistent colors, and
desktop/mobile text/canvas framing. Save browser checks and full screenshots in
the local publication-review report. Refresh site/release.json after final edits.
Salience self-audit: anatomy first, PC controls second, plot grouping third;
scientific context follows rather than obscures surfaces. Request author review
of introductory claims and genus labels before calling this manuscript-ready.

### Approved Mandible Correspondence Screenshot, 23 October 2026

The author approved the reviewed pairs and authorized a screenshot for the
two-stage approach section. Use template 809_10 and mapped specimen 158_56,
between the Stage 1 and Stage 2 paragraphs. The paired surfaces answer how
correspondence transfers locations between specimens. Transported spatial
colors are not an error scale; the fourteen numbered landmarks provide a
non-color correspondence cue. Dashed markers are seen through the surface.
The caption distinguishes the revised adaptive-triangulation mapping branch
and the actual nearest-vertex Stage 2 target from a neural reconstruction.

Keep the 1568 x 578 image unmodified and proportionally displayed. Anatomy
and matching landmarks should dominate, with the explanatory caption below.
The raster, caption and sanitized provenance live under assets/readme/.
No new mesh, map or landmark arrays are published. The local review viewer
and its data remain private. Author screenshot approval is not scientific
certification of map quality. The README omits operational review/publishing
instructions and unpublished technical proposals as requested.
