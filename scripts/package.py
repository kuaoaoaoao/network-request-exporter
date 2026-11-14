"""Build local-install and Chrome Web Store ZIPs, plus a clean open-source bundle."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED, ZipInfo
import json
ROOT = Path(__file__).resolve().parent.parent
manifest = json.loads((ROOT / 'extension/manifest.json').read_text())
version = manifest['version']
output = ROOT / 'dist'
output.mkdir(exist_ok=True)

def archive(path, files):
    with ZipFile(path, 'w', compression=ZIP_DEFLATED) as z:
        for source, target in sorted(files, key=lambda item: str(item[1])):
            info = ZipInfo(str(target), date_time=(2026, 11, 14, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            z.writestr(info, source.read_bytes())
    with ZipFile(path) as z:
        assert z.testzip() is None
    print(path)

extension = [(p, p.relative_to(ROOT / 'extension')) for p in (ROOT / 'extension').rglob('*') if p.is_file() and not p.name.startswith('.')]
# Store ZIP: manifest MUST be at archive root. Documentation/assets stay outside.
store_zip = output / f'network-request-exporter-{version}-store.zip'
archive(store_zip, extension)
with ZipFile(store_zip) as z:
    assert json.loads(z.read('manifest.json'))['version'] == version
    assert 'icons/icon128.png' in z.namelist()

local = [(p, Path('network-request-exporter') / name) for p, name in extension]
for name in ['README.md', 'README.en.md', 'LICENSE', 'PRIVACY.md', 'VALIDATION.md', 'CONTRIBUTING.md', 'SECURITY.md', 'CHANGELOG.md']:
    local.append((ROOT / name, Path('network-request-exporter') / name))
for p in (ROOT / 'docs').rglob('*'):
    if p.is_file() and (not p.name.startswith('.') or p.name=='.nojekyll'):
        local.append((p, Path('network-request-exporter/docs') / p.relative_to(ROOT / 'docs')))
for p in (ROOT / 'store').rglob('*'):
    if p.is_file() and p.suffix in ['.md','.txt']:
        local.append((p, Path('network-request-exporter/store') / p.relative_to(ROOT / 'store')))
archive(output / f'network-request-exporter-{version}.zip', local)

# Source bundle intentionally excludes private execution notes, generated old ZIPs,
# browser profiles, test screenshots containing local paths, caches and OS files.
files = []
for folder in ['extension', 'docs', 'store', 'scripts', 'tests', '.github']:
    for p in (ROOT / folder).rglob('*'):
        if p.is_file() and not any(part.startswith('.') and part not in ['.github','.nojekyll'] for part in p.relative_to(ROOT).parts) and '__pycache__' not in p.parts and p.suffix not in ['.pyc']:
            if folder == 'tests' and p.suffix == '.png':
                continue
            files.append((p, Path('network-request-exporter') / p.relative_to(ROOT)))
for name in ['README.md', 'README.en.md', 'LICENSE', 'PRIVACY.md', 'VALIDATION.md', 'CONTRIBUTING.md', 'SECURITY.md', 'CHANGELOG.md', 'package.json', '.gitignore']:
    files.append((ROOT / name, Path('network-request-exporter') / name))
archive(output / f'network-request-exporter-{version}-source.zip', files)
