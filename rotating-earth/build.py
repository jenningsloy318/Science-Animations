#!/usr/bin/env python3
# build.py — 把 index.html 中 SCRIPTS:START/END 之间的脚本内联成单文件 observatory.html
# 标准库实现，无依赖；产物离线可开（file://），勿手改。
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT / 'rotating-earth.html'
# 单文件额外内联的高质量贴图（模块化页面按需动态加载，单文件全部自带）
EXTRA_INLINE = ['js/tex-4k.js', 'js/tex-8k.js']

def main():
    src = (ROOT / 'index.html').read_text(encoding='utf-8')
    m = re.search(r'<!--\s*SCRIPTS:START\s*-->(.*?)<!--\s*SCRIPTS:END\s*-->', src, re.S)
    if not m:
        sys.exit('✗ 找不到 SCRIPTS:START/END 标记')
    block = m.group(1)
    scripts = re.findall(r'<script[^>]*src="([^"]+)"[^>]*></script>', block)
    if not scripts:
        sys.exit('✗ SCRIPTS 块内没有 <script src> 标签')

    parts, ok = [], True
    for s in scripts:
        # 页签 src 相对 index.html（项目根）：vendor/three.min.js / js/*.js
        p = (ROOT / s).resolve()
        if not p.is_file():
            sys.exit(f'✗ 缺文件: {s}')
        body = p.read_text(encoding='utf-8')
        # 防止字面 </script> 提前闭合内联标签
        if '</script' in body:
            sys.exit(f'✗ {s} 含字面 </script>，会破坏内联')
        parts.append(f'<script>\n{body}\n</script>')
        print(f'  + {s}  ({len(body):,} B)')
    for extra in EXTRA_INLINE:
        p = (ROOT / extra).resolve()
        body = p.read_text(encoding='utf-8')
        parts.append(f'<script>\n{body}\n</script>')
        print(f'  + {extra}  (单文件内联, {len(body):,} B)')

    out = src[:m.start(1)] + '\n'.join(parts) + src[m.end(1):]
    OUT.write_text(out, encoding='utf-8')
    print(f'✓ {OUT.name}  {OUT.stat().st_size:,} B  （{len(scripts)} 个脚本内联）')

if __name__ == '__main__':
    main()
