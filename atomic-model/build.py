#!/usr/bin/env python3
"""Build single-file atomic-model.html (offline). esbuild bundles the ES-module
graph (js/main.js + vendor/three.module.js) into one classic IIFE script."""
import pathlib
import subprocess
import sys
import re

ROOT = pathlib.Path(__file__).parent
OUT = ROOT / "atomic-model.html"

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

    assert "importmap" not in html, "importmap still present"
    assert 'src="js/' not in html, "external js remains"
    assert "cdn.jsdelivr" not in html, "CDN reference remains"
    OUT.write_text(html, encoding="utf-8")
    print(f"✓ atomic-model.html  {OUT.stat().st_size:,} B  （1 个打包脚本内联）")

if __name__ == "__main__":
    main()
