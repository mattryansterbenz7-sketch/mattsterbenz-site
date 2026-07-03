// coop-companion.js — Coop, live on the marketing site.
//
// A coral swallow that TRAILS your cursor and NARRATES what you're looking at:
// as you move over a section, a calm caption console (docked bottom-left) fades
// in a self-aware, in-voice insight about it — "he looks at what you're looking
// at, and says something." Ported from the product's cursor-aware swallow
// (company-intel/brain-swallow.js + coop-brain-follows-v12): same banking
// physics — watches the cursor at rest, banks into travel, faces where it flies.
//
// Soft launch, built responsibly:
//   • Renders ONLY for a fine pointer + hover (desktop mouse). Touch gets nothing.
//   • prefers-reduced-motion → no flight, no rAF: a static docked Coop whose
//     caption still narrates the section in view (event-driven, motion-free).
//   • rAF pauses when idle (settled + no input for 1.5s) and when the tab hides.
//   • The swallow is pointer-events:none — it can never block a click.
//   • Dismissible (× or Escape); tucks onto a perch; remembered for the session.
//
// Copy lives in the HTML: put data-coop="one self-aware line" on any element.
// Hover priority ("looks at what you're looking at"), else the section centered
// in the viewport. Greeting comes from <body data-coop-hello="…">.
//
// Self-contained + defensive: injects its own CSS (CSP-safe, no inline style),
// whole thing in a try/catch so it can never break the page. Coral stays vibrant
// via the brand --coral token. Swallow path mirrors the canonical mark (icon.svg).
(function () {
  'use strict';

  var SWALLOW_PATH = 'M20 68 Q33 57 47 57 Q78 41 106 22 Q84 46 69 61 L112 74 L89 72 L101 99 Q71 79 50 75 Q32 73 20 68 Z';
  var SIZE = 44, HALF = 22;
  var STORE_KEY = 'coopCompanion:off';

  function mm(q) { try { return window.matchMedia(q).matches; } catch (_) { return false; } }
  function reduceMotion() { return mm('(prefers-reduced-motion: reduce)'); }
  function canHover() { return mm('(hover: hover) and (pointer: fine)'); }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function dismissed() { try { return sessionStorage.getItem(STORE_KEY) === '1'; } catch (_) { return false; } }
  function setDismissed(v) { try { v ? sessionStorage.setItem(STORE_KEY, '1') : sessionStorage.removeItem(STORE_KEY); } catch (_) {} }

  function injectCSS() {
    if (document.getElementById('coop-companion-css')) return;
    var s = document.createElement('style');
    s.id = 'coop-companion-css';
    s.textContent =
      // the flying swallow
      '.cc-swallow{position:fixed;left:0;top:0;width:' + SIZE + 'px;height:' + SIZE + 'px;z-index:90;' +
        'pointer-events:none;will-change:transform;opacity:0;transition:opacity .5s var(--ease-out,ease);}' +
      '.cc-swallow.cc-in{opacity:1;}' +
      '.cc-swallow .cc-disc{position:absolute;inset:0;border-radius:50%;background:var(--coral,#F4505C);' +
        'background:radial-gradient(circle at 38% 32%, color-mix(in srgb, var(--coral,#F4505C) 60%, #fff),' +
        ' var(--coral,#F4505C) 58%, color-mix(in srgb, var(--coral,#F4505C) 82%, #000));' +
        'box-shadow:0 6px 16px color-mix(in srgb, var(--coral,#F4505C) 40%, transparent),0 6px 16px rgba(244,80,92,.34);' +
        'display:flex;align-items:center;justify-content:center;will-change:transform;}' +
      '.cc-swallow .cc-disc svg{width:70%;height:70%;display:block;}' +
      '.cc-swallow .cc-disc svg path{fill:#fff;}' +
      // the caption console (bottom-left), calm + stable
      '.cc-console{position:fixed;left:22px;bottom:22px;z-index:91;max-width:320px;' +
        'display:flex;align-items:center;gap:11px;padding:11px 13px 11px 12px;' +
        'background:var(--bg-raised,#fff);border:1px solid var(--border,#E2DED5);' +
        'border-radius:16px;box-shadow:0 10px 30px rgba(24,20,16,.14);' +
        'font-family:var(--font-sans,system-ui,sans-serif);color:var(--ink,#0A0B0D);' +
        'transform:translateY(8px) scale(.98);opacity:0;pointer-events:none;' +
        'transition:opacity .45s var(--ease-out,ease),transform .45s var(--ease-out,ease);}' +
      '.cc-console.cc-show{opacity:1;transform:none;pointer-events:auto;}' +
      '.cc-console.cc-perched{max-width:none;padding:0;border:0;background:transparent;box-shadow:none;}' +
      // the mini perch mark (also the collapsed state)
      '.cc-perch{flex:none;width:34px;height:34px;border-radius:50%;border:0;padding:0;cursor:pointer;' +
        'background:radial-gradient(circle at 38% 32%, color-mix(in srgb, var(--coral,#F4505C) 60%, #fff),' +
        ' var(--coral,#F4505C) 58%, color-mix(in srgb, var(--coral,#F4505C) 82%, #000));' +
        'background-color:var(--coral,#F4505C);box-shadow:0 4px 12px rgba(244,80,92,.4);' +
        'display:flex;align-items:center;justify-content:center;transition:transform .3s var(--ease-out,ease);}' +
      '.cc-perch:hover{transform:scale(1.08);}' +
      '.cc-perch svg{width:70%;height:70%;} .cc-perch svg path{fill:#fff;}' +
      '.cc-console.cc-perched .cc-perch{width:44px;height:44px;box-shadow:0 6px 18px rgba(244,80,92,.44);}' +
      '.cc-console.cc-perched .cc-body,.cc-console.cc-perched .cc-x{display:none;}' +
      // caption body + dismiss
      '.cc-body{min-width:0;}' +
      '.cc-name{font-size:11px;font-weight:700;color:var(--coral-ink,#BD3942);letter-spacing:.01em;}' +
      '.cc-text{font-size:13.5px;line-height:1.42;font-weight:500;color:var(--ink,#0A0B0D);' +
        'transition:opacity .28s var(--ease-out,ease);}' +
      '.cc-text.cc-fade{opacity:0;}' +
      '.cc-x{flex:none;align-self:flex-start;width:20px;height:20px;border:0;padding:0;cursor:pointer;' +
        'background:transparent;color:var(--ink,#0A0B0D);opacity:.4;border-radius:6px;line-height:1;' +
        'font-size:15px;transition:opacity .2s var(--ease-out,ease),background .2s var(--ease-out,ease);}' +
      '.cc-x:hover{opacity:.9;background:var(--coral-soft-2,rgba(244,80,92,.14));}' +
      '@media (max-width:640px){.cc-console,.cc-swallow{display:none!important;}}';
    (document.head || document.documentElement).appendChild(s);
  }

  function swSVG() { return '<div class="cc-disc"><svg viewBox="0 0 128 128"><path d="' + SWALLOW_PATH + '"></path></svg></div>'; }

  function init() {
    // Off entirely without a real cursor. Touch users get their page, clean.
    if (!canHover()) return;
    if (document.querySelector('.cc-console')) return;      // already mounted

    injectCSS();
    var reduced = reduceMotion();

    // ---- console (caption + perch + dismiss) ----
    var console_ = document.createElement('aside');
    console_.className = 'cc-console';
    console_.setAttribute('aria-hidden', 'true');           // decorative flourish
    console_.innerHTML =
      '<button class="cc-perch" type="button" aria-hidden="true" tabindex="-1">' +
        '<svg viewBox="0 0 128 128"><path d="' + SWALLOW_PATH + '"></path></svg></button>' +
      '<div class="cc-body"><div class="cc-name">Coop</div><div class="cc-text"></div></div>' +
      '<button class="cc-x" type="button" tabindex="-1" aria-label="Dismiss Coop" title="Dismiss (Esc)">&times;</button>';
    document.body.appendChild(console_);
    var textEl = console_.querySelector('.cc-text');
    var perchEl = console_.querySelector('.cc-perch');
    var xEl = console_.querySelector('.cc-x');

    // ---- flying swallow (full mode only) ----
    var sw = null, disc = null;
    if (!reduced) {
      sw = document.createElement('div');
      sw.className = 'cc-swallow';
      sw.setAttribute('aria-hidden', 'true');
      sw.innerHTML = swSVG();
      document.body.appendChild(sw);
      disc = sw.querySelector('.cc-disc');
    }

    // ---- insight sources ----
    var hello = (document.body.getAttribute('data-coop-hello') || '').trim();
    var nodes = Array.prototype.slice.call(document.querySelectorAll('[data-coop]'));
    var centered = null;                                    // most-centered visible node (IO)
    var current = null;                                     // node currently narrated
    var greetHold = !!hello;                                // hold the hello until first move / timeout
    function releaseGreet() { if (greetHold) { greetHold = false; refreshInsight(); } }
    if (hello) window.setTimeout(releaseGreet, 3600);

    if (window.IntersectionObserver && nodes.length) {
      var ratios = new Map();
      var io = new IntersectionObserver(function (ents) {
        ents.forEach(function (en) { ratios.set(en.target, en.isIntersecting ? en.intersectionRatio : 0); });
        var best = null, bestR = 0;
        ratios.forEach(function (r, el) { if (r > bestR) { bestR = r; best = el; } });
        centered = bestR > 0 ? best : null;
        if (!hovered) refreshInsight();
      }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
      nodes.forEach(function (n) { io.observe(n); });
    }

    var hovered = null;
    function insightFor(node) { return node ? (node.getAttribute('data-coop') || '').trim() : ''; }

    function setText(str) {
      if (!str || textEl.getAttribute('data-cur') === str) return;
      textEl.setAttribute('data-cur', str);
      textEl.classList.add('cc-fade');
      // a little "notice" dip when Coop switches his attention
      if (disc) { disc.style.transition = 'transform .3s var(--ease-out,ease)'; noticePulse = 6; }
      window.setTimeout(function () {
        textEl.textContent = str;
        textEl.classList.remove('cc-fade');
        if (disc) disc.style.transition = '';
      }, 190);
    }

    function refreshInsight() {
      if (offNow) return;
      var line = '';
      if (hovered) { current = hovered; line = insightFor(hovered); }   // looks at what you look at
      else if (greetHold && hello) { line = hello; }                    // first impression holds
      else if (centered) { current = centered; line = insightFor(centered); }
      else if (current) { line = insightFor(current); }
      else if (hello) { line = hello; }
      if (line) setText(line);
    }

    // ---- dismiss / summon ----
    var offNow = dismissed();
    function show() { console_.classList.add('cc-show'); }
    function applyState() {
      if (offNow) {
        console_.classList.add('cc-perched');
        show();
        if (sw) { sw.classList.remove('cc-in'); }
        stop();
      } else {
        console_.classList.remove('cc-perched');
        show();
        if (sw) { window.setTimeout(function () { sw.classList.add('cc-in'); }, 260); }
        refreshInsight();
        kick();
      }
    }
    function dismiss() { if (offNow) return; offNow = true; setDismissed(true); applyState(); }
    function summon() { if (!offNow) return; offNow = false; setDismissed(false); greetHold = !!hello; applyState(); }

    xEl.addEventListener('click', function (e) { e.stopPropagation(); dismiss(); });
    perchEl.addEventListener('click', function (e) { e.stopPropagation(); if (offNow) summon(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !offNow) dismiss(); });

    // Track which [data-coop] the cursor is over → "looks at what you're looking at".
    function hitTest(t) { while (t && t.nodeType === 1) { if (t.hasAttribute && t.hasAttribute('data-coop')) return t; t = t.parentElement; } return null; }

    // ================= reduced-motion: no flight, caption only =================
    if (reduced) {
      document.addEventListener('pointermove', function (e) {
        releaseGreet();
        var h = hitTest(e.target);
        if (h !== hovered) { hovered = h; refreshInsight(); }
      }, { passive: true });
      applyState();
      return;
    }

    // ================= full mode: flying swallow physics =================
    var curX = null, curY = null, t = 0, noticePulse = 0;
    var x = window.innerWidth - 90, y = window.innerHeight - 90, px = x, py = y, facing = 1, started = false;
    var raf = null, lastActive = 0, running = false;

    function now() { try { return performance.now(); } catch (_) { return Date.now(); } }
    function homePos() { return { x: 48, y: window.innerHeight - 172 }; }   // rest ABOVE the console, not over it

    document.addEventListener('pointermove', function (e) {
      curX = e.clientX; curY = e.clientY;
      lastActive = now();
      releaseGreet();
      var h = hitTest(e.target);
      if (h !== hovered) { hovered = h; refreshInsight(); }
      kick();
    }, { passive: true });
    document.addEventListener('pointerleave', function () { curX = curY = null; });
    window.addEventListener('scroll', function () { lastActive = now(); kick(); }, { passive: true });
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else kick(); });

    function tick() {
      if (offNow) { running = false; raf = null; return; }
      t += 0.05;
      // target: trail the cursor (offset up-left so he flies alongside, not under it); else home
      var gx, gy;
      if (curX !== null) { gx = curX - SIZE - 8; gy = curY - SIZE - 6; }
      else { var h = homePos(); gx = h.x; gy = h.y + Math.sin(t * 1.6) * 3; }
      if (!started) { x = gx; y = gy; px = x; py = y; started = true; }
      px = x; py = y;
      var ease = curX !== null ? 0.14 : 0.07;
      x += (gx - x) * ease; y += (gy - y) * ease;
      var vx = x - px, vy = y - py, speed = Math.sqrt(vx * vx + vy * vy), tilt;
      if (speed > 0.5) {                       // in flight → face + bank into travel
        facing = vx > 0 ? -1 : 1;
        tilt = clamp(Math.atan2(vy, Math.abs(vx) + 0.001) * 180 / Math.PI, -40, 40) * facing;
      } else if (curX !== null) {              // at rest → turn and watch the cursor
        var dx = curX - (x + HALF), dy = curY - (y + HALF);
        facing = dx > 0 ? -1 : 1;
        tilt = clamp(Math.atan2(dy, Math.abs(dx) + 0.001) * 180 / Math.PI, -32, 32) * facing;
      } else { facing = 1; tilt = 0; }
      var dip = noticePulse > 0 ? (noticePulse-- , ' translateY(2px)') : '';
      sw.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      disc.style.transform = 'scaleX(' + facing + ') rotate(' + tilt + 'deg)' + dip;
      // idle stop: settled + no input for a beat → pause rAF (restarts on move/scroll)
      if (speed < 0.15 && (now() - lastActive) > 1500) { running = false; raf = null; return; }
      raf = window.requestAnimationFrame(tick);
    }
    function kick() { if (!running && !offNow && !document.hidden) { running = true; started = started && true; raf = window.requestAnimationFrame(tick); } }
    function stop() { if (raf) { window.cancelAnimationFrame(raf); raf = null; } running = false; }

    window.addEventListener('resize', function () { /* homePos re-reads live */ });
    applyState();
  }

  function boot() { try { init(); } catch (_) { /* never break the page */ } }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
