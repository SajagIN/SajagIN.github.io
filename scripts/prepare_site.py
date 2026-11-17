#!/usr/bin/env python3
"""Assemble a Pages artifact from a static build and shared files."""
import argparse
import filecmp
from pathlib import Path
import shutil
import sys

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ("robots.txt", "sitemap.xml", "llms.txt", "manifest.json", "Resume.pdf", "404.html")

def copy_assets(src, dst):
    if not src.exists(): return
    for item in src.rglob('*'):
        if not item.is_file(): continue
        target = dst / item.relative_to(src)
        if target.exists() and not filecmp.cmp(item, target, shallow=False):
            raise ValueError(f'Asset collision at {target}; rename the shared or framework asset')
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(item, target)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--build-dir', default='website/dist')
    args = parser.parse_args()
    output = ROOT / '.pages-output'
    if output.exists(): shutil.rmtree(output)
    source = (ROOT / args.build_dir).resolve()
    if not source.is_dir() or not (source / 'index.html').is_file():
        raise ValueError(f'Build output {source} must contain index.html')
    if source == output.resolve() or output.resolve().is_relative_to(source):
        raise ValueError('Build directory cannot contain .pages-output')
    shutil.copytree(source, output)
    # These root files intentionally override build-generated versions.
    for name in PUBLIC:
        src = ROOT / name
        if src.exists(): shutil.copy2(src, output / name)
    for name in ('assets', '.well-known'):
        copy_assets(ROOT / name, output / name)
    # Preserve any Search Console HTML verification files if present.
    for src in ROOT.glob('google*.html'): shutil.copy2(src, output / src.name)
    print(f'Prepared static build in {output}')

if __name__ == '__main__':
    try: main()
    except (OSError, ValueError) as exc:
        print(f'ERROR: {exc}', file=sys.stderr); sys.exit(1)
