# Design and provenance note

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
