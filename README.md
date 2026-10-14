# Current Biological Shape Traversals

Interactive PC1-PC4 traversals for four current seed-2071 models:

| Dataset | Epoch | Common dimension | PCA training specimens | Projected tuning specimens | Initial learning rate |
| --- | ---: | ---: | ---: | ---: | ---: |
| Anthropoid cuboids | 250 | 44 | 244 | 52 | 0.001 |
| Non-fossil hominoid cuboids | 350 | 40 | 110 | 26 | 0.001 |
| Revised-map mouse mandibles | 350 | 44 | 93 | 0 | 0.001 |
| Repaired mouse humeri | 350 | 44 | 77 | 0 | 0.0003 |

[Open the viewer](https://oothomas.github.io/anthropoid-cuboid-signed-traversal-viewer/).

Each axis contains 41 actual decoder outputs from -2 to +2 training-score
standard deviations, with interactive rotation, animation, camera/slider syncing,
neutral and signed colors, wireframe and sampled-surface geometry warnings.

Blue denotes inward and orange/red outward displacement along the decoded-mean
normal, expressed as a percentage of its bounding-box diagonal. This is not
reconstruction error or closest-surface signed distance, and omits tangential
movement. PCA is fitted only to training codes; confirmation and template codes
are absent from the plots. Axes are not aligned between models.

These are provisional anatomical inspection outputs, not selected best seeds,
scientific model acceptance or a completed cross-seed comparison. Geometry
warnings are preserved. Each dataset includes a caption, geometry table,
quality note and sanitized provenance.

## Local review

```bash
python3 run_server.py
```

This serves `site/` on an available localhost port. Use HTTP, not `file://`, since
the viewer fetches binary data and verifies its checksums.

## Publishing Boundary

GitHub Actions deploys **only `site/`** on a push to `main`. The historical root
viewer/assets remain in the repository for provenance but are excluded from the
new Pages artifact. No checkpoints, raw latent codes, local filesystem paths,
private run logs, score CSVs or score-download controls are deployed.

Values needed to draw the public score plots remain browser-readable; removing
download controls does not create access control or confidentiality.

`site/release.json` identifies the release and hashes every included asset.
`scripts/package_current_traversals.py` builds it from the verified local review.
See `PUBLICATION_BRIEF.md` and `DESIGN_AND_PROVENANCE.md` for the design, QA and
scientific boundaries. No analysis or model inference runs in the browser.
