/* Coop scroll-anim — runtime
   On-brand motion: scroll progress bar, fade-up reveals, em underline draw,
   eyebrow grow, hero score-ring tick. Vanilla, no deps. */
(function () {
  'use strict';

  if (window.__coopScrollAnimLoaded) return;
  window.__coopScrollAnimLoaded = true;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 1. Scroll progress bar ───────────────────────────────── */
  function mountScrollBar() {
    if (reduce) return;
    const bar = document.createElement('div');
    bar.className = 'coop-scroll-bar';
    document.body.appendChild(bar);
    let ticking = false;
    function update() {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const p = h > 0 ? (window.scrollY / h) * 100 : 0;
      bar.style.width = p.toFixed(2) + '%';
      ticking = false;
    }
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }

  /* ── 2. Auto-tag content for scroll reveal ─────────────────── */
  function tagForReveal() {
    // Hero blocks fade up
    document.querySelectorAll('.hero-inner, .hero-left, .hero-right, .hero h1, .hero p, .hero-actions, .hero-ctas, .hero-h1, .hero-lede, .hero-credibility, .page-head').forEach((el, i) => {
      // skip if already inside a tagged ancestor
      if (el.closest('[data-anim]')) return;
      el.setAttribute('data-anim', 'up');
    });

    // Major sections fade up (don't re-tag children inside already-tagged)
    document.querySelectorAll(
      '.section, .feature-section, .cards-section, .graph-section, .footer-cta, .why-section, .honest-note, .cta-section, .benefits-row, .what-section, .builder-bridge, .feature-inner, .cards-inner, .demo-grid, .demo-card'
    ).forEach((el) => {
      if (el.closest('[data-anim="up"]')) return;
      el.setAttribute('data-anim', 'up');
    });

    // Stagger children of these row containers
    document.querySelectorAll('.benefits-row, .cards-grid, .demo-grid, .hero-actions, .hero-ctas, .explainer-grid').forEach(el => {
      el.setAttribute('data-anim-stagger', '');
    });

    // Eyebrow lines
    document.querySelectorAll('.section-tag, .feature-num, .hero-eyebrow, .hero-label, .crumb').forEach(el => {
      // skip ones that look like multi-word headers
      if (!el.textContent || el.textContent.length > 80) return;
      el.setAttribute('data-anim-eyebrow', '');
    });
  }

  /* ── 3. Wrap <em> inside H1/H2/H3 with the underline-draw span ─ */
  function wrapEms() {
    document.querySelectorAll('h1 em, h2 em, h3 em').forEach((em) => {
      // skip if already wrapped
      if (em.parentElement && em.parentElement.classList.contains('coop-em-wrap')) return;
      const wrap = document.createElement('span');
      wrap.className = 'coop-em-wrap';
      em.parentNode.insertBefore(wrap, em);
      wrap.appendChild(em);
    });
  }

  /* ── 4. IntersectionObserver: reveal on enter ──────────────── */
  function mountObserver() {
    const els = document.querySelectorAll('[data-anim="up"], [data-anim-stagger], [data-anim-eyebrow], .coop-em-wrap');
    if (!('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('is-revealed', 'is-drawn'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        if (el.classList.contains('coop-em-wrap')) {
          el.classList.add('is-drawn');
        } else {
          el.classList.add('is-revealed');
        }
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    els.forEach(el => io.observe(el));
  }

  /* ── 5. Hero ring tick-up: tag the right element with .coop-anim-ring */
  function tagHeroRing() {
    const ring = document.querySelector('.phone .ring, .ring-wrap .ring, .hero-visual .ring');
    if (ring && !ring.classList.contains('coop-anim-ring')) {
      ring.classList.add('coop-anim-ring');
      // also tick the numeric label up
      const numEl = ring.querySelector('.ring-num');
      if (numEl && !reduce) {
        const target = parseFloat(numEl.textContent) || 8;
        let started = false;
        const startTick = () => {
          if (started) return; started = true;
          const dur = 1100; const t0 = performance.now();
          function step(t) {
            const e = Math.min(1, (t - t0) / dur);
            const v = target * (1 - Math.pow(1 - e, 3));
            numEl.textContent = (Math.round(v * 10) / 10).toFixed(target % 1 === 0 ? 0 : 1);
            if (e < 1) requestAnimationFrame(step);
            else numEl.textContent = target.toString();
          }
          requestAnimationFrame(step);
        };
        // start when hero is in view
        if ('IntersectionObserver' in window) {
          const heroIO = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) { startTick(); heroIO.disconnect(); }
          }, { threshold: 0.4 });
          heroIO.observe(ring);
        } else {
          startTick();
        }
      }
    }
  }

  /* ── 6. Hero floaters — soft colored blurs drifting in the bg ─ */
  function mountFloaters() {
    if (reduce) return;
    const hero = document.querySelector('.hero, .page-head, header.page-head');
    if (!hero) return;
    // need positioning context
    const computed = getComputedStyle(hero);
    if (computed.position === 'static') hero.style.position = 'relative';
    const cs = ['f-coral', 'f-saffron', 'f-ocean'];
    const sizes = [320, 260, 380];
    const positions = [
      { top: '8%',  left: '-6%'  },
      { top: '45%', right: '-8%' },
      { top: '70%', left: '40%'  },
    ];
    cs.forEach((cls, i) => {
      const f = document.createElement('div');
      f.className = 'coop-floater ' + cls;
      f.style.width = sizes[i] + 'px';
      f.style.height = sizes[i] + 'px';
      Object.assign(f.style, positions[i]);
      f.style.animationDelay = (i * 4) + 's';
      // ensure non-floater content sits above
      hero.appendChild(f);
    });
    // bump existing children to sit above the floaters
    Array.from(hero.children).forEach(ch => {
      if (ch.classList && ch.classList.contains('coop-floater')) return;
      const cs2 = getComputedStyle(ch);
      if (cs2.position === 'static') ch.style.position = 'relative';
      if (!ch.style.zIndex) ch.style.zIndex = '1';
    });
  }

  /* ── boot ──────────────────────────────────────────────────── */
  function boot() {
    try { mountScrollBar(); } catch (e) {}
    try { wrapEms(); } catch (e) {}
    try { tagForReveal(); } catch (e) {}
    try { tagHeroRing(); } catch (e) {}
    try { mountFloaters(); } catch (e) {}
    try { mountObserver(); } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
