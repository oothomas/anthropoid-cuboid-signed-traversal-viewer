# Exact Four-PC Joint Traversal

Technical proposal, 14 October 2026. The author chose exact joint decoding and
declined an additive preview. No new training, public inference endpoint, model
weight publication or fifth-panel approximation has been launched.

## Required Calculation

For slider values `s1 ... s4` in training-score standard deviations, construct

```text
z(s) = training_code_mean + sum_i s_i * sqrt(variance_i) * PC_loading_i
surface(s) = frozen_decoder(z(s), fixed_template_context)
```

Use the existing training-only PCA, its saved signs and float64 fitted values,
then cast the assembled code to float32 exactly as in the current exporter.
Reshape to common-dimension by 32 channels: 44 x 32 for anthropoids, mandibles and
humeri; 40 x 32 for hominoids. All undisplayed PC scores remain zero. No encoder
forward pass, refitting, smoothing, remeshing or confirmation evaluation is needed.

The fifth viewer has no slider. It receives all four coordinates together while
the four existing panels continue to show the corresponding single-axis decodes.
The fifth surface must not be computed as mean plus four mesh displacements:
the nonlinear decoder does not in general commute with that addition.

"Exact" here means the same frozen decoder evaluated at the joint latent code,
within a tested floating-point tolerance, not bitwise identity across hardware
and not proof that the generated anatomy is biologically valid.

## Verified Implementation Constraints

The inspected `LS_DF_Prism_net.only_decoder` calls the template-basis expansion,
DiffusionNet decoder, triangle-feature averaging and prism face head. The head
predicts translations and raw 3 x 3 matrices. The latter are projected to proper
rotations using SVD and determinant correction. Face motions are then accumulated
and averaged at vertices. Diffusion blocks use spectral transforms, learned
per-channel times, gradient operators, nonlinear gradient features and ReLU MLPs.
This is not just a final linear layer that can be applied to exported PCA scores.

The current static package has only 164 axis-position meshes per model. At the
current 41 slider positions, a complete joint lookup needs 41^4 = 2,825,761 meshes.
At 12,000 vertices, float32 XYZ alone would occupy approximately 407 GB decimal
per model, before colors or geometry audits. A coarse lookup with interpolation
would be an approximation, not the requested solution.

[GitHub Pages is static hosting](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).
It can serve browser inference assets, but cannot execute the existing Python
decoder as a server-side request. [ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/)
provides browser inference; its WebGPU backend supports a subset of ONNX operators,
so conversion and device support require testing rather than an assumed export.

## Recommended Implementation Sequence

### 1. Establish A Local Reference Endpoint

Build a read-only, localhost-only inference adapter around the existing verified
export loader. Start with the mandible model because its current axis outputs have
no intersection flags; this is an engineering choice, not evidence that its joint
outputs are valid. Load only one fixed template and the frozen decoder. Use the
lightweight loader pattern already needed for the anthropoid export, not an
entire training-data cache. Retain exact checkpoint, PCA and operator hashes.

The request contains a versioned model ID and exactly four finite SD values in
[-2, 2]. Reject arbitrary file paths, checkpoint selection, uploads and extra
dimensions. The response contains request ID, echoed coordinates, release/model
hashes, finite float32 XYZ, signed normal displacement and a geometry-check state.
Faces and the mean reference are immutable, checksum-verified client assets.
No optimizer or training code is invoked. A queued request superseded by a newer
slider state can be dropped before inference; an old response cannot overwrite
the current shape. Keep the last verified surface with its actual coordinates
while the new result is pending. Never relabel a stale surface as the requested one.

This reference is a development tool, not a public deployment. No router port
forwarding, public tunnel or exposure of the user's Windows workstation is proposed.

### 2. Test A Browser-Native Decoder

Preferred public deployment: keep GitHub Pages and execute a decoder-only model
in the visitor's browser. This avoids an always-on research workstation and a
public inference bill, but makes the released decoder weights and template
operators downloadable. That publication decision needs explicit author approval.

