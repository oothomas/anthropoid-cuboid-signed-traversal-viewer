"""Rebuild shared project copy and genus annotations without changing scientific arrays."""
import argparse
import csv
import hashlib
from html import escape
import json
from pathlib import Path
import re

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


CITATION = re.compile(r'\[@([a-z0-9]+)\]')


class Citations:
    """Resolve controlled citation markers in the shared text, in reading order."""
    def __init__(self, copy, registry):
        self.references = {r['id']: r for r in registry['references']}
        assert len(self.references) == len(registry['references']), 'Duplicate reference ID'
        self.software = registry['software']
        self.numbers = {}
        paragraphs = [copy['introduction']]
        paragraphs += [p for s in copy['sections'] for p in s['paragraphs']]
        paragraphs += [s['role'] for s in self.software]
        for p in paragraphs:
            for key in CITATION.findall(p):
                if key not in self.references:
                    raise ValueError(f'Unknown citation: {key}')
                self.numbers.setdefault(key, len(self.numbers) + 1)
            if '[@' in CITATION.sub('', p):
                raise ValueError(f'Malformed citation: {p}')
        if set(self.references) != set(self.numbers):
            raise ValueError('Reference registry contains uncited entries')
        for r in [*self.references.values(), *self.software]:
            if not r['url'].startswith('https://'):
                raise ValueError('References and software must use HTTPS URLs')

    def render(self, text, html=False):
        parts, start = [], 0
        for match in CITATION.finditer(text):
            key = match[1]
            n = self.numbers[key]
            before = text[start:match.start()]
            parts.append(escape(before) if html else before)
            if html:
                title = escape(self.references[key]['title'], quote=True)
                parts.append(f'<a class="citation" href="#ref-{key}" aria-label="Reference {n}: {title}">[{n}]</a>')
            else:
                parts.append(f'[[{n}]](#ref-{key})')
            start = match.end()
        parts.append(escape(text[start:]) if html else text[start:])
        return ''.join(parts)

    def sections_html(self):
        parts = ['<section id="software" class="project-sources" aria-labelledby="software-title">',
                 '<h3 id="software-title">Source software and methodological credit</h3>',
                 '<p>These upstream projects underpin the methods and implementation. Our biological adaptations, quality controls and results are the responsibility of this study.</p>',
                 '<ul class="software-list">']
        for s in self.software:
            parts.append(f'<li><a href="{escape(s["url"])}">{escape(s["name"])}</a><p>{self.render(s["role"], html=True)}</p></li>')
        parts += ['</ul></section>', '<section id="references" class="project-sources" aria-labelledby="references-title">',
                  '<h3 id="references-title">References</h3>', '<ol class="reference-list">']
        for key in self.numbers:
            r = self.references[key]
            stop = '' if r['title'].endswith(('.', '?', '!')) else '.'
            parts.append(f'<li id="ref-{key}" tabindex="-1">{escape(r["authors"])} <a href="{escape(r["url"])}">{escape(r["title"])}</a>{stop} {escape(r["publication"])}</li>')
        parts += ['</ol></section>']
        return parts

    def sections_markdown(self):
        parts = ['## Source software and methodological credit', '',
                 'These upstream projects underpin the methods and implementation. Our biological adaptations, quality controls and results are the responsibility of this study.', '']
        for s in self.software:
            parts += [f'- [{s["name"]}]({s["url"]}): {self.render(s["role"])}']
        parts += ['', '## References', '']
        for key, n in self.numbers.items():
            r = self.references[key]
            stop = '' if r['title'].endswith(('.', '?', '!')) else '.'
            parts.append(f'{n}. <a id="ref-{key}"></a>{r["authors"]} [{r["title"]}]({r["url"]}){stop} {r["publication"]}')
        return parts + ['']


def overview_html(copy, citations):
    parts = [START, '<section id="project" class="project-overview" aria-labelledby="project-title">',
             '<div class="project-inner">', f'<p class="publication-status">{escape(copy["status"])}</p>',
             f'<h2 id="project-title">{escape(copy["title"])}</h2>',
             f'<p class="project-introduction">{citations.render(copy["introduction"], html=True)}</p>',
             '<nav class="project-links" aria-label="Study sources"><a href="#software">Source software</a><a href="#references">References</a></nav>']
    for section in copy["sections"]:
        parts.append(f'<section class="project-section"><h3>{escape(section["heading"])}</h3>')
        parts.extend(f'<p>{citations.render(p, html=True)}</p>' for p in section["paragraphs"])
        parts.append('</section>')
    parts += citations.sections_html()
    parts += ['<p class="project-source"><a href="https://github.com/oothomas/anthropoid-cuboid-signed-traversal-viewer">Project repository</a> | <a href="../traversals/provenance.json">Dataset provenance</a> | <a href="#project">Back to study introduction</a></p>',
              '</div></section>', END]
    return "\n".join(parts)


