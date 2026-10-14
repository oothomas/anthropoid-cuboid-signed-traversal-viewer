"""Scientific-boundary and presentation checks against the prior published release."""
import hashlib
import copy
import csv
from html.parser import HTMLParser
import json
from pathlib import Path
import subprocess
import struct
import unittest
import refresh_presentation as presentation

ROOT = Path(__file__).resolve().parents[1]
BASE = '2d82a7a186894692ec275227dd96daadf49b1209'
DATASETS = ('cuboid', 'hominoids', 'mandible', 'humeri')


def read(path):
    return json.loads(path.read_text())


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.downloads = []
        self.ids = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        if 'download' in attrs:
            self.downloads.append(attrs)
        self.links += [attrs[k] for k in ('href', 'src') if k in attrs]


class PresentationTests(unittest.TestCase):
    def test_readme_screenshot(self):
        preview = read(ROOT / 'assets/readme/hominoid-traversals-provenance.json')
        png = (ROOT / preview['image']).read_bytes()
        self.assertEqual(hashlib.sha256(png).hexdigest(), preview['sha256'])
        self.assertEqual(png[:8], b'\x89PNG\r\n\x1a\n')
        self.assertEqual(struct.unpack('>II', png[16:24]), (preview['width'], preview['height']))
        provenance = read(ROOT / preview['dataset_provenance'])
        for key in ('seed', 'epoch', 'pca_fit_n'):
            self.assertEqual(preview[key], provenance[key])
        with (ROOT / preview['geometry_source']).open(newline='') as stream:
            rows = [r for r in csv.DictReader(stream) if int(r['step']) == preview['step_zero_based']]
        self.assertEqual([int(r['interior_pairs']) for r in rows], preview['intersection_pairs_pc1_to_pc4'])
        self.assertTrue(all(abs(float(r['sd']) - preview['sd']) < 1e-10 for r in rows))
        markdown = (ROOT / 'README.md').read_text()
        self.assertIn(f'[![{preview["alt"]}]({preview["image"]})]({preview["viewer_url"]})', markdown)
        self.assertIn((ROOT / preview['caption']).read_text().strip(), markdown)

    def test_preserved_scientific_data(self):
        for d in DATASETS:
            name = f'site/{d}/traversals/data.json'
            old = json.loads(subprocess.check_output(['git', 'show', f'{BASE}:{name}'], cwd=ROOT))
            new = read(ROOT / name)
            stripped = {k: v for k, v in new.items() if k not in ('taxonomy', 'genus_colors')}
            stripped['scores'] = [{k: v for k, v in r.items() if k not in ('genus', 'taxon_label', 'assignment_basis')} for r in new['scores']]
            self.assertEqual(stripped, old)
            for kind in ('vertices', 'signed', 'faces'):
                record = new['models']['current'][kind]
                source = ROOT / 'site' / d / 'viewer' / record['path']
                self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(), record['sha256'])

    def test_taxonomy(self):
        taxa = read(ROOT / 'content/taxonomy.json')['assignments']
        self.assertEqual(len(taxa), 296)
        self.assertEqual(taxa['Fossil_KB3133_CUB']['genus'], 'Unassigned')
        self.assertEqual(taxa['Hylobates_concolor_gabriellae_87252_CUB']['genus'], 'Nomascus')
        self.assertEqual(taxa['Fossil_Homo_habilis_OH8_CUB']['genus'], 'Homo')
        self.assertEqual(taxa['Fossil_Theropithecus_KNM_TH_46700_CUB']['genus'], 'Theropithecus')
        self.assertEqual([k for k, r in taxa.items() if r['genus'] == 'Unassigned'], ['Fossil_KB3133_CUB'])
        color_maps = []
        for d in ('cuboid', 'hominoids'):
            data = read(ROOT / 'site' / d / 'traversals/data.json')
            color_maps.append(data['genus_colors'])
            for row in data['scores']:
                for key, value in taxa[row['mesh_id']].items():
                    self.assertEqual(row[key], value)
                self.assertIn(row['genus'], data['genus_colors'])
        self.assertEqual(*color_maps)

    def test_shared_text_and_links(self):
        copy = read(ROOT / 'content/project.json')
        citations = presentation.Citations(copy, read(ROOT / 'content/references.json'))
        shared = []
        for d in DATASETS:
            path = ROOT / 'site' / d / 'viewer/index.html'
            text = path.read_text()
            shared.append(text.split('<!-- PROJECT OVERVIEW START -->')[1].split('<!-- PROJECT OVERVIEW END -->')[0])
            parsed = Page(); parsed.feed(text)
            self.assertFalse(parsed.downloads)
            self.assertEqual(len(parsed.ids), len(set(parsed.ids)))
            for link in parsed.links:
                if link.startswith('#'):
                    self.assertIn(link[1:], parsed.ids, link)
                    continue
                if link.startswith('https://'):
                    continue
                self.assertTrue((path.parent / link.split('#')[0].split('?')[0]).exists(), link)
            for section in copy['sections']:
                for p in section['paragraphs']:
                    self.assertIn(citations.render(p), (ROOT / 'README.md').read_text())
        self.assertTrue(all(s == shared[0] for s in shared))

    def test_reference_order_and_credits(self):
        project = read(ROOT / 'content/project.json')
        registry = read(ROOT / 'content/references.json')
        citations = presentation.Citations(project, registry)
        self.assertEqual(list(citations.numbers.values()), list(range(1, 14)))
        self.assertEqual(list(citations.numbers)[0], 'bojsen1979')
        self.assertEqual(list(citations.numbers)[-1], 'magnetpyfm')
        markdown = (ROOT / 'README.md').read_text()
        self.assertNotIn('[@', markdown)
        for key, number in citations.numbers.items():
            self.assertIn(f'[[{number}]](#ref-{key})', markdown)
            self.assertIn(f'{number}. <a id="ref-{key}"></a>', markdown)
        for dataset in DATASETS:
            page = (ROOT / 'site' / dataset / 'viewer/index.html').read_text()
            self.assertNotIn('[@', page)
            parsed = Page(); parsed.feed(page)
            self.assertEqual([i for i in parsed.ids if i.startswith('ref-')],
                             [f'ref-{k}' for k in citations.numbers])
            for r in registry['references'] + registry['software']:
                self.assertIn(r['url'], parsed.links)
                self.assertIn(r['url'], markdown)
        # Published work supports borrowed methods, not the new results themselves.
        results = next(s for s in project['sections'] if s['heading'] == 'Study scope and initial results')
        self.assertTrue(all('[@' not in p for p in results['paragraphs']))

    def test_reference_validation_and_escaping(self):
        project = read(ROOT / 'content/project.json')
        registry = read(ROOT / 'content/references.json')
        citations = presentation.Citations(project, registry)
        self.assertIn('&lt;script&gt;', citations.render('<script> [@panine2022]', html=True))
        for invalid in ('[@missing]', '[@BAD]'):
            bad = copy.deepcopy(project); bad['introduction'] += invalid
            with self.assertRaises(ValueError):
                presentation.Citations(bad, registry)
        bad = copy.deepcopy(registry)
        bad['references'].append({'id': 'unused', 'url': 'https://example.com'})
        with self.assertRaises(ValueError):
            presentation.Citations(project, bad)
        bad = copy.deepcopy(registry); bad['software'][0]['url'] = 'javascript:alert(1)'
        with self.assertRaises(ValueError):
            presentation.Citations(project, bad)

    def test_claim_numbers(self):
        expected_variance = [43.2, 57.8, 67.2, 66.2]
        expected_flags = [18, 46, 0, 0]
        for d, variance, flags in zip(DATASETS, expected_variance, expected_flags):
            root = ROOT / 'site' / d / 'traversals'
            data = read(root / 'data.json')
            summary = read(root / 'summary.json')
            self.assertEqual(round(100 * sum(data['models']['current']['variance_ratio']), 1), variance)
            self.assertEqual(summary['flagged_positions'], flags)
            self.assertEqual(summary['decoded_positions'], 164)
            self.assertEqual(summary['near_zero_faces'], 0)
            self.assertEqual(summary['degenerate_faces'], 0)

    def test_release_and_public_boundary(self):
        root = ROOT / 'site'
        release = read(root / 'release.json')
        paths = {str(p.relative_to(root)) for p in root.rglob('*') if p.is_file() and p.name != 'release.json'}
        self.assertEqual(paths, set(release['files']))
        for relative, record in release['files'].items():
            path = root / relative
            self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), record['sha256'])
            self.assertEqual(path.stat().st_size, record['bytes'])
            self.assertNotIn('scores.csv', relative)
            if path.suffix in ('.html', '.json', '.txt', '.js', '.css'):
                text = path.read_text()
                for forbidden in ('/Users/', '/home/ootho/', '/Volumes/', 'github_pat_', 'ghp_'):
                    self.assertNotIn(forbidden, text)

    def test_generator_idempotence(self):
        paths = [ROOT / 'README.md', ROOT / 'site/release.json']
        before = [p.read_bytes() for p in paths]
        subprocess.run(['python3', str(ROOT / 'scripts/refresh_presentation.py')], check=True, capture_output=True)
        self.assertEqual([p.read_bytes() for p in paths], before)


if __name__ == '__main__':
    unittest.main()
