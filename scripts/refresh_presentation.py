"""Rebuild shared project copy and genus annotations without changing scientific arrays."""
import argparse
import csv
import hashlib
from html import escape
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATASETS = ("cuboid", "hominoids", "mandible", "humeri")
NAMES = {
    "cuboid": "Anthropoid cuboids", "hominoids": "Non-fossil hominoid cuboids",
    "mandible": "Mouse mandibles", "humeri": "Mouse humeri",
}
START, END = "<!-- PROJECT OVERVIEW START -->", "<!-- PROJECT OVERVIEW END -->"
TAX_START, TAX_END = "<!-- TAXONOMY CAPTION START -->", "<!-- TAXONOMY CAPTION END -->"
TAX_NOTE = (
    "Point colors identify genus from the reconciled project sampling labels; "
    "the same genus has the same color in both cuboid datasets. Circles are training "
    "specimens and triangles are projected tuning specimens. Counts in the genus "
    "legend include both partitions. Historical project taxonomic names are retained; "
    "this is not a taxonomic revision. KB3133 has no assigned genus and remains Unassigned."
)
GENUS_COLORS = (
    '#0072b2', '#d55e00', '#009e73', '#8c45a0', '#b57a00', '#236b42',
    '#cc4678', '#4d60ac', '#9b4b19', '#00838f', '#7c6d00', '#bc3036',
    '#487fbd', '#956eab', '#48673c', '#a05050', '#008573', '#895796',
    '#665234', '#4169a1', '#bb6514', '#467f67', '#ae3b68', '#5362ab',
    '#8d8124', '#a94320', '#28647b', '#a06b85', '#6c654e', '#67488d',
)
RETAINED_FOSSIL_LABELS = {
    'Fossil_Homo_habilis_OH8_CUB': 'Homo habilis OH8',
    'Fossil_Theropithecus_KNM_TH_46700_CUB': 'Theropithecus KNM TH 46700',
}


def read(path):
    return json.loads(path.read_text())


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, allow_nan=False) + "\n")


def replace_block(text, start, end, block, before=None):
    if start in text:
        assert text.count(start) == text.count(end) == 1
        a, b = text.index(start), text.index(end) + len(end)
        return text[:a] + block + text[b:]
    assert before is not None and text.count(before) == 1
    return text.replace(before, block + "\n" + before, 1)


def taxonomy_from_ledger(path, site):
    with path.open(newline="") as stream:
        rows = list(csv.DictReader(stream))
    indexed = {row["specimen_record"]: row for row in rows}
    assert len(indexed) == len(rows), "Duplicate ledger identifiers"
    recognized = {row['sampling_label'].split()[0] for row in rows
                  if row['taxon_basis'] == 'Assigned comparative taxon'}
    ids = {row["mesh_id"] for d in ("cuboid", "hominoids")
           for row in read(site / d / "traversals/data.json")["scores"]}
    assignments = {}
    for mesh_id in sorted(ids):
        row = indexed[mesh_id]
        # A missing comparative tree assignment is not the same as an unnamed genus.
        # Retain named fossil genera from ledger labels without assigning a tree tip.
        label_genus = row['sampling_label'].split()[0]
        genus = label_genus if label_genus in recognized else 'Unassigned'
        if mesh_id in RETAINED_FOSSIL_LABELS:
            assert row['sampling_label'] == RETAINED_FOSSIL_LABELS[mesh_id]
            genus = label_genus
        assert genus.isalpha(), (mesh_id, genus)
        assignments[mesh_id] = {"genus": genus, "taxon_label": row["sampling_label"],
                                "assignment_basis": row["taxon_basis"]}
    return {"source": path.name, "source_sha256": sha(path),
            "join": "Exact specimen_record to mesh_id; named genus from sampling_label, with original assignment_basis retained; unnamed labels remain Unassigned",
            "taxonomy_revised": False, "assignments": assignments}


def overview_html(copy):
    parts = [START, '<section id="project" class="project-overview" aria-labelledby="project-title">',
             '<div class="project-inner">', f'<p class="publication-status">{escape(copy["status"])}</p>',
             f'<h2 id="project-title">{escape(copy["title"])}</h2>',
             f'<p class="project-introduction">{escape(copy["introduction"])}</p>']
    for section in copy["sections"]:
        parts.append(f'<section class="project-section"><h3>{escape(section["heading"])}</h3>')
        parts.extend(f'<p>{escape(p)}</p>' for p in section["paragraphs"])
        parts.append('</section>')
    parts += ['<p class="project-source"><a href="https://github.com/oothomas/anthropoid-cuboid-signed-traversal-viewer">Project repository</a> | <a href="../traversals/provenance.json">Dataset provenance</a></p>',
              '</div></section>', END]
    return "\n".join(parts)


