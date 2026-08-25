#!/usr/bin/env python3
"""Render the hogwash logo SVGs to PNG and ICO.

Requires cairosvg and pillow:  pip install cairosvg pillow
Run from anywhere:             python3 docs/logo/export.py
"""
import pathlib
import tempfile

import cairosvg
from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent
PNG = HERE / "png"
PNG.mkdir(exist_ok=True)

JOBS = [
    ("hogwash-mark", [512, 256, 128, 64, 32]),
    ("hogwash-mark-dark", [512, 256, 128, 64, 32]),
    ("hogwash-lockup", [1024, 512]),
    ("hogwash-lockup-dark", [1024, 512]),
    ("hogwash-avatar", [512, 256, 128]),
]

for name, widths in JOBS:
    src = HERE / f"{name}.svg"
    for w in widths:
        out = PNG / f"{name}-{w}.png"
        cairosvg.svg2png(url=str(src), write_to=str(out), output_width=w)
        print(out.relative_to(HERE))

# snout-only mark, and the favicon.ico built from it
cairosvg.svg2png(url=str(HERE / "hogwash-favicon.svg"),
                 write_to=str(PNG / "hogwash-favicon-256.png"), output_width=256)
print("png/hogwash-favicon-256.png")

with tempfile.TemporaryDirectory() as tmp:
    ico_src = pathlib.Path(tmp) / "favicon.png"
    cairosvg.svg2png(url=str(HERE / "hogwash-favicon.svg"),
                     write_to=str(ico_src), output_width=256)
    img = Image.open(ico_src).convert("RGBA")
    img.save(HERE / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
print("favicon.ico")