def readme(copy, site, citations):
    preview = read(ROOT / 'assets/readme/hominoid-traversals-provenance.json')
    assert sha(ROOT / preview['image']) == preview['sha256'], 'README screenshot changed'
    mapping = read(ROOT / 'assets/readme/mandible-correspondence-provenance.json')
    assert sha(ROOT / mapping['image']) == mapping['sha256'], 'Approved mapping screenshot changed'
    parts = [f'# {copy["title"]}', '', f'**{copy["status"]}**', '', citations.render(copy["introduction"]), '',
             '[Explore the results](https://oothomas.github.io/anthropoid-cuboid-signed-traversal-viewer/) | [Source software](#source-software-and-methodological-credit) | [References](#references)', '',
             f'[![{preview["alt"]}]({preview["image"]})]({preview["viewer_url"]})', '',
             (ROOT / preview['caption']).read_text().strip(), '']
    for section in copy["sections"]:
        parts += [f'## {section["heading"]}', '']
        for index, p in enumerate(section["paragraphs"]):
            parts += [citations.render(p), '']
            if section['heading'] == 'A two-stage approach' and index == 0:
                parts += [f'![{mapping["alt"]}]({mapping["image"]})', '',
                          (ROOT / mapping['caption']).read_text().strip(), '']
    parts += citations.sections_markdown()
    parts += ['## Models in this release', '',
              '| Dataset | Epoch | Common dimension | Training PCA | Projected tuning | Initial learning rate |',
              '| --- | ---: | ---: | ---: | ---: | ---: |']
    for d in DATASETS:
        r = read(site / d / 'traversals/provenance.json')
        parts.append(f'| [{NAMES[d]}](https://oothomas.github.io/anthropoid-cuboid-signed-traversal-viewer/{d}/viewer/) | {r["epoch"]} | {r["common_dimension"]} | {r["pca_fit_n"]} | {r["tuning_n"]} | {r["learning_rate"]} |')
    parts += ['', 'All four displays use seed 2071, not a selected best seed. Counts are specimens represented in the PCA plots, not total dataset sizes. The hominoid dataset is a subset of the anthropoid collection, not independent evidence.', '',
              'PCA is fitted to training codes, with tuning specimens projected where available. Confirmation specimens and reference templates are excluded. The mouse models use all non-template specimens for descriptive training, not held-out generalization tests. Shared correspondence construction also limits claims of fully unseen-specimen performance.', '',
              '## Reading the decoded surfaces', '',
              'Each panel varies one PC over 41 actual decoder outputs from -2 to +2 training-score standard deviations, holding other components at the training-code mean. Axes are specific to each model and are not aligned across datasets or seeds.', '',
              'Blue denotes inward and orange/red outward displacement along the decoded mean surface normals, as a percentage of the mean bounding-box diagonal; white is zero. This is not reconstruction error, closest-surface distance or unmapped coverage. Tangential movement is not encoded. Dataset captions and geometry tables report local surface-quality flags; decoded anatomy remains subject to review.', '',
              '## Genus annotations', '', TAX_NOTE, '',
              'Display annotations are joined by exact specimen identifier. No scores are moved, PCA is not refitted, and no confirmation observations are added. The source hash and minimal public assignments are in `content/taxonomy.json`.', '',
              'Public project copy is a review-grade draft. The manuscript is in preparation; no publication, peer-review outcome or completed biological validation is implied.', '']
    return '\n'.join(parts)


def refresh(site, ledger=None):
    copy = read(ROOT / 'content/project.json')
    citations = Citations(copy, read(ROOT / 'content/references.json'))
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
    block = overview_html(copy, citations)
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
        text = text.replace('traversals.css?v=presentation-20261014', 'traversals.css?v=references-20261014')
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
                                'references_sha256': sha(ROOT / 'content/references.json'),
                                'scientific_arrays_changed': False}
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
                      'Browser QA is recorded separately.\n')
    (ROOT / 'README.md').write_text(readme(copy, site, citations))
    release = read(site / 'release.json')
    release['presentation_revision'] = 'method-citations-and-software-credit-2026-10-14'
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