def readme(copy, site):
    parts = [f'# {copy["title"]}', '', f'**{copy["status"]}**', '', copy["introduction"], '',
             '[Explore the results](https://oothomas.github.io/anthropoid-cuboid-signed-traversal-viewer/).', '']
    for section in copy["sections"]:
        parts += [f'## {section["heading"]}', '']
        for p in section["paragraphs"]:
            parts += [p, '']
    parts += ['## Models in this release', '',
              '| Dataset | Epoch | Common dimension | Training PCA | Projected tuning | Initial learning rate |',
              '| --- | ---: | ---: | ---: | ---: | ---: |']
    for d in DATASETS:
        r = read(site / d / 'traversals/provenance.json')
        parts.append(f'| [{NAMES[d]}](https://oothomas.github.io/anthropoid-cuboid-signed-traversal-viewer/{d}/viewer/) | {r["epoch"]} | {r["common_dimension"]} | {r["pca_fit_n"]} | {r["tuning_n"]} | {r["learning_rate"]} |')
    parts += ['', 'All four displays use seed 2071. Counts are specimens represented in the PCA plots, not total dataset sizes. The hominoid dataset is a subset of the anthropoid collection, not independent evidence.', '',
              '## Genus annotations', '', TAX_NOTE, '',
              'Display annotations are joined by exact specimen identifier. No scores are moved, PCA is not refitted, and no confirmation observations are added. The source hash and minimal public assignments are in `content/taxonomy.json`.', '',
              '## Joint-PC decoding', '',
              'The requested fifth panel will decode a single code with all four PC coordinates varied together. It is not yet implemented. An additive mesh approximation was explicitly declined. See [the exact-decoding implementation plan](EXACT_JOINT_DECODING.md). The four existing panels remain genuine single-axis decoder outputs.', '',
              '## Local review', '', '```bash', 'python3 run_server.py', '```', '',
              'This serves `site/` on an available localhost port. Use HTTP rather than `file://`; binary assets are fetched and checksum-verified.', '',
              '## Reproducibility and publishing', '',
              'GitHub Actions publishes only `site/`. The historical root viewer and assets are preserved in the repository but are not deployed. Each dataset includes an editable geometry table, caption, quality note and sanitized provenance. `site/release.json` hashes every deployed asset.', '',
              'No checkpoints, raw latent codes, private filesystem paths, run logs, score CSVs or score-download controls are deployed. On-screen score values and identifiers remain public browser assets; removing downloads does not create access control.', '',
              'The shared scientific introduction is maintained in `content/project.json` and rendered into this README and all four traversal pages. After a presentation edit, run `python3 scripts/refresh_presentation.py`. `scripts/package_current_traversals.py` creates the initial allowlisted scientific package from a verified local export; presentation refresh is a separate step. Read `PRESENTATION_BRIEF.md` and `DESIGN_AND_PROVENANCE.md` for the communication and scientific boundaries.', '',
              'Public project copy is a review-grade draft. The manuscript is in preparation; no publication, peer-review outcome or completed biological validation is implied.', '']
    return '\n'.join(parts)


