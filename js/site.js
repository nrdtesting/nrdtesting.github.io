/* ============================================================
   JJ · INNER PAGES — paper physics v2
   - each .fold sheet gets dealt a random-ish entrance:
     crumple-rise, toss, slide-left, slide-right, drop.
     Reveal once lang; hindi na nagre-repeat pababa-pataas.
   - laser strike sa title pagkalapag ng papel (CSS side)
   - floating embers para tuloy ang tema ng kastilyo
   - leaving a page crumples the whole page away
   ============================================================ */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- entrance variants: BAWAT TAB MAY SARILING PERSONALIDAD ----
     about = binabato ang papel; thesis = harap-harapan mula gilid;
     projects = umiikot; chapters = magkakaiba rin bawat isa */
  var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var SIG = {
    'about.html':    ['fx-toss', 'fx-rise', 'fx-toss', 'fx-drop'],
    'thesis1.html':  ['fx-slide-l', 'fx-slide-r'],
    'projects.html': ['fx-spin', 'fx-drop'],
    'chapter1.html': ['fx-rise', 'fx-slide-r', 'fx-rise'],
    'chapter2.html': ['fx-slide-l', 'fx-toss'],
    'chapter3.html': ['fx-drop', 'fx-spin', 'fx-rise'],
    'soon.html':     ['fx-spin']
  };
  var deck = SIG[page] || ['fx-rise', 'fx-toss', 'fx-slide-l', 'fx-slide-r', 'fx-drop'];
  var folds = document.querySelectorAll('.fold');
  folds.forEach(function (f, i) {
    if (!/fx-/.test(f.className)) f.classList.add(deck[i % deck.length]);
  });

  /* Reveal based on LAYOUT position (offsetTop), not the transformed
     position. IntersectionObserver looks at the post-transform spot, so
     sheets that start slid off to the side were never "visible" and never
     appeared at all (this was the missing-chapter-buttons bug). */
  function absTop(el) {
    var t = 0;
    while (el) { t += el.offsetTop; el = el.offsetParent; }
    return t;
  }
  var pending = [].slice.call(folds);
  function revealCheck() {
    if (!pending.length) return;
    var line = window.scrollY + window.innerHeight * 0.9;
    for (var i = pending.length - 1; i >= 0; i--) {
      if (absTop(pending[i]) + 30 < line) {
        pending[i].classList.add('on');
        pending.splice(i, 1);
      }
    }
  }
  if (reduce) {
    folds.forEach(function (f) { f.classList.add('on'); });
  } else {
    window.addEventListener('scroll', revealCheck, { passive: true });
    window.addEventListener('resize', revealCheck, { passive: true });
    revealCheck();
    setTimeout(revealCheck, 200);  // once more after fonts/layout settle
  }

  /* ---- embers ng kastilyo: dalawang mumurahing layer lang ---- */
  if (!reduce) {
    ['', 'e2'].forEach(function (extra) {
      var em = document.createElement('div');
      em.className = ('embersfx ' + extra).trim();
      em.setAttribute('aria-hidden', 'true');
      document.body.appendChild(em);
    });
  }

  /* ---- reading progress ---- */
  var readbar = document.querySelector('.readbar');
  if (readbar) {
    var onScroll = function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? (window.scrollY / max) * 100 : 0;
      readbar.style.width = Math.min(p, 100) + '%';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---- page-leave crumple ---- */
  if (!reduce) {
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a') : null;
      if (!a) return;
      var href = a.getAttribute('href') || '';
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      if (!href || href.charAt(0) === '#' || /^https?:|^mailto:/i.test(href)) return;
      e.preventDefault();
      document.body.classList.add('leaving');
      setTimeout(function () { window.location.href = href; }, 380);
    });
  }

  /* ---- keyboard: arrows sa mga kabanata, Esc pabalik ---- */
  document.addEventListener('keydown', function (e) {
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
