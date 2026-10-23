import json
import struct
import tempfile
import unittest
from pathlib import Path
from urllib.parse import urljoin
from scripts.package_site import ROOT, FILES, package


class PackageTests(unittest.TestCase):
    def test_manifest_paths_work_under_github_project_subdirectory(self):
        manifest = json.loads((ROOT/'manifest.webmanifest').read_text(encoding='utf-8'))
        base = 'https://example.github.io/wrexham-app/manifest.webmanifest'
        for key in ('id', 'scope', 'start_url'):
            self.assertEqual(urljoin(base, manifest[key]), 'https://example.github.io/wrexham-app/')
        self.assertEqual(manifest['display'], 'standalone')
        for icon in manifest['icons']:
            self.assertTrue(urljoin(base, icon['src']).startswith('https://example.github.io/wrexham-app/assets/'))
            self.assertIn(icon['src'], FILES)

    def test_actual_png_dimensions(self):
        for name, size in [('apple-touch-icon',180),('icon-192',192),('icon-512',512)]:
            raw = (ROOT/f'assets/{name}.png').read_bytes()
            self.assertEqual(raw[:8], b'\x89PNG\r\n\x1a\n')
            self.assertEqual(struct.unpack('>II', raw[16:24]), (size,size))

    def test_package_has_only_explicit_public_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            destination = Path(tmp)/'site'
            package(destination)
            paths = {p.relative_to(destination).as_posix() for p in destination.rglob('*') if p.is_file()}
            self.assertEqual(paths, set(FILES))
            self.assertNotIn('scripts/update_sports.py', paths)
            self.assertNotIn('.env', paths)
            with self.assertRaises(FileExistsError):
                package(destination)
