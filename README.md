# Anthropoid cuboid signed traversal viewer

Static GitHub Pages-ready viewer for the selected anthropoid cuboid
epoch-150 decoded PC traversals. The page has four separate Three.js
viewers, one for each of PC1-PC4. Each viewer uses a negative-to-zero-to-
positive slider over 41 precomputed traversal states. Surface colors encode
precomputed signed normal displacement from the midpoint mesh, interpolated
together with the geometry as the slider moves.

Mouse interaction uses free trackball rotation, so the bone can be tumbled
around any viewing axis rather than being held to a fixed upright camera.
The `Sync viewers` button links camera orientation, pan, and zoom across all
four panels while leaving the PC sliders independently controllable unless
`Sync sliders` is also enabled.

The bottom section redraws the active manuscript Fig 9A PCA/pPCA source
data for PC1-PC4: ordinary PC1-PC2, PC1-PC3, PC1-PC4, and phylogenetic
pPC1-pPC2, pPC1-pPC3, pPC1-pPC4. Species/subspecies means and projected
individual specimens use the same clade color encoding as the manuscript
figure.

## Local review

```bash
python3 run_server.py
```

Open the printed localhost URL. Direct `file://` loading will not work in
most browsers because the page fetches local binary assets.

## Standalone GitHub repository deployment

This repository is designed to be published as its own GitHub Pages site. After
creating an empty GitHub repository, push this folder to `main`:

```bash
git remote add origin https://github.com/oothomas/anthropoid-cuboid-signed-traversal-viewer.git
git push -u origin main
```

The included GitHub Actions workflow deploys the static site to GitHub Pages.
For a repository named `anthropoid-cuboid-signed-traversal-viewer`, the public
page should be:

```text
https://oothomas.github.io/anthropoid-cuboid-signed-traversal-viewer/
```

The viewer is static and does not rerun any analysis or generate new
decoded surfaces. It only displays the precomputed traversal geometry and
signed displacement scalars and Fig 9A PCA context data in `assets/data/`.

If GitHub Pages is not enabled automatically after the first push, open the
repository Settings, choose Pages, and set Build and deployment to GitHub
Actions.
