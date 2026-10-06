/* ============================================================
   JJ · INNER PAGES v3 — rooms of the castle
   - shoji doors on each section slide open when you reach it
   - sticky index highlights the room you are in
   - timeline line fills as you read; numbers count up
   - certificate cards flip; project previews tilt
   - leaving a page closes the doors behind you
   ============================================================ */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('js');

  // doors over the whole page (CSS opens them on arrival)
  var veil = document.createElement('div');
  veil.className = 'veil'; veil.setAttribute('aria-hidden', 'true');
  veil.innerHTML = '<i></i><i></i>';
  document.body.appendChild(veil);

  /* ---- shoji doors on every section ---- */
  var rooms = [].slice.call(document.querySelectorAll('.room'));
  rooms.forEach(function (r) {
    var p = r.querySelector('.paper');
    if (!p || reduce) return;
    var l = document.createElement('span'); l.className = 'sd sd-l'; l.setAttribute('aria-hidden', 'true');
    var rr = document.createElement('span'); rr.className = 'sd sd-r'; rr.setAttribute('aria-hidden', 'true');
    p.appendChild(l); p.appendChild(rr);
  });

  function openCheck() {
    var line = window.innerHeight * 0.86;
    rooms.forEach(function (r) {
      if (!r.classList.contains('open') && r.getBoundingClientRect().top < line) r.classList.add('open');
    });
  }

  /* ---- sticky index: which room am I in? ---- */
  var railLinks = [].slice.call(document.querySelectorAll('.rail a'));
  function spy() {
    if (!railLinks.length) return;
    var current = null, mid = window.innerHeight * 0.35;
    rooms.forEach(function (r) { if (r.id && r.getBoundingClientRect().top < mid) current = r.id; });
    if (!current && rooms[0]) current = rooms[0].id;
    railLinks.forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + current); });
  }

  /* ---- timelines fill as you scroll past them ---- */
  var tls = [].slice.call(document.querySelectorAll('.tl'));
  function fillTimelines() {
    var line = window.innerHeight * 0.62;
    tls.forEach(function (tl) {
      var b = tl.getBoundingClientRect();
      var f = Math.max(0, Math.min(1, (line - b.top) / Math.max(b.height, 1)));
      tl.style.setProperty('--fill', f.toFixed(3));
      [].forEach.call(tl.querySelectorAll('.tl-item'), function (it) {
        it.classList.toggle('lit', it.getBoundingClientRect().top < line);
      });
    });
  }

  /* ---- numbers count up once ---- */
  var nums = [].slice.call(document.querySelectorAll('[data-count]'));
  function countUp() {
    nums = nums.filter(function (el) {
      if (el.getBoundingClientRect().top > window.innerHeight * 0.95) return true;
      var to = parseFloat(el.getAttribute('data-count'));
      var suffix = el.getAttribute('data-suffix') || '';
      if (reduce) { el.textContent = to + suffix; return false; }
      var t0 = performance.now(), dur = 1100;
      (function step(now) {
        var k = Math.min(1, (now - t0) / dur);
        var e = 1 - Math.pow(1 - k, 3);
        el.textContent = Math.round(to * e) + suffix;
        if (k < 1) requestAnimationFrame(step);
      })(t0);
      return false;
    });
  }

  /* ---- reading progress ---- */
  var readbar = document.querySelector('.readbar');
  function progress() {
    if (!readbar) return;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    readbar.style.width = (max > 0 ? Math.min(100, window.scrollY / max * 100) : 0) + '%';
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      openCheck(); spy(); fillTimelines(); countUp(); progress();
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  if (reduce) rooms.forEach(function (r) { r.classList.add('open'); });
  setTimeout(onScroll, 350);   // after the page doors have opened
  onScroll();

  /* ---- certificate cards: tap to flip on touch screens ---- */
  [].forEach.call(document.querySelectorAll('.cred'), function (c) {
    c.addEventListener('click', function (e) {
      if (e.target.closest('a')) return;
      c.classList.toggle('flip');
    });
    c.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); c.classList.toggle('flip'); }
    });
  });

  /* ---- project previews tilt toward the cursor ---- */
  if (!reduce && window.matchMedia('(pointer: fine)').matches) {
    [].forEach.call(document.querySelectorAll('.frame'), function (f) {
      f.addEventListener('pointermove', function (e) {
        var b = f.getBoundingClientRect();
        var x = (e.clientX - b.left) / b.width - 0.5, y = (e.clientY - b.top) / b.height - 0.5;
        f.style.setProperty('--ry', (x * 9).toFixed(2) + 'deg');
        f.style.setProperty('--rx', (-y * 7).toFixed(2) + 'deg');
      });
      f.addEventListener('pointerleave', function () {
        f.style.setProperty('--ry', '0deg'); f.style.setProperty('--rx', '0deg');
      });
    });
    [].forEach.call(document.querySelectorAll('.vcard'), function (v) {
      v.addEventListener('pointermove', function (e) {
        var b = v.getBoundingClientRect();
        v.style.setProperty('--mx', (e.clientX - b.left) + 'px');
        v.style.setProperty('--my', (e.clientY - b.top) + 'px');
      });
    });
  }

  /* ---- floating embers ---- */
  if (!reduce) {
    ['', 'e2'].forEach(function (extra) {
      var em = document.createElement('div');
      em.className = ('embersfx ' + extra).trim();
      em.setAttribute('aria-hidden', 'true');
      document.body.appendChild(em);
    });
  }

  /* ---- leaving: the doors slide shut, then we go ---- */
  if (!reduce) {
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a') : null;
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
      var href = a.getAttribute('href') || '';
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      if (!href || href.charAt(0) === '#' || /^https?:|^mailto:|^tel:/i.test(href)) return;
      e.preventDefault();
      document.body.classList.add('leaving');
      setTimeout(function () { window.location.href = href; }, 420);
    });
  }
  // coming back with the browser's Back button: open the doors again
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) document.body.classList.remove('leaving');
  });

  /* ---- keyboard: arrows between chapters, Esc goes back ---- */
  document.addEventListener('keydown', function (e) {
    if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
    if (e.key === 'ArrowLeft') {
      var prev = document.querySelector('.pn a[data-prev]');
      if (prev) prev.click();
    } else if (e.key === 'ArrowRight') {
      var next = document.querySelector('.pn a[data-next]');
      if (next) next.click();
    } else if (e.key === 'Escape') {
      var back = document.querySelector('.back');
      if (back) back.click();
    }
  });
})();
