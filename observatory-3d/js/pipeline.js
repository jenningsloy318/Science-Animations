// pipeline.js — 「数据流水线」组件（本规格核心 UI）
// 四段竖排：原始读数 → 应用方程 → 逐步算术 → 真实结果，实时随交互更新。
// 每段必须有数字、单位、来源标号（§4.3）。
'use strict';

const PIPE = {
  // 在容器里渲染一个流水线骨架；stage 结构：{raw, eq, calc, result}
  mount(container, id) {
    const wrap = document.createElement('div');
    wrap.className = 'pipe';
    wrap.dataset.pipe = id || 'p';
    wrap.innerHTML =
      '<div class="pipe-st" data-k="raw"><div class="pipe-t">原始读数</div><div class="pipe-v"></div></div>' +
      '<div class="pipe-arrow">↓ 方程</div>' +
      '<div class="pipe-st" data-k="eq"><div class="pipe-t">应用方程</div><div class="pipe-v"></div></div>' +
      '<div class="pipe-arrow">↓ 代入</div>' +
      '<div class="pipe-st" data-k="calc"><div class="pipe-t">逐步算术</div><div class="pipe-v"></div></div>' +
      '<div class="pipe-arrow">↓</div>' +
      '<div class="pipe-st pipe-result" data-k="result"><div class="pipe-t">真实结果</div><div class="pipe-v"></div></div>';
    container.appendChild(wrap);
    return {
      el: wrap,
      set(k, html) {
        const st = wrap.querySelector('.pipe-st[data-k="' + k + '"] .pipe-v');
        if (st) st.innerHTML = html;
      },
      setAll(o) { for (const k in o) this.set(k, o[k]); }
    };
  },
  // 数值补间（odometer 式，避免跳变闪烁；§10 风险缓解）
  tweenNum(el, to, fmtFn, dur) {
    const from = parseFloat(el.dataset.v || '0');
    const t0 = performance.now();
    const d = dur || 220;
    el.dataset.v = to;
    if (Math.abs(from - to) < Math.abs(to) * 1e-9) { el.textContent = fmtFn(to); return; }
    function step(now) {
      const t = Math.min(1, (now - t0) / d);
      const e = t * t * (3 - 2 * t);
      el.textContent = fmtFn(lerp(from, to, e));
      if (t < 1 && el.dataset.v === String(to)) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
};

window.APP = window.APP || {};
APP.PIPE = PIPE;
