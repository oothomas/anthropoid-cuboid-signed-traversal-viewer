# Current-model public traversal update

## Reader Task
Inspect PC1-PC4 decoded anatomy in four current seed-2071 models, distinguish
inward/outward movement from reconstruction error, and identify sampled geometry
warnings. The audience is biological morphology and computational collaborators.
These are provisional inspection outputs, not best-seed selections or aligned
cross-dataset comparisons.

## Design
Reuse the verified four-panel Three.js viewer, with dataset navigation and no
landing page. Open anthropoids by default. Anatomy has first visual priority;
PC labels, sliders, SD positions and signed scales follow. Neutral surfaces,
wireframe and numeric warnings complement the blue-white-orange/red scale.
Keep the existing readable desktop/mobile layout and controls.

Anthropoids: epoch 250, common44, 244 training and 52 projected tuning codes.
Non-fossil hominoids: epoch 350, common40, 110 training and 26 tuning codes.
Revised-map mandibles: epoch 350, common44, 93 training codes.
Repaired humeri: epoch 350, common44, 77 training codes, initial LR 0.0003.
All use seed 2071; the other three initial learning rates are 0.001.
Confirmation codes are excluded; templates provide decoder context, not PCA fits.

## Publication Boundary
Only `site/` is deployed. Include checked geometry/scalars, minimal score values
required by the on-screen plots, vendor libraries, captions and sanitized source
records. Omit score CSVs and score-download controls, checkpoint files, raw latent
codes, full export receipts, local filesystem paths and private operational logs.
Browser-rendered data remain retrievable; removal of download controls does not
create confidentiality or access control.

## Communication Package
Caption scaffold: Fig 1. Interactive principal-component traversals of [dataset].
Specify final epoch, seed, fixed template, training/tuning counts, 41 actual
decodes per axis, SD range, normal-displacement sign/units, sampled geometry
flags, and provisional anatomical interpretation.

Public metadata/hashes: `site/<dataset>/traversals/provenance.json`.
Editable geometry table: `site/<dataset>/traversals/geometry.csv`.
Caption/quality note: `site/<dataset>/traversals/{caption.txt,QA.txt}`.
Plot/geometry source: `site/<dataset>/traversals/data.json` and `data/`.
Package identity: `site/release.json`.
Generator: `scripts/package_current_traversals.py`.

## Acceptance Checks
Verify source receipts, binary hashes and exact copied values. Check all four
models, navigation under a GitHub Pages project prefix, nonblank/moving canvases,
desktop/mobile framing, text fit, geometry warnings, absent score-download
controls/files and absence of private filesystem paths. Preserve the local review
package. Salience self-audit: anatomy first, controls second, provenance secondary;
no new scientific interpretation. Author and cross-seed review remain pending.