Freeze the template context and remove encoder/optimizer/training assets. The
retained F architecture has 1,958,092 non-encoder parameters, approximately 7.47 MiB
as float32 before template arrays and runtime files. This is a parameter-count
estimate, not a tested browser package size or memory requirement.

Port in two pieces if necessary:

1. Common-basis expansion, spectral diffusion, nonlinear features, MLPs and the
   prism head through a supported inference graph.
2. Batched 3 x 3 SVD with the original determinant correction and unchanged face
   assembly in a tested numerical WebAssembly or WebGPU implementation.

SVD must retain behavior for near-singular matrices; replacing it with an arbitrary
rotation approximation would fail this proposal. Fixed gradient products such as
`gradX @ eigenvectors` could avoid dense vertex-by-vertex operators, but reassociated
floating-point operations must pass parity tests. Do not change diffusion modes,
common basis, learned times, dropout evaluation state or face assembly to make an
export run. Document runtime versions and any unsupported operations.

Run inference in a worker, debounce slider requests and cache exact coordinate
tuples. Benchmark cold start, peak memory and median/95th-percentile decode time
on the Mac's Chrome and a representative mobile browser. Initial targets are
under 500 ms for a warm desktop update and under 2 s on mobile; these are proposed
usability goals, not measured performance. No interpolation is permitted to hide
slow inference. If a device cannot run the decoder, retain the four existing
panels and clearly mark joint decoding unavailable on that device.

### 3. Fallback Only After A Decision

If browser parity or performance fails, use a separately hosted, bounded inference
service with the same native PyTorch reference, not an unvalidated surrogate.
Specify hosting cost, availability and weight/data exposure before deployment.
Require HTTPS, a fixed allowlist of immutable models, request limits, queue limits,
timeouts, process/disk guards, strict input validation and no client-supplied paths.
CORS can limit browser origins but is not authentication or a resource safeguard.
Public access versus collaborator authentication is an author decision. The four
static panels must remain available when the service is offline.

## Validation Gate Before A Fifth Panel Is Published

- Freeze checkpoint, PCA and template hashes against the existing release.
- At (0,0,0,0), reproduce the existing decoded mean; along each single active PC,
  reproduce all 164 existing axis-position outputs including their signed colors.
- Generate native reference outputs for at least 100 fixed, seeded mixed-PC
  coordinates, including asymmetric combinations, all 16 four-dimensional corners
  and near-zero values. No template or seed selection based on attractive outputs.
- Proposed numerical gate: maximum coordinate error <= 2e-5 in the existing
  normalized model units, and RMS error <= 1e-6 of the decoded-mean bounding-box
  diagonal. Also inspect signed-scalar error, rotations, winding and geometry
  flags. Report actual errors; do not relax a failed limit silently.
- Check sparse-gradient replacements and SVD/assembly separately, especially
  near-singular head matrices. Numerical coordinate parity alone must not conceal
  a geometry-flag change near an intersection threshold.
- Recompute normal-displacement colors from the **joint** surface against the same
  decoded mean normals and scale. Single-axis colors and geometry counts cannot
  be reused for a mixed-PC surface.
- Run intersection and collapse checks on the reference test set, and establish
  how live outputs are checked. Until a live intersection test completes, report
  "not checked", never zero intersections. Show no inferred anatomical approval.
- Warn that joint combinations can leave observed training support. Four sliders
  at 2 SD have standardized radial distance 4; four individually bounded values
  do not guarantee a plausible combined shape. Keep this distinct from a formal
  probability or out-of-distribution test.
- Test slider/reset/animation synchronization, stale-request cancellation,
  offline/error states, camera framing, mobile layout and exact-zero recovery.

## Next Checkpoint

Prepare the local frozen-decoder adapter and reference test set first, then run a
bounded browser-export feasibility test. Return measured accuracy, operator
coverage, download size, latency and memory before choosing public deployment.
No retraining or new Stage 1 maps are required. The current presentation revision
does not claim the fifth panel is implemented.
