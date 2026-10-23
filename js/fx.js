/* Manorath Enterprises: effects. Sparks, the cursor ring, the hero logo's tilt, magnetic
   buttons, letters that heat up under the cursor, card tilt, direction-aware
   wipes, and the timed animations (vision, process). Nothing here is driven by
   scroll position except one-off reveals; with reduced motion it all stays still. */
(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var root = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  window.ME = window.ME || {};

  /* ── sparks: short glowing streaks with gravity, on one full-screen canvas ── */
  var cv = $('[data-sparks]'), ctx = cv.getContext('2d'), parts = [], sparkRaf = 0, lastT = 0;
  function sizeSparks() { cv.width = window.innerWidth; cv.height = window.innerHeight; }
  window.addEventListener('resize', sizeSparks); sizeSparks();
  function emit(x, y, n, spread, up) {
    if (reduced) return;
    for (var i = 0; i < n; i++) {
      var a = (up ? -Math.PI / 2 : 0) + (Math.random() - 0.5) * (spread || Math.PI * 2), v = 180 + Math.random() * 520;
      parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (up ? 60 : 120), life: 0, max: 0.35 + Math.random() * 0.6 });
    }
    if (parts.length > 600) parts.splice(0, parts.length - 600);
    if (!sparkRaf) { lastT = performance.now(); sparkRaf = requestAnimationFrame(sparkFrame); }
  }
  function sparkFrame(now) {
    var dt = Math.min(0.04, (now - lastT) / 1000); lastT = now;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.life += dt;
      if (p.life > p.max) { parts.splice(i, 1); continue; }
      p.vy += 980 * dt; p.vx *= 0.985; p.x += p.vx * dt; p.y += p.vy * dt;
      var k = p.life / p.max, g = Math.round(235 - k * 150), b = Math.round(170 - k * 160);
      ctx.strokeStyle = 'rgba(255,' + g + ',' + Math.max(0, b) + ',' + (1 - k).toFixed(2) + ')';
      ctx.lineWidth = 2.2 - k * 1.4;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.022, p.y - p.vy * 0.022); ctx.stroke();
    }
    sparkRaf = parts.length ? requestAnimationFrame(sparkFrame) : 0;
    if (!sparkRaf) ctx.clearRect(0, 0, cv.width, cv.height);
  }
  ME.burst = function (x, y, n) { emit(x, y, n || 24); };
  // a click anywhere throws a few sparks (not while typing)
  document.addEventListener('pointerdown', function (e) {
    if (e.target.closest('input, textarea, select, .drawer, [data-forge-gl]')) return;
    emit(e.clientX, e.clientY, 14);
  });

  /* ── loader: a weld bead runs across, then the screen splits open (once per visit) ── */
  var loader = $('[data-loader]'), seen = false;
  try { seen = sessionStorage.getItem('me-loader') === '1'; sessionStorage.setItem('me-loader', '1'); } catch (e) {}
  function ready() { root.classList.add('is-ready'); }
  if (!loader || reduced || seen) { if (loader) loader.remove(); requestAnimationFrame(ready); }
  else {
    var bead = $('[data-bead]'), pct = $('[data-pct]'), t0 = performance.now(), loaded = document.readyState === 'complete';
    window.addEventListener('load', function () { loaded = true; });
    (function step(now) {
      var k = Math.min(1, (now - t0) / 1500);
      if (!loaded) k = Math.min(k, 0.9 + (now - t0) / 30000);     // wait (a little) for the page to finish loading
      if (now - t0 > 3200) k = 1;
      var e = 1 - Math.pow(1 - k, 2);
      bead.style.transform = 'scaleX(' + e.toFixed(4) + ')';
      pct.textContent = ('00' + Math.round(e * 100)).slice(-3);
      var r = bead.parentNode.getBoundingClientRect();
      if (Math.random() < 0.8) emit(r.left + r.width * e, r.top + r.height / 2, 3, Math.PI * 1.2, true);
      if (k < 1) requestAnimationFrame(step);
      else {
        emit(r.right, r.top, 40);
        setTimeout(function () { loader.classList.add('is-done'); setTimeout(ready, 250); }, 220);
        setTimeout(function () { loader.remove(); }, 1600);
      }
    })(t0);
  }

  /* ── one-off reveals as sections arrive ── */
  var reveals = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else reveals.forEach(function (el) { el.classList.add('is-in'); });

  /* ── letters that heat up under the cursor ── */
  $$('[data-heat-text]').forEach(function (el) {
    // split every text node into words (kept whole for line breaks) and letters
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (w) {
            if (!w) return;
            if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(' ')); return; }
            var ws = document.createElement('span'); ws.className = 'hw';
            w.split('').forEach(function (c) { var s = document.createElement('span'); s.className = 'hc'; s.textContent = c; ws.appendChild(s); });
            frag.appendChild(ws);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1) walk(n);
      });
    })(el);
    if (reduced || !fine) return;
    var chars = $$('.hc', el), heat = chars.map(function () { return 0; }), raf = 0, boxes = null;
    var measure = function () { boxes = chars.map(function (c) { var r = c.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }); };
    el.addEventListener('pointerenter', measure);
    window.addEventListener('scroll', function () { boxes = null; }, { passive: true });
    el.addEventListener('pointermove', function (e) {
      if (!boxes) measure();
      var R = Math.max(90, el.getBoundingClientRect().height * 0.22);
      boxes.forEach(function (b, i) {
        var d = Math.hypot(b[0] - e.clientX, b[1] - e.clientY);
        if (d < R) heat[i] = Math.max(heat[i], 1 - d / R);
      });
      if (!raf) raf = requestAnimationFrame(cool);
    });
    function cool() {
      var any = false;
      chars.forEach(function (c, i) {
        if (heat[i] > 0.002) { heat[i] *= 0.955; any = true; } else heat[i] = 0;
        c.style.setProperty('--h', heat[i].toFixed(3));
      });
      raf = any ? requestAnimationFrame(cool) : 0;
    }
  });

  /* ── cursor ring with a label over things you can drag, add or open ── */
  if (fine && !reduced) {
    var cur = $('[data-cursor-el]'), label = $('[data-cursor-label]'), cx = -100, cy = -100, rx = -100, ry = -100;
    root.classList.add('has-cursor');
    document.addEventListener('pointermove', function (e) { cx = e.clientX; cy = e.clientY; });
    document.addEventListener('pointerover', function (e) {
      var t = e.target.closest('[data-cursor], a, button, input, textarea, select, label');
      var l = t && t.dataset.cursor;
      cur.classList.toggle('is-link', !!t && !l);
      cur.classList.toggle('is-label', !!l);
      cur.classList.toggle('is-text', !!t && /INPUT|TEXTAREA|SELECT/.test(t.tagName));
      if (l) label.textContent = l;
    });
    document.addEventListener('pointerdown', function () { cur.classList.add('is-down'); });
    document.addEventListener('pointerup', function () { cur.classList.remove('is-down'); });
    document.addEventListener('mouseleave', function () { cx = cy = -100; });
    (function move() {
      rx += (cx - rx) * 0.2; ry += (cy - ry) * 0.2;
      cur.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
      requestAnimationFrame(move);
    })();
  }

  /* ── hero logo: leans a few degrees toward the cursor, slowly ── */
  var logo = $('[data-tilt-logo]'), heroEl = $('.hero');
  if (logo && fine && !reduced) {
    heroEl.addEventListener('pointermove', function (e) {
      var r = heroEl.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      logo.style.setProperty('--ly', (x * 9).toFixed(2) + 'deg');
      logo.style.setProperty('--lx', (-y * 7).toFixed(2) + 'deg');
    });
    heroEl.addEventListener('pointerleave', function () { logo.style.setProperty('--lx', '0deg'); logo.style.setProperty('--ly', '0deg'); });
  }

  /* ── magnetic buttons ── */
  if (fine && !reduced) $$('[data-magnet]').forEach(function (b) {
    b.addEventListener('pointermove', function (e) {
      var r = b.getBoundingClientRect();
      b.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.35).toFixed(1) + 'px)';
    });
    b.addEventListener('pointerleave', function () { b.style.transform = ''; });
  });

  /* ── catalogue cards tilt toward the cursor, with a light sweep ── */
  if (fine && !reduced) $$('[data-tilt]').forEach(function (c) {
    c.addEventListener('pointermove', function (e) {
      var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      c.style.setProperty('--ry', ((x - 0.5) * 10).toFixed(2) + 'deg');
      c.style.setProperty('--rx', ((0.5 - y) * 8).toFixed(2) + 'deg');
      c.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
    });
    c.addEventListener('pointerleave', function () { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); });
  });

  /* ── strengths: the gold fill wipes in from the side the cursor came in, and out the side it left ── */
  $$('[data-wipe]').forEach(function (cell) {
    var side = function (e) {
      var r = cell.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      return Math.abs(x) > Math.abs(y) ? (x > 0 ? 'r' : 'l') : (y > 0 ? 'b' : 't');
    };
    cell.addEventListener('pointerenter', function (e) {
      cell.classList.remove('is-on'); cell.dataset.from = side(e); void cell.offsetWidth; cell.classList.add('is-on');
    });
    cell.addEventListener('pointerleave', function (e) { cell.dataset.from = side(e); cell.classList.remove('is-on'); });
  });

  /* ── industries: the orange fill spreads from wherever the cursor enters ── */
  $$('.inds__grid li').forEach(function (li) {
    li.addEventListener('pointerenter', function (e) {
      var r = li.getBoundingClientRect();
      li.style.setProperty('--cx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      li.style.setProperty('--cy', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    });
  });

  /* ── timed animations that start once their section is on screen ── */
  function onceVisible(el, fn, threshold) {
    if (!el) return;
    if (reduced || !('IntersectionObserver' in window)) { fn(true); return; }
    var o = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { o.disconnect(); fn(false); } }, { threshold: threshold || 0.35 });
    o.observe(el);
  }
  // vision: the words heat up one after another, like a bar coming out of the furnace
  var words = $('[data-words]');
  if (words) {
    var KEY = /^(trusted|dependable|quality,?|timely)/i;
    words.innerHTML = words.textContent.trim().split(/\s+/).map(function (w, i) {
      return '<span class="vw' + (KEY.test(w) ? ' is-key' : '') + '" style="--d:' + (i * 0.075).toFixed(3) + 's">' + w + '</span>';
    }).join(' ');
    onceVisible(words, function () { words.classList.add('is-hot'); }, 0.4);
  }
  // process: material runs down the line and lights each step as it passes
  onceVisible($('[data-proc]'), function () { $('[data-proc]').classList.add('is-run'); }, 0.3);
})();
