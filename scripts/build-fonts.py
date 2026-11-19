#!/usr/bin/env python3
"""Regenerate the trimmed web fonts in src/assets/fonts/ (run by hand, not by the build).

Fontsource's variable fonts carry more design space than the site uses: Open Sans has a width
axis nothing sets, and both families span weights 200/300-800 while the CSS uses 400-700. On
Lighthouse's simulated slow 4G those extra bytes load at high priority alongside the LCP image.
This script downloads the pinned latin files and cuts each one down with fontTools' instancer:

  - weight kept variable, limited to 400-700
  - Open Sans width pinned at 100 (normal)
  - Newsreader split into two families by optical size, which browsers set from the font size:
    "Newsreader" keeps optical size variable over 28-56 (the homepage hero, work-with-me
    headings and prices), so it draws exactly what the full font drew there; "Newsreader Text"
    pins it at 20 for quotes and the post footer lead (19-21 px). A page loads only the cut it
    uses. Pinning the display cut too saves another 26 KB but visibly narrows the 56 px hero.

Needs fontTools and brotli, which are not site dependencies:
  python3 -m venv /tmp/fonttools && /tmp/fonttools/bin/pip install fonttools brotli
  /tmp/fonttools/bin/python scripts/build-fonts.py
Then rebuild and compare screenshots before committing.
"""
import io
import pathlib
import urllib.request

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

# The same bytes the fontsource provider served before (checked by hash, Nov 2026), pinned.
CDN = "https://cdn.jsdelivr.net/npm/@fontsource-variable"
OUT = pathlib.Path(__file__).resolve().parent.parent / "src" / "assets" / "fonts"
WEIGHTS = (400, 700)

# (output file, source file, axis limits beyond weight)
FONTS = [
    ("open-sans-normal.woff2", "open-sans@5.3.0/files/open-sans-latin-wdth-normal.woff2",
     {"wdth": 100}),
    ("open-sans-italic.woff2", "open-sans@5.3.0/files/open-sans-latin-wdth-italic.woff2",
     {"wdth": 100}),
    ("newsreader-display.woff2", "newsreader@5.3.0/files/newsreader-latin-opsz-normal.woff2",
     {"opsz": (28, 56)}),
    ("newsreader-text-normal.woff2", "newsreader@5.3.0/files/newsreader-latin-opsz-normal.woff2",
     {"opsz": 20}),
    ("newsreader-text-italic.woff2", "newsreader@5.3.0/files/newsreader-latin-opsz-italic.woff2",
     {"opsz": 20}),
]


def build(out_name, source, limits):
    with urllib.request.urlopen(f"{CDN}/{source}") as resp:
        data = resp.read()
    font = instancer.instantiateVariableFont(TTFont(io.BytesIO(data)), {"wght": WEIGHTS, **limits})
    font.flavor = "woff2"
    out = OUT / out_name
    font.save(out)
    print(f"{out_name}: {len(data) // 1024} KB -> {out.stat().st_size // 1024} KB")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for args in FONTS:
        build(*args)
