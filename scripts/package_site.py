"""Build an explicit public-file allowlist; never publish source or secret files."""
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = ['index.html', 'navigation.js', 'home.js', 'theme.js', 'app.js', 'install.js', 'style.css', 'manifest.webmanifest',
         'assets/favicon.svg', 'assets/apple-touch-icon.png', 'assets/icon-192.png',
         'assets/icon-512.png', 'data/content.json', 'data/sports.json', 'data/sports-status.json']


def package(destination):
    # Refuse reuse: no stale files can sneak into a deployment artifact.
    destination.mkdir(parents=True, exist_ok=False)
    for name in FILES:
        target = destination/name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT/name, target)


if __name__ == '__main__':
    package(ROOT/'_site')

