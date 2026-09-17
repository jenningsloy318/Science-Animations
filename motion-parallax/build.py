#!/usr/bin/env python3
"""Build single-file motion-parallax.html (offline). esbuild bundles the
ES-module graph (js/main.js + vendor/three.module.js) into one classic script."""
import pathlib
import subprocess
import sys
import re

ROOT = pathlib.Path(__file__).parent
OUT = ROOT / "motion-parallax.html"

def main():
    bundle = subprocess.run(
        [
            "esbuild", str(ROOT / "js/main.js"),
            "--bundle", "--format=iife",
            f"--alias:three={ROOT / 'vendor/three.module.js'}",
            f"--alias:three/addons={ROOT / 'vendor/addons'}",
        ],
        capture_output=True, text=True, check=True,
    )
    js = bundle.stdout
    if not js.strip():
        sys.exit("esbuild produced empty output")

    html = (ROOT / "index.html").read_text(encoding="utf-8")
    css = (ROOT / "css/style.css").read_text(encoding="utf-8")

    html = re.sub(
        r'<link rel="stylesheet" href="css/style\.css">',
        "<style>\n" + css + "\n</style>",
        html,
    )
    html = re.sub(
        r'<script type="importmap">.*?</script>\s*<script type="module" src="js/main\.js"></script>',
        lambda m: "<script>\n" + js.replace("</script>", "<\\/script>") + "\n</script>",
        html,
        flags=re.S,
    )

    for bad in ("importmap", 'src="js/', "cdn.jsdelivr", "unpkg.com", "googleapis.com"):
        if bad in html:
            sys.exit(f"single-file build still references {bad!r}")

    OUT.write_text(html, encoding="utf-8")
    print(f"wrote {OUT}  ({OUT.stat().st_size:,} bytes)")

if __name__ == "__main__":
    main()
