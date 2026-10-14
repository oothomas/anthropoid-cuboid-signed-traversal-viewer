# Dense correspondence and learned biological morphospaces

**Manuscript in preparation | Preliminary results**

Biological shape varies across entire surfaces, not only at a small set of anatomical landmarks. This project links dense surface correspondence with a reconstruction-capable morphospace: a statistical representation in which differences between specimens can be examined as changes in three-dimensional anatomy. The current study includes anthropoid cuboids, a non-fossil hominoid cuboid subset, mouse mandibles and mouse humeri.

[Explore the results](https://oothomas.github.io/anthropoid-cuboid-signed-traversal-viewer/).

## Two complementary stages

Stage 1 establishes dense correspondences between landmarked skeletal surfaces through a network of specimen and template relationships. Landmark-adapted functional maps, correspondence audits and dataset-specific refinement connect anatomical locations across differently shaped meshes. Correspondence quality is a central methodological question, not simply a preprocessing assumption.

Stage 2 uses a DiffusionNet-based autoencoder and a shared functional-map basis to learn specimen shape codes. A prism decoder reconstructs surfaces from those codes on a fixed template. Principal-component analysis (PCA) summarizes variation in the training codes; decoding along its axes connects positions in the morphospace to explicit changes in surface anatomy. The method builds on functional-map and DISCO-AE approaches.

## Initial results

The current models yield decoded shape variation for all four datasets. The first four latent principal components account for 43.2% of training-code variance in anthropoid cuboids, 57.8% in non-fossil hominoid cuboids, 67.2% in mouse mandibles and 66.2% in mouse humeri. These percentages describe the displayed portion of each morphospace; they are not measures of reconstruction accuracy and do not rank the models across datasets.

Surface quality remains part of the assessment. Among 164 axis-position outputs per model, intersection checks flag 18 anthropoid and 46 hominoid outputs, versus none in the mandible or humerus outputs. The decoded mean is repeated on each axis in this count. No exactly degenerate or near-zero-area faces were detected in these sampled outputs. Absence of a flag does not establish anatomical correctness or validate unsampled shapes.

## Implications and limits

The intended contribution is a link between dense anatomical correspondence, quantitative shape relationships and reconstructable anatomy. This makes a learned morphospace inspectable beyond a scatterplot: proposed differences can be examined on decoded surfaces and checked for local distortion. Biological, functional and evolutionary interpretations still require anatomical review and supporting analyses.

This release shows the latest completed seed-2071 model for each dataset, not a selected best seed or a completed repeatability comparison. PCA uses training specimens only, with tuning specimens projected where available; confirmation specimens and reference templates are absent from the score plots. The mouse datasets use all non-template specimens for descriptive training, so their displays are not held-out generalization tests. Shared correspondence construction also limits claims of fully unseen-specimen performance.

## What the surfaces represent

Each of the four surface panels is an actual decoder output for one principal component, sampled at 41 positions from -2 to +2 training-score standard deviations while the other components remain at the training-code mean. Each dataset has its own model, fixed template and PCA axes; axis numbers are not aligned across datasets or seeds.

Blue denotes inward and orange/red outward movement relative to the decoded mean, measured along its outward vertex normals and expressed as a percentage of its bounding-box diagonal. White denotes zero normal displacement. This is not reconstruction error, a closest-surface signed distance or a measure of unmapped coverage; tangential movement is not represented.

## Models in this release

| Dataset | Epoch | Common dimension | Training PCA | Projected tuning | Initial learning rate |
| --- | ---: | ---: | ---: | ---: | ---: |
| [Anthropoid cuboids](https://oothomas.github.io/anthropoid-cuboid-signed-traversal-viewer/cuboid/viewer/) | 250 | 44 | 244 | 52 | 0.001 |
| [Non-fossil hominoid cuboids](https://oothomas.github.io/anthropoid-cuboid-signed-traversal-viewer/hominoids/viewer/) | 350 | 40 | 110 | 26 | 0.001 |
| [Mouse mandibles](https://oothomas.github.io/anthropoid-cuboid-signed-traversal-viewer/mandible/viewer/) | 350 | 44 | 93 | 0 | 0.001 |
| [Mouse humeri](https://oothomas.github.io/anthropoid-cuboid-signed-traversal-viewer/humeri/viewer/) | 350 | 44 | 77 | 0 | 0.0003 |

All four displays use seed 2071. Counts are specimens represented in the PCA plots, not total dataset sizes. The hominoid dataset is a subset of the anthropoid collection, not independent evidence.

## Genus annotations

Point colors identify genus from the reconciled project sampling labels; the same genus has the same color in both cuboid datasets. Circles are training specimens and triangles are projected tuning specimens. Counts in the genus legend include both partitions. Historical project taxonomic names are retained; this is not a taxonomic revision. KB3133 has no assigned genus and remains Unassigned.

Display annotations are joined by exact specimen identifier. No scores are moved, PCA is not refitted, and no confirmation observations are added. The source hash and minimal public assignments are in `content/taxonomy.json`.

## Joint-PC decoding

The requested fifth panel will decode a single code with all four PC coordinates varied together. It is not yet implemented. An additive mesh approximation was explicitly declined. See [the exact-decoding implementation plan](EXACT_JOINT_DECODING.md). The four existing panels remain genuine single-axis decoder outputs.

## Local review

```bash
python3 run_server.py
```

This serves `site/` on an available localhost port. Use HTTP rather than `file://`; binary assets are fetched and checksum-verified.

## Reproducibility and publishing

GitHub Actions publishes only `site/`. The historical root viewer and assets are preserved in the repository but are not deployed. Each dataset includes an editable geometry table, caption, quality note and sanitized provenance. `site/release.json` hashes every deployed asset.

No checkpoints, raw latent codes, private filesystem paths, run logs, score CSVs or score-download controls are deployed. On-screen score values and identifiers remain public browser assets; removing downloads does not create access control.

The shared scientific introduction is maintained in `content/project.json` and rendered into this README and all four traversal pages. After a presentation edit, run `python3 scripts/refresh_presentation.py`. `scripts/package_current_traversals.py` creates the initial allowlisted scientific package from a verified local export; presentation refresh is a separate step. Read `PRESENTATION_BRIEF.md` and `DESIGN_AND_PROVENANCE.md` for the communication and scientific boundaries.

Public project copy is a review-grade draft. The manuscript is in preparation; no publication, peer-review outcome or completed biological validation is implied.
