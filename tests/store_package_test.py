"""Release contracts: archive shape, complete icons/assets, links, no private notes."""
from pathlib import Path
from zipfile import ZipFile
import json
import re
import struct
import unittest
ROOT=Path(__file__).resolve().parent.parent
VERSION=json.loads((ROOT/'extension/manifest.json').read_text())['version']
def size(data):
    assert data[:8]==b'\x89PNG\r\n\x1a\n'
    return struct.unpack('>II',data[16:24])

class PublishingTests(unittest.TestCase):
    def test_store_runtime_only_and_root_manifest(self):
        with ZipFile(ROOT/'dist'/f'network-request-exporter-{VERSION}-store.zip') as z:
            self.assertIsNone(z.testzip())
            manifest=json.loads(z.read('manifest.json'))
            self.assertEqual(manifest['version'],VERSION)
            self.assertEqual(manifest['permissions'],['clipboardWrite'])
            self.assertEqual(len(manifest['icons']),4)
            for n,path in manifest['icons'].items():self.assertEqual(size(z.read(path)),(int(n),int(n)))
            for p in (ROOT/'extension').rglob('*'):
                if p.is_file():self.assertEqual(z.read(str(p.relative_to(ROOT/'extension'))),p.read_bytes())
            self.assertFalse(any(name.startswith(('docs/','tests/','store/','network-request-exporter/')) for name in z.namelist()))
    def test_source_is_clean_and_complete(self):
        with ZipFile(ROOT/'dist'/f'network-request-exporter-{VERSION}-source.zip') as z:
            names=z.namelist()
            for required in ['README.md','README.en.md','LICENSE','PRIVACY.md','extension/manifest.json','.github/workflows/ci.yml','docs/.nojekyll','docs/privacy/index.html','scripts/package.py']:
                self.assertIn('network-request-exporter/'+required,names)
            self.assertFalse(any('/dist/' in n or '.DS_Store' in n or n.endswith('PROGRESS.md') or '/__pycache__/' in n for n in names))
            for n in names:self.assertFalse(n.startswith('/') or '..' in Path(n).parts)
    def test_markdown_local_links(self):
        for file in [*ROOT.glob('*.md'),*ROOT.glob('docs/*.md'),*ROOT.glob('store/*.md')]:
            if file.name=='PROGRESS.md':continue
            for target in re.findall(r'\]\(([^)]+)\)',file.read_text()):
                if target.startswith(('http:','https:','#','mailto:')):continue
                self.assertTrue((file.parent/target.split('#')[0]).exists(),str(file)+': '+target)
    def test_images_and_policy(self):
        for name in ['overview','selection','redaction']:
            self.assertEqual(size((ROOT/f'docs/images/screenshot-{name}.png').read_bytes()),(1280,800))
        self.assertEqual(size((ROOT/'store/promo-440x280.png').read_bytes()),(440,280))
        self.assertEqual(size((ROOT/'docs/images/banner.png').read_bytes()),(1280,480))
        policy=(ROOT/'docs/privacy/index.html').read_text()
        for term in ['clipboardWrite','2026-11-14','Limited Use','Privacy Policy']:
            self.assertIn(term,policy)
        self.assertEqual(json.loads((ROOT/'package.json').read_text())['version'],VERSION)

if __name__=='__main__':unittest.main(verbosity=2)
