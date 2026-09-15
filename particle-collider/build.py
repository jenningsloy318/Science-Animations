#!/usr/bin/env python3
"""
build.py — inline all scripts + vendor three.js into one self-contained HTML.

The modular app lives in index.html + js/*.js (+ vendor/three.min.js).
This script concatenates them into `collider.html` — a single portable file
that runs anywhere with no server and no network.

Usage:  python3 build.py
Output: collider.html
"""
import re
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT / "collider.html"


def inline() -> str:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    m = re.search(r"(<!-- SCRIPTS:START -->)(.*?)(<!-- SCRIPTS:END -->)",
                  html, re.S)
    if not m:
        raise SystemExit("markers not found in index.html")
    block = m.group(2)
    tags = re.findall(r'<script src="([^"]+)"></script>', block)
    if not tags:
        raise SystemExit("no script tags found between markers")
    parts = ["<!-- SCRIPTS:START -->"]
    for rel in tags:
        path = (ROOT / rel).resolve()
        if not path.exists():
            raise SystemExit(f"missing script file: {rel}")
        code = path.read_text(encoding="utf-8")
        if "</script" in code.lower():
            raise SystemExit(f"{path} contains a literal closing script tag")
        banner = f"\n/* ===== inlined: {rel} ({len(code):,} bytes) ===== */\n"
        parts.append(f"<script>{banner}{code}\n</script>")
    parts.append("<!-- SCRIPTS:END -->")
    return html[:m.start()] + "\n".join(parts) + html[m.end():]


if __name__ == "__main__":
    out = inline()
    OUT.write_text(out, encoding="utf-8")
    print(f"wrote {OUT}  ({len(out):,} bytes)")
