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
text, followed by repository-specific reproduction information.

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
Preliminary results report directly reproducible first-four-PC variance and
sampled geometry flags from the current release, not improvements measured in
different seeds or uncompleted cross-seed assessments. Genus source is the
reconciled sampling ledger, recorded by hash and minimal public assignments in
content/taxonomy.json. Dataset captions, provenance, QA and release hashes are
updated alongside the presentation. No new hypothesis or evolutionary claim.

Caption scaffold: Fig 1. Decoded shape variation and latent principal-component
scores in [dataset]. Retain the existing model, template, sample-size, signed
scale and geometry caveats; add genus colors, partition symbols and taxonomy
source where applicable. No manuscript figure number is assigned to this website.

## Exact Joint Traversal Decision

The author selected exact joint decoding, not an additive surface approximation.
Prepare a technical solution separately before adding the fifth panel. Do not
mislabel sums of axis displacements as nonlinear decoder output, publish decoder
weights, expose private compute, or start new training in this presentation task.
See EXACT_JOINT_DECODING.md for the implementation and validation proposal.

## QA And Promotion

Check shared-copy equivalence, exact taxonomy joins, unchanged coordinates and
binary hashes, all relative links under the Pages project prefix, absent score
downloads, finite plots, keyboard/touch interaction, consistent colors, and
desktop/mobile text/canvas framing. Save browser checks and full screenshots in
the local publication-review report. Refresh site/release.json after final edits.
Salience self-audit: anatomy first, PC controls second, plot grouping third;
scientific context follows rather than obscures surfaces. Request author review
of introductory claims and genus labels before calling this manuscript-ready.
