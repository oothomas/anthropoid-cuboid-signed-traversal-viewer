# Dense correspondence and interpretable skeletal morphospaces

**Manuscript in preparation | Preliminary results**

Comparative skeletal biology seeks to relate anatomical variation to function and evolutionary history. The primate cuboid, a bone of the lateral midfoot, presents a demanding case: its joint surfaces, plantar tuberosity and peroneus longus tendon groove form a complex anatomy relevant to foot mechanics. Comparing this anatomy requires measuring differences across curved surfaces, articular margins and local relief, not only at isolated points.

[Explore the results](https://oothomas.github.io/anthropoid-cuboid-signed-traversal-viewer/).

## The methodological gap

Three-dimensional scans capture detailed surfaces, but do not establish which locations correspond between specimens. Anatomical landmarks provide expert-defined anchors, yet may undersample variation between them. Dense matching addresses coverage, while learned shape spaces summarize variation; biological interpretation requires connecting both to inspectable anatomy. This study addresses that connection: how to build a quantitative morphospace from anatomically constrained dense matches and reconstruct the surface changes it represents.

## A two-stage approach

Stage 1 uses landmark-adapted functional maps to estimate dense correspondences across a sparse network of specimens and templates. Anatomical anchors constrain the matches; surface diagnostics and targeted refinement address local discontinuities, collapse and incomplete coverage. This correspondence stage is part of the methodological contribution because errors in matching propagate into subsequent shape analysis.

Stage 2 synchronizes the maps into a common basis and trains an autoencoder, building on DISCO-AE and DiffusionNet, to encode and reconstruct complete skeletal surfaces. Principal-component analysis (PCA) summarizes variation in the learned codes. Decoding along those axes reveals the associated anatomical changes, linking statistical relationships among specimens to surface geometry.

## Study scope and initial results

Anthropoid cuboids are the primary application. A non-fossil hominoid subset examines the same element within a narrower taxonomic range; mouse mandibles and humeri test the approach on different skeletal geometries. The current models produce reconstructed surfaces and decoded shape variation for all four datasets. These outputs make local contours, projections and depressions available for anatomical inspection alongside specimen relationships in the morphospace.

Earlier development analyses found agreement between learned shape relationships and manual-landmark and automated pseudolandmark morphometrics, with decoded cuboid axes localizing articular and plantar variation. These findings concern earlier model versions. Reconstruction, morphometric agreement, repeatability, phylogenetic signal and size associations are being reassessed for the revised datasets and models shown here.

## Biological significance

The contribution is a connection between whole-surface measurement and anatomical explanation, complementing established geometric morphometrics. Instead of stopping at separation in a scatterplot, researchers can examine where and how surfaces differ and formulate explicit hypotheses about joint form, tendon pathways and skeletal diversity. Such hypotheses still require comparative or biomechanical tests: decoded variation alone does not establish locomotor adaptation or evolutionary causation.

## Models in this release

| Dataset | Epoch | Common dimension | Training PCA | Projected tuning | Initial learning rate |
| --- | ---: | ---: | ---: | ---: | ---: |
| [Anthropoid cuboids](https://oothomas.github.io/anthropoid-cuboid-signed-traversal-viewer/cuboid/viewer/) | 250 | 44 | 244 | 52 | 0.001 |
| [Non-fossil hominoid cuboids](https://oothomas.github.io/anthropoid-cuboid-signed-traversal-viewer/hominoids/viewer/) | 350 | 40 | 110 | 26 | 0.001 |
| [Mouse mandibles](https://oothomas.github.io/anthropoid-cuboid-signed-traversal-viewer/mandible/viewer/) | 350 | 44 | 93 | 0 | 0.001 |
| [Mouse humeri](https://oothomas.github.io/anthropoid-cuboid-signed-traversal-viewer/humeri/viewer/) | 350 | 44 | 77 | 0 | 0.0003 |

All four displays use seed 2071, not a selected best seed. Counts are specimens represented in the PCA plots, not total dataset sizes. The hominoid dataset is a subset of the anthropoid collection, not independent evidence.

PCA is fitted to training codes, with tuning specimens projected where available. Confirmation specimens and reference templates are excluded. The mouse models use all non-template specimens for descriptive training, not held-out generalization tests. Shared correspondence construction also limits claims of fully unseen-specimen performance.

## Reading the decoded surfaces

Each panel varies one PC over 41 actual decoder outputs from -2 to +2 training-score standard deviations, holding other components at the training-code mean. Axes are specific to each model and are not aligned across datasets or seeds.

Blue denotes inward and orange/red outward displacement along the decoded mean surface normals, as a percentage of the mean bounding-box diagonal; white is zero. This is not reconstruction error, closest-surface distance or unmapped coverage. Tangential movement is not encoded. Dataset captions and geometry tables report local surface-quality flags; decoded anatomy remains subject to review.

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
