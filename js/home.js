/* ============================================================
   JJ · HOME WORLD v3 — "Ang Kastilyo, mula sa loob"
   - The castle is now built, not boxed: tiered towers on stone
     bases, open rooms you can look into (tatami, shoji, gold
     fusuma, hanging lanterns), stairs, walkways, torii, and
     giant interior pillars.
   - Everything is merged per material, so each structure costs
     only a handful of draw calls. Real lights (hemisphere, key,
     rim, and a lantern that travels with you) give the wood and
     roofs actual shape.
   - Flight: scroll moves you toward the cursor, 360° steering.
   Plain Three.js r128, no build tools.
   ============================================================ */
(function () {
  'use strict';

  var fallback = document.getElementById('fallback');
  var fbMsg = document.getElementById('fallback-msg');
  var canvas = document.getElementById('world');

  var isCoarse = window.matchMedia('(pointer: coarse)').matches;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  function webglOk() {
    try {
      var t = document.createElement('canvas');
      return !!(window.WebGLRenderingContext &&
        (t.getContext('webgl2') || t.getContext('webgl') || t.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }

  function showFallback(extra) {
    var threeLoaded = (typeof THREE !== 'undefined');
    if (fbMsg) {
      fbMsg.innerHTML =
        '&bull; 3D engine loaded: <b>' + (threeLoaded ? 'YES' : 'NO') + '</b><br>' +
        '&bull; WebGL available: <b>' + (webglOk() ? 'YES' : 'NO') + '</b>' +
        (extra ? '<br>&bull; Error: <b>' + extra + '</b>' : '');
    }
    if (fallback) fallback.hidden = false;
    document.body.classList.add('no3d');
  }

  function boot() {
    if (typeof THREE === 'undefined') { showFallback('engine did not load (local + backup failed)'); return; }
    if (!webglOk()) { showFallback(''); return; }
    try { start(); }
    catch (e) { showFallback(e && e.message ? e.message : String(e)); }
  }

  // NOTE: ang boot() ay tinatawag sa PINAKADULO ng file na ito, para
  // siguradong defined na ang Sound at lahat bago mag-start ang mundo.
  function launch() {
    if (typeof THREE === 'undefined') {
      var s = document.createElement('script');
      s.src = 'https://unpkg.com/three@0.128.0/build/three.min.js';
      s.onload = boot; s.onerror = boot;
      document.head.appendChild(s);
    } else { boot(); }
  }

  /* ---------------- AUDIO: war engine ----------------
     Taiko war drums marching underneath, a dark tension drone,
     and distant war horns every so often. Volume knob included. */
  var Sound = (function () {
    var ctx, master, on = false, ready = false, vol = 0.55;
    var beatTimer = null, stingTimer = null, noiseBuf = null;

    function init() {
      if (ready) return true;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try {
        ctx = new AC();
        master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);

        // dissonant drone: minor-second cluster sa ilalim ng dark lowpass
        var droneGain = ctx.createGain(); droneGain.gain.value = 0.3;
        var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260;
        droneGain.connect(lp); lp.connect(master);
        [55, 58.27, 110.6].forEach(function (f, i) {
          var o = ctx.createOscillator();
          o.type = i === 2 ? 'triangle' : 'sine';
          o.frequency.value = f; o.detune.value = (i - 1) * 4;
          var g = ctx.createGain(); g.gain.value = i === 2 ? 0.08 : 0.14;
          o.connect(g); g.connect(droneGain); o.start();
        });

        // noise bed para sa mga bulong ng hangin
        var len = ctx.sampleRate * 2;
        noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
        var data = noiseBuf.getChannelData(0);
        for (var n = 0; n < len; n++) data[n] = Math.random() * 2 - 1;

        ready = true; return true;
      } catch (e) { return false; }
    }

    // one taiko hit: deep boom + skin snap
    function drum(strong) {
      if (!ready || !on || ctx.state !== 'running') return;
      var t = ctx.currentTime;
      var o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(strong ? 62 : 74, t);
      o.frequency.exponentialRampToValueAtTime(34, t + 0.22);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(strong ? 0.55 : 0.3, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (strong ? 0.4 : 0.25));
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + 0.5);
      var src = ctx.createBufferSource(); src.buffer = noiseBuf;
      var lp2 = ctx.createBiquadFilter(); lp2.type = 'lowpass';
      lp2.frequency.value = strong ? 900 : 600;
      var ng = ctx.createGain();
      ng.gain.setValueAtTime(strong ? 0.14 : 0.08, t);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      src.connect(lp2); lp2.connect(ng); ng.connect(master);
      src.start(t); src.stop(t + 0.1);
    }

    // war march: BOOM . boom . BOOM boom-boom . repeat
    var HITS = [1, 0, 1, 0, 0];
    var GAPS = [400, 400, 200, 200, 400];
    function march() {
      clearTimeout(beatTimer);
      var i = 0;
      (function stepFn() {
        drum(HITS[i] === 1);
        beatTimer = setTimeout(stepFn, GAPS[i]);
        i = (i + 1) % HITS.length;
      })();
    }

    // distant war horns, every so often
    function sting() {
      clearTimeout(stingTimer);
      stingTimer = setTimeout(function () {
        if (ready && on && ctx.state === 'running') {
          var t = ctx.currentTime;
          [87.3, 92].forEach(function (f) {
            var o = ctx.createOscillator(); o.type = 'sawtooth';
            o.frequency.value = f;
            var lp2 = ctx.createBiquadFilter(); lp2.type = 'lowpass';
            lp2.frequency.value = 420;
            var g = ctx.createGain();
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.05, t + 0.9);
            g.gain.setValueAtTime(0.05, t + 1.7);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
            o.connect(lp2); lp2.connect(g); g.connect(master);
            o.start(t); o.stop(t + 3);
          });
          var src = ctx.createBufferSource(); src.buffer = noiseBuf;
          var bp = ctx.createBiquadFilter(); bp.type = 'lowpass';
          bp.frequency.value = 220;
          var ng = ctx.createGain();
          ng.gain.setValueAtTime(0, t);
          ng.gain.linearRampToValueAtTime(0.05, t + 0.6);
          ng.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
          src.connect(bp); bp.connect(ng); ng.connect(master);
          src.start(t); src.stop(t + 2.3);
        }
        sting();
      }, 9000 + Math.random() * 10000);
    }

    return {
      tick: function () {
        if (!ready || !on || ctx.state !== 'running') return;
        var o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 196;
        var g = ctx.createGain(); var t = ctx.currentTime;
        g.gain.setValueAtTime(0.04, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
        o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.12);
      },
      initVol: function (v) { vol = v; },
      setVol: function (v) {
        vol = v;
        store.set('jjVol', String(Math.round(v * 100)));
        if (ready && on) {
          try {
            var t = ctx.currentTime;
            master.gain.cancelScheduledValues(t);
            master.gain.setValueAtTime(master.gain.value, t);
            master.gain.linearRampToValueAtTime(vol, t + 0.15);
          } catch (e) {}
        }
      },
      toggle: function () {
        if (!init()) return false;
        if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
        on = !on;
        store.set('jjSoundV2', on ? 'on' : 'off');
        try {
          var t = ctx.currentTime;
          master.gain.cancelScheduledValues(t);
          master.gain.setValueAtTime(master.gain.value, t);
          master.gain.linearRampToValueAtTime(on ? vol : 0, t + 0.8);
        } catch (e) {}
        if (on) { march(); sting(); }
        else { clearTimeout(beatTimer); clearTimeout(stingTimer); }
        return on;
      }
    };
  })();

  /* ============================================================
     TEXTURES — all painted on canvas, nothing downloaded
     ============================================================ */
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  var maxAniso = 4;
  function paint(w, h, draw, repeat) {
    var cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    draw(cv.getContext('2d'), w, h);
    var tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = maxAniso;
    if (repeat) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; }
    return tex;
  }

  // hinoki / keyaki wood: long grain, a few knots
  function woodTex() {
    return paint(256, 256, function (g, w, h) {
      g.fillStyle = '#6a4027'; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 140; i++) {
        var x = Math.random() * w, a = rnd(0.05, 0.22), lw = rnd(0.6, 2.6);
        g.strokeStyle = Math.random() < 0.6 ? 'rgba(38,18,8,' + a + ')' : 'rgba(150,96,58,' + a + ')';
        g.lineWidth = lw;
        g.beginPath();
        var amp = rnd(1, 5), fr = rnd(0.01, 0.04), ph = rnd(0, 6);
        for (var y = 0; y <= h; y += 8) {
          var xx = x + Math.sin(y * fr + ph) * amp;
          if (y === 0) g.moveTo(xx, y); else g.lineTo(xx, y);
        }
        g.stroke();
      }
      for (var k = 0; k < 3; k++) {
        var kx = rnd(20, w - 20), ky = rnd(20, h - 20);
        var rg = g.createRadialGradient(kx, ky, 0, kx, ky, rnd(5, 10));
        rg.addColorStop(0, 'rgba(30,14,6,0.8)'); rg.addColorStop(1, 'rgba(30,14,6,0)');
        g.fillStyle = rg; g.beginPath(); g.ellipse(kx, ky, 6, 14, 0, 0, Math.PI * 2); g.fill();
      }
    }, true);
  }

  // kawara roof tiles: rounded channels down the slope
  function roofTex() {
    return paint(256, 256, function (g, w, h) {
      g.fillStyle = '#23242c'; g.fillRect(0, 0, w, h);
      var cw = 16;
      for (var x = 0; x < w; x += cw) {
        var lg = g.createLinearGradient(x, 0, x + cw, 0);
        lg.addColorStop(0, '#121318'); lg.addColorStop(0.45, '#4a4d5a');
        lg.addColorStop(0.6, '#3a3c47'); lg.addColorStop(1, '#121318');
        g.fillStyle = lg; g.fillRect(x, 0, cw, h);
      }
      for (var y = 0; y < h; y += 32) {
        g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(0, y, w, 3);
        g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(0, y + 3, w, 2);
      }
    }, true);
  }

  // ishigaki: the sloped stone base
  function stoneTex() {
    return paint(256, 256, function (g, w, h) {
      g.fillStyle = '#2e2a28'; g.fillRect(0, 0, w, h);
      var y = 0;
      while (y < h) {
        var rh = rnd(22, 40), x = -rnd(0, 30);
        while (x < w) {
          var bw = rnd(34, 72), v = Math.floor(rnd(78, 118));
          g.fillStyle = 'rgb(' + v + ',' + (v - 6) + ',' + (v - 12) + ')';
          g.fillRect(x + 2, y + 2, bw - 4, rh - 4);
          g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(x + 2, y + 2, bw - 4, 3);
          x += bw;
        }
        y += rh;
      }
    }, true);
  }

  // shoji: washi paper lit from inside, kumiko lattice, wooden kick panel
  function shojiTex() {
    return paint(128, 256, function (g, w, h) {
      var lg = g.createLinearGradient(0, 0, 0, h);
      lg.addColorStop(0, '#ffd9a0'); lg.addColorStop(0.55, '#ffc070'); lg.addColorStop(1, '#f09a48');
      g.fillStyle = lg; g.fillRect(0, 0, w, h);
      var rg = g.createRadialGradient(w * 0.5, h * 0.4, 4, w * 0.5, h * 0.4, h * 0.55);
      rg.addColorStop(0, 'rgba(255,246,220,0.55)'); rg.addColorStop(1, 'rgba(255,246,220,0)');
      g.fillStyle = rg; g.fillRect(0, 0, w, h);
      for (var f = 0; f < 60; f++) {
        g.strokeStyle = 'rgba(255,255,240,' + rnd(0.04, 0.12) + ')';
        g.lineWidth = 0.6; g.beginPath();
        var fx = Math.random() * w, fy = Math.random() * h;
        g.moveTo(fx, fy); g.lineTo(fx + rnd(-8, 8), fy + rnd(4, 14)); g.stroke();
      }
      g.fillStyle = '#26140a';
      g.fillRect(0, 0, w, 7); g.fillRect(0, 0, 7, h); g.fillRect(w - 7, 0, 7, h);
      for (var c = 1; c < 3; c++) g.fillRect(c * w / 3 - 1.5, 0, 3, h * 0.8);
      for (var r = 1; r < 6; r++) g.fillRect(0, r * (h * 0.8) / 6 - 1.5, w, 3);
      g.fillStyle = '#3c2212'; g.fillRect(0, h * 0.8, w, h * 0.2);
      g.fillStyle = '#26140a'; g.fillRect(0, h * 0.8 - 3, w, 6); g.fillRect(0, h - 5, w, 5);
      g.fillStyle = 'rgba(255,190,120,0.08)';
      for (var gx = 0; gx < 10; gx++) g.fillRect(rnd(8, w - 8), h * 0.82, 1, h * 0.16);
    }, true);
  }

  // fusuma: gold leaf, painted pine and clouds, lacquer frame, pull
  function fusumaTex() {
    return paint(128, 256, function (g, w, h) {
      var lg = g.createLinearGradient(0, 0, w, h);
      lg.addColorStop(0, '#d9b45e'); lg.addColorStop(0.5, '#f0d088'); lg.addColorStop(1, '#b98d3c');
      g.fillStyle = lg; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(120,80,20,0.22)'; g.lineWidth = 1;
      for (var x = 0; x <= w; x += 21) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      for (var y = 0; y <= h; y += 21) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      g.fillStyle = 'rgba(255,248,225,0.45)';
      for (var c = 0; c < 4; c++) {
        g.beginPath(); g.ellipse(rnd(0, w), rnd(20, h * 0.45), rnd(24, 46), rnd(7, 12), 0, 0, Math.PI * 2); g.fill();
      }
      g.fillStyle = 'rgba(48,40,26,0.75)';
      g.beginPath(); g.moveTo(0, h * 0.78);
      for (var m = 0; m <= w; m += 16) g.lineTo(m, h * (0.62 + Math.random() * 0.14));
      g.lineTo(w, h); g.lineTo(0, h); g.fill();
      g.strokeStyle = 'rgba(40,30,18,0.85)'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(w * 0.2, h * 0.75); g.quadraticCurveTo(w * 0.35, h * 0.45, w * 0.7, h * 0.38); g.stroke();
      g.fillStyle = 'rgba(52,72,40,0.8)';
      for (var n = 0; n < 5; n++) { g.beginPath(); g.ellipse(w * rnd(0.3, 0.8), h * rnd(0.36, 0.5), 14, 5, rnd(-0.3, 0.3), 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#140c08';
      g.fillRect(0, 0, w, 6); g.fillRect(0, h - 6, w, 6); g.fillRect(0, 0, 5, h); g.fillRect(w - 5, 0, 5, h);
      g.beginPath(); g.arc(w - 16, h * 0.52, 5, 0, Math.PI * 2); g.fill();
    }, true);
  }

  // tatami: one mat, igusa weave, dark heri borders on the long sides
  function tatamiTex() {
    return paint(128, 256, function (g, w, h) {
      g.fillStyle = '#a9a465'; g.fillRect(0, 0, w, h);
      for (var y = 0; y < h; y += 2) {
        g.fillStyle = (y / 2) % 2 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,215,0.07)';
        g.fillRect(0, y, w, 1);
      }
      for (var s = 0; s < 40; s++) {
        g.fillStyle = 'rgba(80,70,20,' + rnd(0.03, 0.08) + ')';
        g.fillRect(rnd(0, w), 0, rnd(1, 3), h);
      }
      g.fillStyle = '#2b2417'; g.fillRect(0, 0, 11, h); g.fillRect(w - 11, 0, 11, h);
      g.fillStyle = 'rgba(200,170,90,0.45)';
      for (var d = 6; d < h; d += 12) { g.fillRect(4, d, 3, 3); g.fillRect(w - 7, d, 3, 3); }
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 0, w, 2); g.fillRect(0, h - 2, w, 2);
    }, true);
  }

  // kakejiku: hanging scroll with a brush stroke
  function scrollTex() {
    return paint(64, 192, function (g, w, h) {
      g.fillStyle = '#3d4a5a'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#efe6cf'; g.fillRect(8, 24, w - 16, h - 52);
      g.strokeStyle = '#1b1510'; g.lineCap = 'round';
      g.lineWidth = 5; g.beginPath(); g.moveTo(w / 2, 40); g.lineTo(w / 2 + 2, 70); g.stroke();
      g.lineWidth = 3; g.beginPath(); g.moveTo(w / 2 - 10, 82); g.lineTo(w / 2 + 10, 86); g.stroke();
      g.lineWidth = 4; g.beginPath(); g.moveTo(w / 2 - 6, 100); g.quadraticCurveTo(w / 2 + 12, 112, w / 2 - 2, 128); g.stroke();
      g.fillStyle = '#b3342c'; g.fillRect(w / 2 + 6, h - 46, 7, 7);
      g.fillStyle = '#20150d'; g.fillRect(0, h - 10, w, 10); g.fillRect(0, 0, w, 6);
    });
  }

  // chochin: paper lantern with ribs and black caps
  function lanternTex() {
    return paint(128, 128, function (g, w, h) {
      var lg = g.createLinearGradient(0, 0, w, 0);
      lg.addColorStop(0, '#d2502a'); lg.addColorStop(0.5, '#ffd08a'); lg.addColorStop(1, '#d2502a');
      g.fillStyle = lg; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(120,36,10,0.35)';
      for (var y = 14; y < h - 12; y += 7) g.fillRect(0, y, w, 1.5);
      g.fillStyle = 'rgba(90,20,8,0.55)';
      g.fillRect(w * 0.42, h * 0.36, w * 0.16, 4); g.fillRect(w * 0.48, h * 0.3, 4, h * 0.32);
      g.fillStyle = '#140c08'; g.fillRect(0, 0, w, 12); g.fillRect(0, h - 12, w, 12);
    });
  }

  function glowTex() {
    return paint(64, 64, function (g, w, h) {
      var rg = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      rg.addColorStop(0, 'rgba(255,200,120,1)');
      rg.addColorStop(0.25, 'rgba(255,160,70,0.45)');
      rg.addColorStop(1, 'rgba(255,140,60,0)');
      g.fillStyle = rg; g.fillRect(0, 0, w, h);
    });
  }

  /* ============================================================
     BUILDER — merges many boxes/cylinders into one geometry per
     material, with baked occlusion (undersides darker).
     ============================================================ */
  // created inside start(), so nothing touches THREE before it has loaded
  var _m, _q, _e, _p, _s;

  function Builder() { this.b = {}; }
  Builder.prototype.put = function (key, geo, x, y, z, o) {
    o = o || {};
    _e.set(o.rx || 0, o.ry || 0, o.rz || 0, 'YXZ');
    _q.setFromEuler(_e); _p.set(x, y, z);
    _m.compose(_p, _q, _s);
    var g = geo.index ? geo.toNonIndexed() : geo;
    g.applyMatrix4(_m);
    var cnt = g.attributes.position.count;
    if (o.u || o.v) {
      var uv = g.attributes.uv.array, su = o.u || 1, sv = o.v || 1;
      for (var i = 0; i < cnt; i++) { uv[i * 2] *= su; uv[i * 2 + 1] *= sv; }
    }
    var nrm = g.attributes.normal.array, col = new Float32Array(cnt * 3);
    var t = o.t == null ? 1 : o.t;
    for (var k = 0; k < cnt; k++) {
      var ny = nrm[k * 3 + 1];
      var ao = ny < -0.5 ? 0.45 : (ny > 0.5 ? 1 : 0.84);
      col[k * 3] = col[k * 3 + 1] = col[k * 3 + 2] = t * ao;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    (this.b[key] || (this.b[key] = [])).push(g);
  };
  Builder.prototype.box = function (key, x, y, z, sx, sy, sz, o) {
    this.put(key, new THREE.BoxGeometry(sx, sy, sz), x, y, z, o);
  };
  Builder.prototype.cyl = function (key, x, y, z, rt, rb, h, seg, o) {
    this.put(key, new THREE.CylinderGeometry(rt, rb, h, seg || 10, 1, false), x, y, z, o);
  };
  // square frustum (hip roofs, stone bases). half-widths, not radii.
  Builder.prototype.frustum = function (key, x, y, z, topHalf, botHalf, h, o) {
    o = o || {};
    var oo = { rx: o.rx, ry: (o.ry || 0) + Math.PI / 4, rz: o.rz, t: o.t, u: o.u, v: o.v };
    this.put(key, new THREE.CylinderGeometry(topHalf * Math.SQRT2, botHalf * Math.SQRT2, h, 4, 1, false), x, y, z, oo);
  };
  Builder.prototype.build = function (remap) {
    var group = new THREE.Group();
    var merged = {}, bb = new THREE.Box3(), tmpB = new THREE.Box3(), first = true;
    for (var key in this.b) {
      var k2 = remap ? remap(key) : key;
      merged[k2] = (merged[k2] || []).concat(this.b[key]);
    }
    var geos = {};
    for (var mk in merged) {
      geos[mk] = mergeGeos(merged[mk]);
      geos[mk].computeBoundingBox();
      tmpB.copy(geos[mk].boundingBox);
      if (first) { bb.copy(tmpB); first = false; } else bb.union(tmpB);
    }
    var c = new THREE.Vector3(); bb.getCenter(c);
    for (var gk in geos) {
      geos[gk].translate(-c.x, -c.y, -c.z);
      geos[gk].computeBoundingSphere();
      var mesh = new THREE.Mesh(geos[gk], MATS[gk]);
      group.add(mesh);
    }
    var size = new THREE.Vector3(); bb.getSize(size);
    group.userData.radius = size.length() / 2;
    return group;
  };

  function mergeGeos(list) {
    var total = 0, i;
    for (i = 0; i < list.length; i++) total += list[i].attributes.position.count;
    var pos = new Float32Array(total * 3), nrm = new Float32Array(total * 3);
    var uv = new Float32Array(total * 2), col = new Float32Array(total * 3);
    var o3 = 0, o2 = 0;
    for (i = 0; i < list.length; i++) {
      var a = list[i].attributes;
      pos.set(a.position.array, o3); nrm.set(a.normal.array, o3);
      col.set(a.color.array, o3); uv.set(a.uv.array, o2);
      o3 += a.position.array.length; o2 += a.uv.array.length;
      list[i].dispose();
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  }

  var MATS = {};

  /* ============================================================
     ARCHITECTURE
     ============================================================ */
  var SIDES = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];

  // point on side s of a square of half-width hw, at local x along that side
  function sidePt(ry, lx, hw) {
    return { x: lx * Math.cos(ry) + hw * Math.sin(ry), z: -lx * Math.sin(ry) + hw * Math.cos(ry) };
  }

  /* --- tenshu: a tiered castle keep on a stone base --- */
  function makeTower(tiers, baseW, low) {
    var B = new Builder();
    var hw0 = baseW / 2;
    B.frustum('stone', 0, 2, 0, hw0 + 0.6, hw0 + 2.2, 4, { u: 4, v: 1 });
    var y = 4, w = baseW, hw = hw0;
    for (var k = 0; k < tiers; k++) {
      w = baseW * (1 - k * 0.13); hw = w / 2;
      var h = 3.1 - k * 0.1;
      var lastTier = k === tiers - 1;

      B.box('wood', 0, y + 0.15, 0, w + 1.1, 0.3, w + 1.1, { t: 0.75, u: 3, v: 3 });

      var bays = Math.max(2, Math.round(w / 1.6)), bw = w / bays;
      for (var s = 0; s < 4; s++) {
        var ry = SIDES[s], sn = Math.sin(ry), cs = Math.cos(ry);
        var lit = Math.random() < 0.8 ? rnd(0.8, 1) : rnd(0.35, 0.55);
        B.box('shoji', sn * hw, y + 0.3 + (h - 0.3) / 2, cs * hw, w, h - 0.3, 0.06, { ry: ry, u: bays, t: lit });
        if (low) continue;
        for (var b = 0; b <= bays; b++) {
          var p = sidePt(ry, -hw + b * bw, hw + 0.04);
          B.box('wood', p.x, y + h / 2, p.z, 0.24, h, 0.24, { t: 0.5 });
        }
        B.box('wood', sn * (hw + 0.1), y + h - 0.14, cs * (hw + 0.1), w + 0.5, 0.28, 0.24, { ry: ry, t: 0.55, u: 3 });
        B.box('wood', sn * (hw + 0.08), y + 0.45, cs * (hw + 0.08), w + 0.3, 0.14, 0.16, { ry: ry, t: 0.55, u: 3 });
        if (k % 2 === 0) {
          var rr = hw + 0.48;
          B.box('red', sn * rr, y + 1.05, cs * rr, w + 1.0, 0.1, 0.1, { ry: ry });
          B.box('red', sn * rr, y + 0.6, cs * rr, w + 1.0, 0.06, 0.06, { ry: ry });
          for (var rp = 0; rp <= bays; rp++) {
            var q = sidePt(ry, -hw - 0.48 + rp * (w + 0.96) / bays, rr);
            B.box('red', q.x, y + 0.7, q.z, 0.09, 0.75, 0.09);
          }
        }
      }
      y += h;

      var over = 1.6, eh = hw + over;
      var topHalf = lastTier ? 0.35 : hw * 0.62;
      var rh = lastTier ? 2.6 : 1.4;
      B.frustum('roof', 0, y + rh / 2, 0, topHalf, eh, rh, { u: 8, v: 1 });
      if (!low) {
        for (var f = 0; f < 4; f++) {
          var fr = SIDES[f];
          B.box('wood', Math.sin(fr) * eh, y + 0.02, Math.cos(fr) * eh, 2 * eh + 0.15, 0.24, 0.14, { ry: fr, t: 0.35 });
          B.box('wood', Math.sin(fr) * (hw + 0.6), y - 0.18, Math.cos(fr) * (hw + 0.6), 2 * hw + 1.4, 0.14, 1.3, { ry: fr, t: 0.4 });
        }
        for (var cc = 0; cc < 4; cc++) {
          var a = Math.PI / 4 + cc * Math.PI / 2, d = eh * Math.SQRT2;
          B.box('roof', Math.sin(a) * (d - 0.2), y + 0.32, Math.cos(a) * (d - 0.2), 0.4, 0.22, 1.7, { ry: a, rx: -0.5, t: 0.9 });
          B.cyl('lantern', Math.sin(a) * (d - 1.3), y - 0.75, Math.cos(a) * (d - 1.3), 0.26, 0.26, 0.6, 10);
        }
      }
      if (lastTier) {
        B.box('roof', 0, y + rh + 0.15, 0, 1.6, 0.35, 0.5, { t: 0.8 });
        B.box('gold', -0.75, y + rh + 0.6, 0, 0.28, 0.7, 0.28, { rz: 0.3 });
        B.box('gold', 0.75, y + rh + 0.6, 0, 0.28, 0.7, 0.28, { rz: -0.3 });
      } else {
        y += rh * 0.55;
      }
    }
    return B.build(low ? function (key) { return key === 'shoji' ? 'shoji' : 'silh'; } : null);
  }

  /* --- a wall of open rooms: the inside of the castle --- */
  function makeRooms(cols, rows) {
    var B = new Builder();
    var W = 7, H = 4.4, D = 6;
    var totalW = cols * W;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var x0 = (c - (cols - 1) / 2) * W, y0 = r * H;

        B.box('tatami', x0, y0 + 0.1, 0, W - 0.25, 0.2, D, { u: (W - 0.25) / 1.8, v: D / 3.6 });
        B.box('wood', x0, y0 + H - 0.12, 0, W, 0.24, D, { t: 0.55, u: 2, v: 2 });
        for (var cb = 1; cb < 4; cb++) {
          B.box('wood', x0 - W / 2 + cb * W / 4, y0 + H - 0.4, 0, 0.16, 0.32, D, { t: 0.4 });
        }

        var back = Math.random() < 0.5 ? 'fusuma' : 'shoji';
        B.box(back, x0, y0 + 0.2 + (H - 1.1) / 2, D / 2 - 0.06, W - 0.25, H - 1.1, 0.08,
          { u: back === 'fusuma' ? 4 : Math.round(W / 1.6), t: rnd(0.75, 1) });
        B.box('wood', x0, y0 + H - 0.6, D / 2 - 0.06, W - 0.25, 0.18, 0.12, { t: 0.45 });
        B.box('shoji', x0, y0 + H - 0.33, D / 2 - 0.04, W - 0.25, 0.36, 0.04, { u: 8, v: 0.2, t: 0.6 });

        B.box('wood', x0 - W / 2, y0 + H / 2, 0, 0.22, H, D, { t: 0.62, u: 2 });
        B.box('wood', x0 - W / 2 + 0.13, y0 + H - 0.9, 0, 0.06, 0.14, D, { t: 0.35 });
        if (c === cols - 1) B.box('wood', x0 + W / 2, y0 + H / 2, 0, 0.22, H, D, { t: 0.62, u: 2 });

        B.box('wood', x0 - W / 2, y0 + H / 2, -D / 2, 0.42, H, 0.42, { t: 0.42 });
        if (c === cols - 1) B.box('wood', x0 + W / 2, y0 + H / 2, -D / 2, 0.42, H, 0.42, { t: 0.42 });
        B.box('wood', x0, y0 + H - 0.32, -D / 2, W, 0.5, 0.38, { t: 0.42, u: 3 });

        B.box('wood', x0, y0 + 0.06, -D / 2 - 0.75, W, 0.16, 1.5, { t: 0.9, u: 3 });
        if (Math.random() < 0.55) {
          B.box('red', x0, y0 + 0.98, -D / 2 - 1.42, W, 0.1, 0.1);
          for (var rp = 0; rp < 5; rp++) {
            B.box('red', x0 - W / 2 + 0.2 + rp * (W - 0.4) / 4, y0 + 0.55, -D / 2 - 1.42, 0.09, 0.9, 0.09);
          }
        }

        if (Math.random() < 0.2) {
          // closed room: the shoji are drawn, light behind them
          B.box('shoji', x0, y0 + 0.2 + (H - 0.75) / 2, -D / 2 + 0.12, W - 0.4, H - 0.75, 0.06,
            { u: Math.round(W / 1.6), t: rnd(0.65, 0.95) });
          continue;
        }

        B.box('wood', x0, y0 + H - 0.65, 0, 0.03, 0.5, 0.03, { t: 0.3 });
        B.cyl('lantern', x0, y0 + H - 1.2, 0, 0.36, 0.36, 0.72, 12);

        var roll = Math.random();
        if (roll < 0.5) {
          var tx = x0 + rnd(-1.2, 1.2), tz = rnd(-0.8, 1.0);
          B.box('wood', tx, y0 + 0.62, tz, 1.7, 0.1, 1.05, { t: 0.5 });
          B.box('wood', tx - 0.75, y0 + 0.4, tz - 0.42, 0.08, 0.4, 0.08, { t: 0.35 });
          B.box('wood', tx + 0.75, y0 + 0.4, tz - 0.42, 0.08, 0.4, 0.08, { t: 0.35 });
          B.box('wood', tx - 0.75, y0 + 0.4, tz + 0.42, 0.08, 0.4, 0.08, { t: 0.35 });
          B.box('wood', tx + 0.75, y0 + 0.4, tz + 0.42, 0.08, 0.4, 0.08, { t: 0.35 });
          B.box('red', tx, y0 + 0.25, tz - 1.0, 0.62, 0.1, 0.62);
          B.box('red', tx, y0 + 0.25, tz + 1.0, 0.62, 0.1, 0.62);
        }
        if (Math.random() < 0.45) {
          var ax = x0 + W / 2 - 1.3;
          B.box('wood', ax, y0 + 0.36, D / 2 - 0.65, 2.1, 0.3, 1.0, { t: 0.55 });
          B.box('scroll', ax, y0 + 2.15, D / 2 - 0.13, 0.7, 2.1, 0.03);
          B.box('wood', ax - 1.1, y0 + H / 2, D / 2 - 0.65, 0.16, H, 0.16, { t: 0.7 });
        }
        if (Math.random() < 0.5) {
          var lx = x0 - W / 2 + 0.8;
          B.box('shoji', lx, y0 + 0.75, -D / 2 + 1.2, 0.45, 0.8, 0.45, { u: 0.4, t: 1 });
          B.box('wood', lx, y0 + 1.18, -D / 2 + 1.2, 0.5, 0.06, 0.5, { t: 0.3 });
        }
      }
    }
    B.box('wood', 0, -0.15, 0.4, totalW + 1, 0.3, D + 2.4, { t: 0.4, u: 6 });
    B.box('wood', 0, rows * H / 2, D / 2 + 0.2, totalW + 0.5, rows * H, 0.2, { t: 0.35, u: 6 });
    var rt = rows * H;
    B.box('wood', 0, rt + 0.1, 0, totalW + 0.6, 0.3, D + 0.4, { t: 0.35 });
    B.box('roof', 0, rt + 0.75, -0.4, totalW + 3.2, 0.5, D + 3.6, { u: cols * 3, rx: -0.12 });
    B.box('wood', 0, rt + 0.55, -D / 2 - 2.0, totalW + 3.3, 0.22, 0.16, { t: 0.3 });
    return B.build();
  }

  /* --- staircase with stringers and a red handrail --- */
  function makeStair(n) {
    var B = new Builder();
    var rise = 0.48, run = 0.72, wdt = 3;
    for (var i = 0; i < n; i++) {
      B.box('wood', 0, i * rise, -i * run, wdt, 0.12, run + 0.06, { t: 0.95, u: 1.5 });
      B.box('wood', 0, i * rise - rise / 2, -i * run + run / 2 - 0.02, wdt - 0.1, rise, 0.06, { t: 0.55, u: 1.5 });
    }
    var L = Math.sqrt(Math.pow(n * run, 2) + Math.pow(n * rise, 2)), ang = Math.atan2(rise, run);
    var mid = { y: (n - 1) * rise / 2, z: -(n - 1) * run / 2 };
    [-1, 1].forEach(function (sd) {
      B.box('wood', sd * (wdt / 2 + 0.1), mid.y - 0.3, mid.z, 0.2, 0.6, L, { rx: ang, t: 0.45, v: 4 });
      B.box('red', sd * (wdt / 2 + 0.1), mid.y + 0.95, mid.z, 0.11, 0.11, L, { rx: ang });
      for (var p = 0; p < n; p += 3) {
        B.box('red', sd * (wdt / 2 + 0.1), p * rise + 0.5, -p * run, 0.1, 1.0, 0.1);
      }
    });
    return B.build();
  }

  /* --- covered walkway (watari-rōka) --- */
  function makeWalkway(len, covered) {
    var B = new Builder();
    B.box('wood', 0, 0, 0, 3.2, 0.2, len, { t: 0.9, v: len / 2 });
    for (var z = -len / 2 + 1; z < len / 2; z += 4) {
      B.box('wood', 0, -0.35, z, 3.8, 0.3, 0.3, { t: 0.4 });
    }
    [-1, 1].forEach(function (sd) {
      B.box('red', sd * 1.55, 1.05, 0, 0.11, 0.11, len, {});
      B.box('red', sd * 1.55, 0.55, 0, 0.07, 0.07, len, {});
      for (var z2 = -len / 2; z2 <= len / 2; z2 += 3) {
        B.box('red', sd * 1.55, 0.55, z2, 0.11, 1.0, 0.11);
        B.box('gold', sd * 1.55, 1.18, z2, 0.17, 0.17, 0.17);
        if (covered) B.box('wood', sd * 1.55, 2.2, z2, 0.2, 4.2, 0.2, { t: 0.5 });
      }
    });
    if (covered) {
      B.box('wood', 0, 4.3, 0, 3.6, 0.2, len, { t: 0.4 });
      B.frustum('roof', 0, 4.75, 0, 0.3, 2.6, 0.8, { u: 8, v: 1 });
      B.box('roof', 0, 4.65, 0, 4.6, 0.25, len + 1, { t: 0.95, u: 2, v: len / 3 });
      for (var lz = -len / 2 + 2; lz < len / 2; lz += 6) {
        B.cyl('lantern', 0, 3.6, lz, 0.28, 0.28, 0.6, 10);
      }
    }
    return B.build();
  }

  /* --- torii --- */
  function makeGate(s) {
    var B = new Builder();
    var px = s * 0.85;
    [-1, 1].forEach(function (sd) {
      B.cyl('red', sd * px, s, 0, 0.3, 0.36, s * 2, 14);
      B.cyl('wood', sd * px, 0.25, 0, 0.45, 0.45, 0.5, 14, { t: 0.18 });
      B.box('wood', sd * (s * 1.25), s * 2 + 0.42, 0, 0.9, 0.3, 0.66, { rz: sd * 0.32, t: 0.15 });
    });
    B.box('wood', 0, s * 2 + 0.2, 0, s * 2.5, 0.42, 0.66, { t: 0.15 });
    B.box('red', 0, s * 2 - 0.25, 0, s * 2.3, 0.42, 0.5);
    B.box('red', 0, s * 2 - 1.35, 0, s * 2.15, 0.34, 0.3);
    B.box('red', 0, s * 2 - 0.82, 0, 0.3, 0.75, 0.25);
    B.box('gold', 0, s * 2 - 0.85, -0.16, 0.75, 1.0, 0.06);
    return B.build();
  }

  /* --- giant hall pillar with bracket sets (tokyō) --- */
  function makePillar(len) {
    var B = new Builder();
    B.cyl('wood', 0, 0, 0, 1.0, 1.0, len, 14, { t: 0.8, u: 3, v: len / 6 });
    for (var y = -len / 2 + 12; y < len / 2; y += 26) {
      B.box('wood', 0, y, 0, 2.7, 0.7, 2.7, { t: 0.45 });
      B.box('wood', 0, y + 0.6, 0, 6.5, 0.45, 0.6, { t: 0.55 });
      B.box('wood', 0, y + 0.6, 0, 0.6, 0.45, 6.5, { t: 0.55 });
      B.box('wood', 0, y + 1.05, 0, 3.4, 0.4, 3.4, { t: 0.4 });
      B.box('gold', 0, y - 0.45, 0, 2.2, 0.16, 2.2);
    }
    return B.build();
  }

  /* --- long timber beam with joinery blocks --- */
  function makeBeam(len) {
    var B = new Builder();
    B.box('wood', 0, 0, 0, 0.9, 1.1, len, { t: 0.7, v: len / 4 });
    for (var z = -len / 2 + 3; z < len / 2; z += 9) {
      B.box('wood', 0, 0, z, 1.15, 1.35, 0.5, { t: 0.4 });
      B.box('gold', 0, 0.7, z, 0.5, 0.06, 0.55);
    }
    return B.build();
  }

  /* ---------------- THE ENDLESS CASTLE ---------------- */
  function start() {
    document.body.classList.add('world-live');
    _m = new THREE.Matrix4(); _q = new THREE.Quaternion(); _e = new THREE.Euler();
    _p = new THREE.Vector3(); _s = new THREE.Vector3(1, 1, 1);

    var scene = new THREE.Scene();
    var VOID = 0x0b0714;
    scene.background = new THREE.Color(VOID);
    scene.fog = new THREE.Fog(VOID, 40, isCoarse ? 200 : 290);

    var camera = new THREE.PerspectiveCamera(66, window.innerWidth / window.innerHeight, 0.1, 900);

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: !isCoarse, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isCoarse ? 1.5 : 1.75));
    maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 4);

    /* ---- light: warm key, cool rim, and a lantern that travels with you ---- */
    scene.add(new THREE.HemisphereLight(0xffd3a0, 0x2c1a44, 0.85));
    var key = new THREE.DirectionalLight(0xffb071, 0.95);
    key.position.set(0.5, 1, 0.35); scene.add(key);
    var rim = new THREE.DirectionalLight(0x8a7cff, 0.4);
    rim.position.set(-0.6, -0.35, -0.6); scene.add(rim);
    var carry = new THREE.PointLight(0xffa452, 1.6, 80, 1.4);
    scene.add(carry);

    /* ---- materials ---- */
    var Lit = isCoarse ? THREE.MeshLambertMaterial : THREE.MeshPhongMaterial;
    function litMat(opts) {
      if (!isCoarse) { opts.specular = opts.specular || 0x1c130b; opts.shininess = opts.shininess || 14; }
      opts.vertexColors = true;
      return new Lit(opts);
    }
    var tWood = woodTex(), tTatami = tatamiTex();
    MATS.wood = litMat({ map: tWood, color: 0xffffff });
    MATS.roof = litMat({ map: roofTex(), color: 0xc8c8d2, shininess: 30, specular: 0x2a2a35 });
    MATS.stone = litMat({ map: stoneTex(), color: 0xf0e6dc });
    MATS.tatami = litMat({ map: tTatami, color: 0xb8b090, emissive: 0x30260e, emissiveMap: tTatami });
    MATS.red = litMat({ color: 0xb8302a, emissive: 0x2a0705, shininess: 40, specular: 0x3a1a10 });
    MATS.gold = litMat({ color: 0xe0ac4a, emissive: 0x3d2408, shininess: 60, specular: 0x8a6a30 });
    MATS.shoji = new THREE.MeshBasicMaterial({ map: shojiTex(), vertexColors: true });
    MATS.fusuma = new THREE.MeshBasicMaterial({ map: fusumaTex(), vertexColors: true, color: 0xe6d2a8 });
    MATS.scroll = new THREE.MeshBasicMaterial({ map: scrollTex(), color: 0xd9c9a6 });
    MATS.lantern = new THREE.MeshBasicMaterial({ map: lanternTex(), vertexColors: true });
    MATS.silh = new THREE.MeshBasicMaterial({ color: 0x150e17 });

    /* ---- prototypes: build each design once, clone (shares geometry) ---- */
    var P = {
      towers: [makeTower(5, 14), makeTower(4, 12), makeTower(6, 16), makeTower(3, 11)],
      rooms: [makeRooms(4, 3), makeRooms(3, 2), makeRooms(2, 4), makeRooms(5, 2), makeRooms(3, 3)],
      stairs: [makeStair(16), makeStair(24)],
      walks: [makeWalkway(30, true), makeWalkway(24, false), makeWalkway(40, true)],
      gates: [makeGate(5.5), makeGate(7)],
      pillars: [makePillar(170)],
      beams: [makeBeam(60), makeBeam(42)],
      far: [makeTower(5, 26, true), makeTower(7, 32, true), makeTower(4, 22, true)]
    };

    /* ---------- flight state (needed by spawners) ---------- */
    var pos = new THREE.Vector3(0, 0, 26);   // camera position, accumulated
    var dir = new THREE.Vector3(0, 0, -1);   // current flight direction
    var yaw = 0, pitch = 0;
    var TOTAL_DIST = 760;                    // world units for a full dive

    var UP = new THREE.Vector3(0, 1, 0);
    var right = new THREE.Vector3(), upv = new THREE.Vector3(), tmpV = new THREE.Vector3();
    function basis() {
      right.crossVectors(dir, UP);
      if (right.lengthSq() < 1e-4) right.set(1, 0, 0);
      right.normalize();
      upv.crossVectors(right, dir).normalize();
    }

    // place an object ahead of the flight, spread across the view plane
    function placeAhead(obj, o) {
      basis();
      var ahead = o.near + Math.random() * (o.far - o.near);
      var ox, oy, tries = 0;
      do {
        ox = (Math.random() * 2 - 1) * o.spread;
        oy = (Math.random() * 2 - 1) * o.spread * (o.flat || 1);
        tries++;
      } while (Math.sqrt(ox * ox + oy * oy) < (o.minLat || 0) && tries < 10);
      obj.position.copy(pos).addScaledVector(dir, ahead).addScaledVector(right, ox).addScaledVector(upv, oy);

      if (o.faceCam) {
        // the open side (-z) turns toward you, so you look INTO the rooms
        tmpV.copy(obj.position).multiplyScalar(2).sub(pos);
        obj.up.copy(upv);
        obj.lookAt(tmpV);
        obj.rotateY(rnd(-0.45, 0.45));
        if (Math.random() < 0.18) obj.rotateZ(Math.PI);      // the castle doesn't care which way is up
      } else if (o.face) {
        obj.up.copy(upv);
        obj.lookAt(obj.position.x + dir.x, obj.position.y + dir.y, obj.position.z + dir.z);
        obj.rotateZ(rnd(-0.1, 0.1));
      } else if (o.free) {
        obj.rotation.set(rnd(-Math.PI, Math.PI), rnd(-Math.PI, Math.PI), rnd(-Math.PI, Math.PI));
      } else {
        obj.rotation.set(rnd(-o.tilt, o.tilt), Math.random() * Math.PI * 2, rnd(-o.tilt, o.tilt));
        if (o.flip && Math.random() < o.flip) obj.rotation.z += Math.PI;
      }
    }

    var relV = new THREE.Vector3();
    function needsRecycle(obj, behind, maxDist) {
      relV.copy(obj.position).sub(pos);
      if (relV.dot(dir) < -behind - (obj.userData.radius || 0)) return true;
      return relV.length() > maxDist;
    }

    /* ---- populations ---- */
    var groups = [];
    function populate(protos, count, opts, behind, maxDist, seedBehind) {
      var list = [];
      for (var i = 0; i < count; i++) {
        var obj = protos[i % protos.length].clone();
        obj.userData.radius = protos[i % protos.length].userData.radius;
        placeAhead(obj, opts);
        if (seedBehind && i % 3 === 0) obj.position.addScaledVector(dir, -rnd(10, 60));
        scene.add(obj);
        list.push(obj);
      }
      groups.push({ list: list, opts: opts, behind: behind, max: maxDist });
      return list;
    }

    var N = isCoarse ? 0.55 : 1;
    var roomList = populate(P.rooms, Math.round(22 * N), { near: 16, far: 240, spread: 60, minLat: 11, faceCam: true }, 40, 330, true);
    populate(P.towers, Math.round(14 * N), { near: 40, far: 320, spread: 120, minLat: 26, tilt: 0.35, flip: 0.2 }, 60, 380, true);
    populate(P.stairs, Math.round(12 * N), { near: 20, far: 240, spread: 55, minLat: 9, tilt: 0.6 }, 30, 300);
    populate(P.walks, Math.round(10 * N), { near: 25, far: 260, spread: 60, minLat: 10, tilt: 0.5 }, 40, 300);
    populate(P.pillars, Math.round(9 * N), { near: 30, far: 300, spread: 90, minLat: 18, tilt: 0.08 }, 90, 360);
    populate(P.beams, Math.round(12 * N), { near: 30, far: 260, spread: 70, minLat: 10, free: true }, 40, 300);
    populate(P.gates, 4, { near: 60, far: 240, spread: 6, minLat: 0, face: true }, 16, 280);
    var towerList = groups[1].list;
    populate(P.far, isCoarse ? 4 : 8, { near: 240, far: 520, spread: 260, minLat: 80, tilt: 0.3, flip: 0.3 }, 100, 700);

    // the opening view: a wall of lit rooms ahead-left, a keep to the right,
    // so the first thing you see is the inside of the castle
    function stage(obj, ahead, side, lift) {
      basis();
      obj.position.copy(pos).addScaledVector(dir, ahead).addScaledVector(right, side).addScaledVector(upv, lift);
      tmpV.copy(obj.position).multiplyScalar(2).sub(pos);
      obj.up.set(0, 1, 0);
      obj.lookAt(tmpV);
    }
    stage(roomList[0], 30, -15, -2);
    roomList[0].rotateY(0.35);
    stage(roomList[1], 48, 17, 9);
    roomList[1].rotateY(-0.3);
    towerList[0].position.copy(pos).addScaledVector(dir, 95).addScaledVector(right, 42).addScaledVector(upv, -18);
    towerList[0].rotation.set(0, 0.5, 0);

    /* ---- floating lanterns with a soft halo ---- */
    var lanGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.95, 14, 1, false);
    var lanMat = new THREE.MeshBasicMaterial({ map: lanternTex() });
    var haloMat = new THREE.SpriteMaterial({
      map: glowTex(), color: 0xffb466, transparent: true, opacity: 0.7,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: true
    });
    var lanterns = [];
    var LAN_OPTS = { near: 10, far: 220, spread: 42, minLat: 4, tilt: 0.15 };
    for (var L = 0; L < (isCoarse ? 26 : 48); L++) {
      var lg = new THREE.Group();
      lg.add(new THREE.Mesh(lanGeo, lanMat));
      var halo = new THREE.Sprite(haloMat); halo.scale.set(4.2, 4.2, 1);
      lg.add(halo);
      placeAhead(lg, LAN_OPTS);
      lg.userData = { ph: Math.random() * Math.PI * 2, sp: 0.4 + Math.random() * 0.8, radius: 1 };
      scene.add(lg);
      lanterns.push(lg);
    }

    /* ---- embers + cool dust, recycled per-particle ---- */
    function makeCloud(count, color, size, opacity, spread) {
      var arr = new Float32Array(count * 3);
      for (var e = 0; e < count; e++) {
        arr[e * 3] = pos.x + (Math.random() * 2 - 1) * spread;
        arr[e * 3 + 1] = pos.y + (Math.random() * 2 - 1) * spread;
        arr[e * 3 + 2] = pos.z - Math.random() * 300;
      }
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      var pts = new THREE.Points(geo, new THREE.PointsMaterial({
        color: color, size: size, sizeAttenuation: true,
        transparent: true, opacity: opacity, depthWrite: false,
        blending: THREE.AdditiveBlending
      }));
      scene.add(pts);
      return { pts: pts, arr: arr, count: count, spread: spread };
    }
    var embers = makeCloud(isCoarse ? 450 : 900, 0xffa04a, 0.3, 0.85, 55);
    var dust = makeCloud(isCoarse ? 250 : 550, 0x8070b8, 0.2, 0.45, 90);

    function recycleCloud(c) {
      var a = c.arr;
      for (var k = 0; k < c.count; k++) {
        relV.set(a[k * 3] - pos.x, a[k * 3 + 1] - pos.y, a[k * 3 + 2] - pos.z);
        if (relV.dot(dir) < -20 || relV.length() > 330) {
          var ahead = 40 + Math.random() * 240;
          a[k * 3] = pos.x + dir.x * ahead + (Math.random() * 2 - 1) * c.spread;
          a[k * 3 + 1] = pos.y + dir.y * ahead + (Math.random() * 2 - 1) * c.spread;
          a[k * 3 + 2] = pos.z + dir.z * ahead + (Math.random() * 2 - 1) * 20;
        }
      }
      c.pts.geometry.attributes.position.needsUpdate = true;
    }

    /* ---------------- scroll + cursor ---------------- */
    var targetP = 0, curP = 0, prevP = 0;
    function maxScroll() { return Math.max(document.body.scrollHeight - window.innerHeight, 1); }
    window.addEventListener('scroll', function () {
      targetP = Math.min(Math.max(window.scrollY / maxScroll(), 0), 1);
    }, { passive: true });

    var mx = 0, my = 0, cmx = 0, cmy = 0;
    window.addEventListener('pointermove', function (ev) {
      mx = ev.clientX / window.innerWidth - 0.5;
      my = ev.clientY / window.innerHeight - 0.5;
    }, { passive: true });

    /* ---------------- HUD ---------------- */
    var miles = [].map.call(document.querySelectorAll('.mile'), function (el) {
      return {
        el: el,
        c: parseFloat(el.dataset.at),
        w: parseFloat(el.dataset.w || '0.12'),
        focus: el.dataset.focus === '1'
      };
    });
    var bar = document.getElementById('bar');
    var hint = document.getElementById('hint');
    var speedFx = document.getElementById('speedfx');
    var focusFx = document.getElementById('focusfx');

    window.addEventListener('resize', function () {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    /* ---------------- MAIN LOOP ---------------- */
    var fovCur = 66, lastBlur = -1, lastFocus = -1, time0 = performance.now();
    var frame = 0;

    function tick() {
      requestAnimationFrame(tick);
      var t = (performance.now() - time0) / 1000;
      frame++;

      prevP = curP;
      curP += (targetP - curP) * (reduce ? 0.2 : 0.065);
      var dp = curP - prevP;
      var vel = Math.abs(dp);

      /* --- 360° STEERING ---
         Habang malayo ang cursor sa gitna, tuloy-tuloy ang pag-ikot ng
         tingin. Cursor sa gitna = derecho lang. */
      cmx += (mx - cmx) * 0.07;
      cmy += (my - cmy) * 0.07;
      var dead = 0.045;
      var ox = Math.abs(cmx) > dead ? cmx - dead * (cmx > 0 ? 1 : -1) : 0;
      var oy = Math.abs(cmy) > dead ? cmy - dead * (cmy > 0 ? 1 : -1) : 0;
      yaw += ox * 0.052;
      pitch += -oy * 0.036;
      if (pitch > 1.25) pitch = 1.25;
      if (pitch < -1.25) pitch = -1.25;
      dir.set(
        Math.sin(yaw) * Math.cos(pitch),
        Math.sin(pitch),
        -Math.cos(yaw) * Math.cos(pitch)
      );

      pos.addScaledVector(dir, dp * TOTAL_DIST);

      camera.position.copy(pos);
      camera.lookAt(pos.x + dir.x * 14, pos.y + dir.y * 14, pos.z + dir.z * 14);
      camera.rotation.z += -ox * 0.5;

      // the lantern you carry: a little ahead, flickering
      carry.position.copy(pos).addScaledVector(dir, 6);
      carry.intensity = 1.4 + Math.sin(t * 7.3) * 0.06 + Math.sin(t * 13.1) * 0.04;

      var fovT = 66 + Math.min(26, vel * 5200);
      fovCur += (fovT - fovCur) * 0.12;
      if (Math.abs(camera.fov - fovCur) > 0.05) {
        camera.fov = fovCur;
        camera.updateProjectionMatrix();
      }

      if (!reduce) {
        var blurPx = Math.min(2.2, vel * 560);
        if (Math.abs(blurPx - lastBlur) > 0.15) {
          canvas.style.filter = blurPx > 0.3 ? 'blur(' + blurPx.toFixed(2) + 'px)' : '';
          lastBlur = blurPx;
        }
        if (speedFx) speedFx.style.opacity = Math.min(0.85, vel * 260);
      }

      /* --- endless castle: recycle around the flight, staggered --- */
      var mod = frame % 3;
      if (mod === 2) {
        recycleCloud(embers);
        recycleCloud(dust);
      } else {
        for (var gi = mod; gi < groups.length; gi += 2) {
          var G = groups[gi];
          for (var n = 0; n < G.list.length; n++) {
            if (needsRecycle(G.list[n], G.behind, G.max)) placeAhead(G.list[n], G.opts);
          }
        }
      }

      for (var li = 0; li < lanterns.length; li++) {
        var ln = lanterns[li];
        ln.position.y += Math.sin(t * ln.userData.sp + ln.userData.ph) * 0.006;
        ln.rotation.y = t * 0.4 + ln.userData.ph;
        if (needsRecycle(ln, 25, 260)) placeAhead(ln, LAN_OPTS);
      }

      /* --- milestone texts + built-in focus lens --- */
      var focusO = 0;
      for (var j = 0; j < miles.length; j++) {
        var m = miles[j];
        var o = Math.max(0, 1 - Math.abs(curP - m.c) / m.w);
        o = o * o * (3 - 2 * o);
        m.el.style.opacity = o;
        m.el.style.transform = 'translate(-50%,-50%) translateY(' + ((1 - o) * 26) + 'px) scale(' + (0.94 + o * 0.06) + ')';
        m.el.style.pointerEvents = o > 0.55 ? 'auto' : 'none';
        if (m.focus && o > focusO) focusO = o;
      }
      if (focusFx && Math.abs(focusO - lastFocus) > 0.02) {
        focusFx.style.opacity = focusO;
        lastFocus = focusO;
      }

      if (bar) bar.style.width = (curP * 100) + '%';
      if (hint) hint.style.opacity = curP > 0.02 ? 0 : 0.65;

      renderer.render(scene, camera);
    }
    tick();

    /* ---------------- dock: sound + volume knob ---------------- */
    var soundBtn = document.getElementById('btnSound');
    var volWrap = document.getElementById('volwrap');
    var volInput = document.getElementById('vol');
    var savedVol = parseInt(store.get('jjVol') || '55', 10);
    if (isNaN(savedVol)) savedVol = 55;
    if (volInput) volInput.value = savedVol;
    Sound.initVol(Math.max(0, Math.min(1, savedVol / 100)));

    if (soundBtn) {
      soundBtn.addEventListener('click', function () {
        var on = Sound.toggle();
        soundBtn.textContent = on ? '🔊' : '🔇';
        soundBtn.classList.toggle('off', !on);
        if (volWrap) volWrap.classList.toggle('show', on);
      });
    }
    if (volInput) {
      volInput.addEventListener('input', function () {
        Sound.setVol(Math.max(0, Math.min(1, volInput.value / 100)));
      });
    }

    [].forEach.call(document.querySelectorAll('.door, .navlink'), function (el) {
      el.addEventListener('mouseenter', function () { Sound.tick(); });
    });
  }

  // handa na lahat — simulan ang mundo
  launch();
})();