def refresh(site, ledger=None):
    copy = read(ROOT / 'content/project.json')
    ui = {name: (ROOT / 'site/cuboid/viewer' / name).read_text()
          for name in ('traversals.js', 'traversals.css')}
    taxonomy_path = ROOT / 'content/taxonomy.json'
    if ledger:
        save(taxonomy_path, taxonomy_from_ledger(ledger, site))
    taxonomy = read(taxonomy_path)
    assigned_genera = sorted({r['genus'] for r in taxonomy['assignments'].values()} - {'Unassigned'})
    assert len(assigned_genera) <= len(GENUS_COLORS)
    colors = dict(zip(assigned_genera, GENUS_COLORS))
    colors['Unassigned'] = '#687278'
    block = overview_html(copy)
    for dataset in DATASETS:
        for name, source in ui.items():
            (site / dataset / 'viewer' / name).write_text(source)
        folder = site / dataset / 'traversals'
        data_path = folder / 'data.json'
        metadata = read(data_path)
        if dataset in ('cuboid', 'hominoids'):
            for row in metadata['scores']:
                row.update(taxonomy['assignments'][row['mesh_id']])
            metadata['taxonomy'] = {k: v for k, v in taxonomy.items() if k != 'assignments'}
            metadata['genus_colors'] = colors
            save(data_path, metadata)
        page = site / dataset / 'viewer/index.html'
        text = page.read_text()
        text = replace_block(text, START, END, block, '<footer>')
        if 'class="project-masthead"' not in text:
            text = text.replace('<header>', '<div class="project-masthead"><span>Biological shape morphospaces</span><span>Manuscript in preparation</span></div>\n  <header>', 1)
            text = text.replace('<a href="#scores">PCA scores</a>', '<a href="#scores">PCA scores</a><a href="#project">About the study</a>')
        text = text.replace(' | Provisional review', ' | Preliminary results')
        text = text.replace('href="traversals.css"', 'href="traversals.css?v=presentation-20261014"')
        text = text.replace('src="traversals.js"', 'src="traversals.js?v=presentation-20261014"')
        if dataset in ('cuboid', 'hominoids') and 'id="genus-select"' not in text:
            controls = ('<div class="genus-toolbar"><label for="genus-select">Emphasize genus'
                        '<select id="genus-select"><option value="">All genera</option></select></label>'
                        '<output id="genus-summary" aria-live="polite"></output></div>'
                        '<ul id="genus-legend" class="genus-legend" aria-label="Genus colors and plotted specimen counts"></ul>\n    ')
            text = text.replace('<div class="plots">', controls + '<div class="plots">', 1)
            text = text.replace('class="scores"', 'class="scores genus-scores"', 1)
            text = text.replace('<p class="score-note">', '<p class="taxonomy-note">' + escape(TAX_NOTE) + '</p>\n    <p class="score-note">', 1)
        text = text.replace('<footer>\n    <p>', '<footer>\n    <h2>Dataset notes and provenance</h2>\n    <p>', 1)
        page.write_text(text)
        prov_path = folder / 'provenance.json'
        prov = read(prov_path)
        prov['presentation'] = {'generator': 'scripts/refresh_presentation.py',
                                'generator_sha256': sha(Path(__file__)),
                                'shared_copy_sha256': sha(ROOT / 'content/project.json'),
                                'scientific_arrays_changed': False,
                                'joint_decoder_implemented': False}
        if dataset in ('cuboid', 'hominoids'):
            prov['presentation']['taxonomy'] = metadata['taxonomy']
            caption = folder / 'caption.txt'
            existing = caption.read_text()
            if TAX_START in existing:
                existing = existing[:existing.index(TAX_START)].rstrip() + '\n'
            caption.write_text(existing.rstrip() + '\n\n' + TAX_START + '\n' + TAX_NOTE + '\n' + TAX_END + '\n')
        save(prov_path, prov)
        qa = folder / 'QA.txt'
        previous = qa.read_text().split('\nPresentation update:')[0]
        qa.write_text(previous.rstrip() + '\n\nPresentation update: shared project copy and genus annotations only. '
                      'Scientific meshes, displacement fields, score coordinates and PCA fits are unchanged. '
                      'Genus joins use exact published specimen identifiers; unassigned taxonomy remains explicit. '
                      'Browser QA is recorded separately. Joint decoding remains a technical proposal, not a displayed approximation.\n')
    (ROOT / 'README.md').write_text(readme(copy, site))
    release = read(site / 'release.json')
    release['presentation_revision'] = 'project-context-and-genus-2026-10-14'
    release['files'] = {str(p.relative_to(site)): {'sha256': sha(p), 'bytes': p.stat().st_size}
                        for p in sorted(site.rglob('*')) if p.is_file() and p != site / 'release.json'}
    save(site / 'release.json', release)
    print(json.dumps({'status': 'refreshed', 'datasets': list(DATASETS),
                      'public_taxonomy_records': len(taxonomy['assignments'])}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--site', type=Path, default=ROOT / 'site')
    parser.add_argument('--ledger', type=Path)
    args = parser.parse_args()
    refresh(args.site.resolve(), args.ledger)
