/**
 * science-i18n.js — Unified internationalization micro-library
 * Part of Science Animations for Kids (https://github.com/jenningsloy318/Science-Animations)
 * Specification: docs/requirements/08-site-wide-bilingual-i18n-spec.md
 */

// In-memory fallback when localStorage is blocked (Safari private browsing, file:// sandbox, etc.)
export const MemoryStorage = {
  _data: {},
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this._data, key) ? this._data[key] : null;
  },
  setItem(key, val) {
    this._data[key] = String(val);
  },
  removeItem(key) {
    delete this._data[key];
  },
  clear() {
    this._data = {};
  }
};

export function getSafeStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const testKey = '__i18n_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return window.localStorage;
    }
  } catch (e) {}
  return MemoryStorage;
}

export class ScienceI18n {
  constructor(options = {}) {
    this.storage = options.storage || getSafeStorage();
    this.storageKey = options.storageKey || 'science_lang';
    this.legacyKey = options.legacyKey || 'collider_lang';
    this.dict = options.dict || {};
    this.listeners = new Set();
    this.currentLang = this.resolveInitialLang(options.defaultLang);
    this.lang = this.currentLang; // Ergonomic alias

    if (options.onLangChange) {
      this.subscribe(options.onLangChange);
    }

    if (typeof window !== 'undefined') {
      // Listen for popstate (browser back/forward navigation)
      window.addEventListener('popstate', () => {
        const newLang = this.resolveInitialLang();
        if (newLang !== this.currentLang) {
          this.setLanguage(newLang, { fromPopState: true });
        }
      });

      // Listen for multi-tab sync
      window.addEventListener('storage', (e) => {
        if (e.key === this.storageKey && (e.newValue === 'zh' || e.newValue === 'en')) {
          if (e.newValue !== this.currentLang) {
            this.setLanguage(e.newValue, { fromStorage: true });
          }
        }
      });
    }
  }

  resolveInitialLang(defaultLang) {
    // 1. URL search param or hash
    if (typeof window !== 'undefined' && window.location) {
      try {
        const search = window.location.search;
        if (search) {
          const params = new URLSearchParams(search);
          const urlLang = params.get('lang');
          if (urlLang === 'zh' || urlLang === 'en') {
            this.persist(urlLang);
            return urlLang;
          }
        }
        // Hash fallback for file:// or hash routers (e.g. #lang=en or #/page?lang=en)
        const hash = window.location.hash;
        if (hash) {
          const match = hash.match(/[?&#]lang=(zh|en)/i);
          if (match && (match[1] === 'zh' || match[1] === 'en')) {
            const hashLang = match[1].toLowerCase();
            this.persist(hashLang);
            return hashLang;
          }
        }
      } catch (e) {}
    }

    // 2. localStorage 'science_lang'
    try {
      const saved = this.storage.getItem(this.storageKey);
      if (saved === 'zh' || saved === 'en') return saved;
    } catch (e) {}

    // 3. Legacy project-specific key (e.g. 'collider_lang')
    if (this.legacyKey) {
      try {
        const leg = this.storage.getItem(this.legacyKey);
        if (leg === 'zh' || leg === 'en') {
          this.persist(leg);
          return leg;
        }
      } catch (e) {}
    }

    // 4. Default if explicitly passed
    if (defaultLang === 'zh' || defaultLang === 'en') {
      return defaultLang;
    }

    // 5. Browser language fallback
    if (typeof navigator !== 'undefined') {
      const nav = (navigator.language || navigator.userLanguage || '').toLowerCase();
      if (nav.startsWith('zh')) return 'zh';
    }

    return 'zh'; // Default across Science Animations
  }

  persist(lang) {
    try {
      this.storage.setItem(this.storageKey, lang);
      if (this.legacyKey) {
        this.storage.setItem(this.legacyKey, lang);
      }
    } catch (e) {}
  }

  setLanguage(lang, options = {}) {
    if (lang !== 'zh' && lang !== 'en') return;
    const changed = this.currentLang !== lang;
    this.currentLang = lang;
    this.lang = lang;

    if (!options.fromStorage) {
      this.persist(lang);
    }

    // Cancel ongoing TTS on language switch
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }

    // Update URL query string using replaceState (never pollute history stack)
    if (!options.fromPopState && typeof window !== 'undefined' && window.history && window.location) {
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.get('lang') !== lang) {
          url.searchParams.set('lang', lang);
          window.history.replaceState(null, '', url.toString());
        }
      } catch (e) {
        try {
          const search = window.location.search;
          const params = new URLSearchParams(search);
          params.set('lang', lang);
          const newSearch = '?' + params.toString();
          if (newSearch !== window.location.search) {
            window.history.replaceState(null, '', window.location.pathname + newSearch + window.location.hash);
          }
        } catch (e2) {}
      }
    }

