"""Build an allowlisted GitHub Pages package from the verified local review."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
from html.parser import HTMLParser
from refresh_presentation import limitations_text

DATASETS = ('cuboid', 'hominoids', 'mandible', 'humeri')
VIEWER_FILES = ('index.html', 'traversals.css', 'traversals.js',
                'vendor/three.module.min.js', 'vendor/controls/TrackballControls.js',
                'vendor/lucide.min.js', 'vendor/lucide.LICENSE')


def read(path):
    return json.loads(path.read_text())


def sha(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, allow_nan=False) + '\n')


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        assert 'download' not in attrs, 'Unexpected download control'
        self.urls += [attrs[key] for key in ('href', 'src') if key in attrs]


def package(source, output):
    assert not output.exists(), 'Use a fresh output directory; do not overwrite a release.'
    verified = read(source / 'qa/package_verification.json')
    assert verified['status'] == 'passed' and not verified['confirmation_evaluated']
    source_manifest = read(source / 'MANIFEST.json')

    def check(path):
        assert sha(path) == source_manifest[str(path.relative_to(source))]

    def copy(path, target):
        check(path)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, target)

    release = dict(release='current-models-2026-10-14', state='review-grade-draft',
                   score_download=False, browser_data_public=True, datasets={})
    for key in DATASETS:
        inp, dest = source / key, output / key
        receipt_path = source / 'exports' / key / 'receipt.json'
        check(receipt_path)
        receipt = read(receipt_path)
        assert receipt['status'] == 'complete' and receipt['seed'] == 2071
        assert receipt['weights_unchanged'] and not receipt['confirmation_evaluated']
        assert receipt['replay_max_coordinate_error'] <= 2e-5
        for name in VIEWER_FILES:
            copy(inp / 'viewer' / name, dest / 'viewer' / name)
        html_path = dest / 'viewer/index.html'
        html = html_path.read_text()
        link = '<a href="../traversals/scores.csv" download>Score data</a>'
        assert html.count(link) == 1
        html = html.replace(link, '')
        html = html.replace('<a href="../traversals/QA.txt">Quality checks</a>',
                            '<a href="../traversals/limitations.txt">Interpretation and limitations</a>')
        html_path.write_text(html)
        metadata_path = inp / 'traversals/data.json'
        check(metadata_path)
        metadata = read(metadata_path)
        # Publish only the values needed by the displayed PC plots.
        metadata['scores'] = [{name: value for name, value in row.items()
                               if name in ('mesh_id', 'partition') or name.endswith('_SD')}
                              for row in metadata['scores']]
        save(dest / 'traversals/data.json', metadata)
        model = metadata['models']['current']
        for field in ('vertices', 'signed', 'faces'):
            item = model[field]
            path = (inp / 'viewer' / item['path']).resolve()
            assert path.is_relative_to(inp / 'traversals/data')
            assert sha(path) == item['sha256'] and path.stat().st_size == item['bytes']
            copy(path, dest / 'traversals/data' / path.name)
        for name in ('caption.txt', 'geometry.csv', 'summary.json'):
            copy(inp / 'traversals' / name, dest / 'traversals' / name)
        summary = read(dest / 'traversals/summary.json')
        public = {name: receipt[name] for name in (
            'seed', 'epoch', 'learning_rate', 'common_dimension', 'template',
            'pca_fit_n', 'tuning_n', 'pca_solver', 'checkpoint_sha256',
            'decoded_sha256', 'replay_max_coordinate_error', 'weights_unchanged',
            'confirmation_evaluated', 'training', 'encoder_forward')}
        public.update(release=release['release'], state='review-grade-draft',
                      geometry=summary, scientific_adoption=False,
                      pca_axes_aligned_across_models=False,
                      source_exporter_sha256=receipt['exporter_sha256'],
                      source_receipt_sha256=sha(receipt_path),
                      package_builder='scripts/package_current_traversals.py',
                      package_builder_sha256=sha(Path(__file__)),
                      signed_definition='100 * dot(decoded - decoded mean, outward area-weighted mean normal) / mean bounding-box diagonal',
                      score_download=False,
                      privacy_note='Plot values are public browser assets; removing a download link is not access control.')
        save(dest / 'traversals/provenance.json', public)
        (dest / 'traversals/limitations.txt').write_text(limitations_text(summary))
        release['datasets'][key] = dict(epoch=receipt['epoch'], seed=2071,
                                        geometry=summary, viewer=key + '/viewer/')
    (output / '.nojekyll').write_text('')
    (output / 'index.html').write_text('''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="0;url=cuboid/viewer/"><title>Current model traversals</title></head>
<body><p><a href="cuboid/viewer/">Open current model traversals</a></p></body></html>
''')
    for path in output.rglob('*'):
        if path.is_file() and path.suffix in ('.json', '.html', '.txt', '.css'):
            text = path.read_text()
            assert not any(value in text for value in ('/Users/', '/home/ootho/', '/Volumes/', 'scores.csv', 'localhost:', '127.0.0.1:'))
        if path.suffix == '.html':
            parser = Links()
            parser.feed(path.read_text())
            for url in parser.urls:
                if url.startswith('#'):
                    continue
                assert not url.startswith(('/', 'http:', 'https:')), url
                linked = (path.parent / url.split('#')[0]).resolve()
                assert linked.is_relative_to(output) and linked.exists(), url
    release['files'] = {str(p.relative_to(output)): dict(sha256=sha(p), bytes=p.stat().st_size)
                        for p in sorted(output.rglob('*')) if p.is_file()}
    save(output / 'release.json', release)
    print(json.dumps(dict(status='packaged', datasets=list(release['datasets']),
                          files=len(release['files']),
                          bytes=sum(item['bytes'] for item in release['files'].values())), indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1] / 'site')
    args = parser.parse_args()
    package(args.source.resolve(), args.output.resolve())
