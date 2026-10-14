# Current Release Design and Provenance

## Presentation Revision

The professional presentation revision adds manuscript-in-preparation context,
methods, directly supported preliminary results and interpretation limits. Shared
copy in `content/project.json` generates the README and the same project section
on every dataset page. `scripts/refresh_presentation.py` maintains this copy,
taxonomy annotations, captions and release hashes. The cuboid viewer's JS/CSS are
the canonical common UI copied to the other three datasets by this refresh.

Anthropoid and hominoid PCA plots use exact-ID joins to reconciled project sampling
labels, with consistent genus colors, a counted legend, group emphasis, partition
symbols and accessible tooltips. Named fossil genera retain their source-label
status; lacking a comparative tree assignment does not erase a named genus.
KB3133 remains unassigned. No taxonomy is newly inferred or revised; historical
names are retained. Source hash and public-only records: `content/taxonomy.json`.

Six boundary tests plus browser checks verify unchanged meshes, scalars, score
coordinates, axes and exclusions; shared-copy equivalence; taxonomy joins; release
hashes; and desktop/mobile rendering and interactions. See `PRESENTATION_BRIEF.md`
for design intent. The author requested exact joint decoding; the fifth-panel
implementation is deferred to the separately gated plan in
`EXACT_JOINT_DECODING.md`. No additive approximation is presented as a model output.

The 14 October 2026 update displays the latest completed seed-2071 model for each
of four current datasets, replacing the live historical epoch-150 anthropoid
viewer. The update does not select a best seed or adopt scientific conclusions.

## Current Sources

All exports use verified final checkpoints, frozen input operators/common bases
and archived endpoint codes. One saved training reconstruction was replayed
exactly per model. Weights were checked unchanged; no encoder forward pass,
training or confirmation-code evaluation was performed.

Training-code PCA defines PC1-PC4 independently for each model. Tuning codes are
projected where present. Each axis has 41 actual decodes from -2 to +2 training
score SD on one fixed template. Surface panels are not combined two-PC decodes;
axes are not aligned across datasets or seeds. Templates are decoder contexts,
not PCA observations. See the README for epochs, counts and learning rates.

The scalar is `100 * dot(decoded - mean, outward mean normal) / mean bbox
diagonal`, using area-weighted mean normals. Blue is inward, white zero,
orange/red outward. Each dataset defaults to a symmetric scale at the 98th
percentile of absolute displacement. It is not reconstruction error or
closest-surface signed distance and does not show tangential motion.

Exact triangle-intersection and degeneracy checks cover all 164 sampled positions
per dataset. Anthropoid and hominoid viewers have 18 and 46 flagged positions;
mandible and humerus viewers have none under these tests. No sampled surface has
an exactly degenerate or near-zero-area face. Warnings remain visible, including
intersections at the hominoid decoded mean. Anatomy and unsampled continuous
paths are not certified by these tests.

Public provenance records checkpoint/decoded-array hashes, seed, epoch, common
dimension, learning rate, template, fit counts, replay error and source-exporter
identity. Geometry and signed arrays are copied without smoothing or repair.
Private local paths and full operational receipts are not published.

The public viewer has no score CSV or score-download control. Values and IDs
needed for the visible score plots remain public browser assets. Each dataset
includes a provisional caption, editable geometry measurements, source data,
provenance and QA note. Anatomical and cross-seed review remain pending.

See `PUBLICATION_BRIEF.md` for reader task, hierarchy, accessibility, salience
self-audit and publication checks. Only `site/` is deployed.

---

# Historical Epoch-150 Viewer (Not Deployed)

The following preserved notes describe the original June release, not the
current four-dataset viewer.

## Reader task

Let colleagues inspect decoded anatomical surface change along the first
four raw-latent PC traversal axes from the anthropoid cuboid morphospace.

## Display design

The page uses four separate synchronized-capable Three.js viewers, one per
PC. Each panel exposes a slider whose center is the midpoint decoded surface
and whose ends are the negative and positive traversal extremes. The camera
uses free trackball rotation with roll enabled so anatomical views are not
constrained to a fixed upright axis. Optional viewer syncing links camera
orientation, pan, and zoom across all panels. Vertex colors encode signed
normal displacement relative to the midpoint surface.

## Color direction

Blue means inward contraction relative to midpoint normals; white means
near-zero displacement; orange/red means outward expansion. The default
display uses one shared color scale across all PCs:
+/-0.02488640 model-coordinate
units, computed as the 98.0th percentile of the
absolute signed displacement values across all four PCs.

## Source data

- Source NPZ: `outputs/pod_sync/anthropoid_clean411_postprocessed_epoch150_pc1234_signed_traversal/pc_traversals_epoch_0150_contextsafe_train_rawpca4_pct5_95_pc1234_signedreview/pc_traversals.npz`
- Vertices: shape [4, 41, 12000, 3], exported to
  `assets/data/vertices_f32.bin`
- Signed normal displacement: shape [4, 41, 12000], exported to
  `assets/data/signed_normal_displacement_f32.bin`
- Faces: shape [23996, 3], exported to
  `assets/data/faces_u32.bin`
- PCA context: active manuscript Fig 9A species-mean and projected-individual
  PCA/pPCA source data, exported to `assets/data/pca_context.json`
- Template mesh: `Nasalis_larvatus_106273_CUB`
- Decoder context mesh: `Nasalis_larvatus_106273_CUB`

## Boundaries

This is a static communication viewer. It does not estimate correspondences,
retrain the model, recompute PCA, or decode new latent coordinates. The
bottom PCA panels redraw existing manuscript source data and do not refit
ordinary PCA or phylogenetic PCA in the browser.