    // Apply to DOM
    this.applyToDOM();

    // Notify listeners
    if (changed) {
      for (const listener of this.listeners) {
        try {
          listener(lang);
        } catch (err) {
          console.error('[i18n] listener error:', err);
        }
      }
    }
  }

  setLang(lang, options) {
    this.setLanguage(lang, options);
  }

  subscribe(fn) {
    if (typeof fn === 'function') {
      this.listeners.add(fn);
      return () => this.listeners.delete(fn);
    }
    return () => {};
  }

  loadDict(dict) {
    if (dict && typeof dict === 'object') {
      Object.assign(this.dict, dict);
      this.applyToDOM();
    }
  }

  /**
   * Translate key with optional params interpolation: t('greeting', { name: 'Alice' })
   * Fallback resolution: key in current lang -> key in 'zh' -> fallback string -> key name
   */
  t(key, paramsOrFallback, maybeFallback) {
    let params = null;
    let fallback = '';

    if (paramsOrFallback && typeof paramsOrFallback === 'object') {
      params = paramsOrFallback;
      fallback = typeof maybeFallback === 'string' ? maybeFallback : '';
    } else if (typeof paramsOrFallback === 'string') {
      fallback = paramsOrFallback;
    }

    const entry = this.dict[key];
    let val = '';
    if (entry) {
      if (typeof entry === 'string') {
        val = entry;
      } else {
        val = entry[this.currentLang] || entry.zh || entry.en || fallback || key;
      }
    } else {
      val = fallback || key;
    }

    if (params && typeof val === 'string') {
      // Pure regex template replacement (Safe against eval / injection)
      val = val.replace(/{(\w+)}/g, (_, k) => {
        return Object.prototype.hasOwnProperty.call(params, k) ? params[k] : `{${k}}`;
      });
    }

    return val;
  }

  formatNumber(num, options = {}) {
    const locale = (this.currentLang === 'zh' ? 'zh-CN' : 'en-US');
    return Number(num).toLocaleString(locale, options);
  }

  formatDays(days) {
    const num = this.formatNumber(days);
    return this.currentLang === 'zh' ? `${num} 天` : `${num} days`;
  }

  applyToDOM(root = (typeof document !== 'undefined' ? document : null)) {
    if (!root) return;

    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = (this.currentLang === 'zh') ? 'zh-CN' : 'en';
      document.documentElement.classList.remove('i18n-loading');
    }

    // Toggle active state on language switch buttons
    const langBtns = root.querySelectorAll ? root.querySelectorAll('[data-lang-btn], [data-lang]') : [];
    langBtns.forEach(btn => {
      const targetLang = btn.dataset.langBtn || btn.dataset.lang;
      const isActive = targetLang === this.currentLang;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    // Update textContent: [data-i18n]
    const textEls = root.querySelectorAll ? root.querySelectorAll('[data-i18n]') : [];
    textEls.forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        const text = this.t(key);
        if (text !== undefined && text !== null) {
          el.textContent = text;
        }
      }
    });

    // Update innerHTML: [data-i18n-html]
    const htmlEls = root.querySelectorAll ? root.querySelectorAll('[data-i18n-html]') : [];
    htmlEls.forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      if (key) {
        const html = this.t(key);
        if (html !== undefined && html !== null) {
          el.innerHTML = html;
        }
      }
    });

    // Update title: [data-i18n-title]
    const titleEls = root.querySelectorAll ? root.querySelectorAll('[data-i18n-title]') : [];
    titleEls.forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (key) {
        el.setAttribute('title', this.t(key));
      }
    });

    // Update aria-label: [data-i18n-aria]
    const ariaEls = root.querySelectorAll ? root.querySelectorAll('[data-i18n-aria]') : [];
    ariaEls.forEach(el => {
      const key = el.getAttribute('data-i18n-aria');
      if (key) {
        el.setAttribute('aria-label', this.t(key));
      }
    });

    // Update placeholder: [data-i18n-placeholder]
    const placeholderEls = root.querySelectorAll ? root.querySelectorAll('[data-i18n-placeholder]') : [];
    placeholderEls.forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) {
        el.setAttribute('placeholder', this.t(key));
      }
    });

    // Update home button href with current lang param
    const homeBtns = root.querySelectorAll ? root.querySelectorAll('#homeBtn, .home-btn, a[data-home-link]') : [];
    homeBtns.forEach(btn => {
      const baseHref = btn.getAttribute('data-base-href') || btn.getAttribute('href') || '../index.html';
      const cleanHref = baseHref.split('?')[0].split('#')[0];
      btn.setAttribute('data-base-href', cleanHref);
      btn.setAttribute('href', `${cleanHref}?lang=${this.currentLang}`);
    });
  }

  // Bind a newly created dynamic DOM container (e.g. in motion-parallax dynamic views)
  bind(container) {
    if (container) {
      this.applyToDOM(container);
    }
  }

  /**
   * Helper: Update Three.js TextSprite texture without GPU memory leak
   * Keeps base height constant (H_BASE) and scales width by canvas aspect ratio.
   */
  updateTextSprite(sprite, text, options = {}) {
    if (!sprite || !sprite.material || !sprite.material.map) return;
    const canvas = sprite.material.map.image;
    if (!canvas || !canvas.getContext) return;

    const ctx = canvas.getContext('2d');
    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    const fontSize = (options.fontSize || 24) * dpr;
    const fontFace = options.fontFace || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const color = options.color || '#ffffff';
    const bgColor = options.bgColor || 'transparent';

    ctx.font = `${options.fontWeight || 'normal'} ${fontSize}px ${fontFace}`;
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize * 1.3;

    // Resize canvas if needed (accounting for HiDPI)
    const padding = (options.padding || 8) * dpr;
    const neededW = Math.max(64, Math.ceil(textWidth + padding * 2));
    const neededH = Math.max(32, Math.ceil(textHeight + padding * 2));

    if (canvas.width !== neededW || canvas.height !== neededH) {
      canvas.width = neededW;
      canvas.height = neededH;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (bgColor !== 'transparent') {
      ctx.fillStyle = bgColor;
      if (options.borderRadius) {
        const r = options.borderRadius * dpr;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(0, 0, canvas.width, canvas.height, r);
        } else {
          ctx.rect(0, 0, canvas.width, canvas.height);
        }
        ctx.fill();
      } else {
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }

    ctx.font = `${options.fontWeight || 'normal'} ${fontSize}px ${fontFace}`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    sprite.material.map.needsUpdate = true;

    // Adjust sprite geometry scale while preserving constant height
    const baseH = options.baseHeight || sprite.userData.baseHeight || 1.0;
    sprite.userData.baseHeight = baseH;
    const aspect = canvas.width / canvas.height;
    sprite.scale.set(baseH * aspect, baseH, 1);
  }
}

// Global singleton instance
export const i18n = new ScienceI18n();

// Also expose on window for non-module scripts or external bundles
if (typeof window !== 'undefined') {
  window.ScienceI18n = ScienceI18n;
  window.scienceI18n = i18n;
}
