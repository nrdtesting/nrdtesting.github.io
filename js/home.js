/* ============================================================
   JJ · HOME WORLD v2 — "Ang Kastilyo, walang hangganan"
   - TRUE cursor steering: scrolling flies you TOWARD the cursor.
     The flight path curves; look right + scroll = dive right.
   - Endless castle: structures recycle around the camera in a
     huge volume, so the world never ends in any direction.
   - Focus lens is baked into milestones (data-focus="1"):
     the world blurs, the text stays sharp. No toggle needed.
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
    var beatTimer = null, stingTimer = null, noiseBuf = null, beatFlip = false;

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
      // the stick hitting the drum skin
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
    function heartbeat() {   // (keeps the old name so the wiring stays simple)
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
          // far-off battle rumble
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
        if (on) { heartbeat(); sting(); }
        else { clearTimeout(beatTimer); clearTimeout(stingTimer); }
        return on;
      }
    };
  })();

  /* ---------------- THE ENDLESS WORLD ---------------- */
  function start() {
    document.body.classList.add('world-live');

    var scene = new THREE.Scene();
    var VOID = 0x0b0714;
    scene.background = new THREE.Color(VOID);
    scene.fog = new THREE.Fog(VOID, 24, isCoarse ? 160 : 230);

    var camera = new THREE.PerspectiveCamera(66, window.innerWidth / window.innerHeight, 0.1, 900);

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: !isCoarse });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));

    /* ---- window textures ---- */
    function windowTexture(litRatio, warm) {
      var cv = document.createElement('canvas');
      cv.width = 128; cv.height = 256;
      var g = cv.getContext('2d');
      g.fillStyle = warm ? '#221410' : '#1a1010';
      g.fillRect(0, 0, 128, 256);
      var cols = 3 + Math.floor(Math.random() * 2);
      var rows = 7 + Math.floor(Math.random() * 4);
      var cw = 128 / cols, rh = 256 / rows;
      for (var x = 0; x < cols; x++) {
        for (var y = 0; y < rows; y++) {
          var pad = 5;
          if (Math.random() < litRatio) {
            var warmth = Math.random();
            g.fillStyle = warmth > 0.75 ? '#ffe9c4' : (warmth > 0.35 ? '#ffb24d' : '#ff8f33');
            g.fillRect(x * cw + pad, y * rh + pad, cw - pad * 2, rh - pad * 2);
            g.fillStyle = 'rgba(255,170,80,0.18)';
            g.fillRect(x * cw + 1, y * rh + 1, cw - 2, rh - 2);
          } else {
            g.fillStyle = '#0e0a0a';
            g.fillRect(x * cw + pad, y * rh + pad, cw - pad * 2, rh - pad * 2);
          }
        }
      }
      var tex = new THREE.CanvasTexture(cv);
      tex.anisotropy = 2;
      return tex;
    }

    var wallTexes = [];
    for (var wt = 0; wt < 6; wt++) wallTexes.push(windowTexture(0.35 + Math.random() * 0.4, wt % 2 === 0));
    var roofMat = new THREE.MeshBasicMaterial({ color: 0x0f0a09 });
    var beamMat = new THREE.MeshBasicMaterial({ color: 0x241610 });
    var beamEdge = new THREE.LineBasicMaterial({ color: 0x6e4519, transparent: true, opacity: 0.45 });
    var gateMat = new THREE.MeshBasicMaterial({ color: 0xc73e3a });
    var silhMat = new THREE.MeshBasicMaterial({ color: 0x120c14 });

    /* ---------- flight state (needed by spawners) ---------- */
    var pos = new THREE.Vector3(0, 0, 26);   // camera position, accumulated
    var dir = new THREE.Vector3(0, 0, -1);   // current flight direction
    var yaw = 0, pitch = 0;                  // 360°: walang hangganan ang lingon
    var TOTAL_DIST = 760;                    // world units for a full dive

    // place an object somewhere ahead of the flight, in a WIDE volume
    var tmpV = new THREE.Vector3();
    function placeAhead(obj, opts) {
      var ahead = opts.near + Math.random() * (opts.far - opts.near);
      tmpV.copy(pos).addScaledVector(dir, ahead);
      var ox, oy, tries = 0;
      do {
        ox = (Math.random() * 2 - 1) * opts.spread;
        oy = (Math.random() * 2 - 1) * opts.spread;
        tries++;
      } while (Math.sqrt(ox * ox + oy * oy) < (opts.minLat || 0) && tries < 8);
      obj.position.set(tmpV.x + ox, tmpV.y + oy, tmpV.z + (Math.random() * 30 - 15));
      if (opts.face) {
        obj.lookAt(obj.position.x + dir.x, obj.position.y + dir.y, obj.position.z + dir.z);
        obj.rotateZ((Math.random() - 0.5) * 0.2);
      } else {
        obj.rotation.set(
          opts.tilt ? (Math.random() - 0.5) * 0.6 : 0,
          Math.random() * Math.PI,
          opts.tilt ? (Math.random() - 0.5) * 0.9 : 0
        );
      }
    }

    // recycle when behind the camera or too far away
    var relV = new THREE.Vector3();
    function needsRecycle(obj, behind, maxDist) {
      relV.copy(obj.position).sub(pos);
      var along = relV.dot(dir);
      if (along < -behind) return true;
      if (relV.length() > maxDist) return true;
      return false;
    }

    /* ---- pavilions: the castle itself, everywhere ---- */
    var pavCount = isCoarse ? 40 : 72;
    var pavilions = [];
    var PAV_OPTS = { near: 20, far: 300, spread: 85, minLat: 10, tilt: true };
    for (var i = 0; i < pavCount; i++) {
      var w = 3 + Math.random() * 5;
      var h = 8 + Math.random() * 24;
      var d = 3 + Math.random() * 5;
      var tex = wallTexes[Math.floor(Math.random() * wallTexes.length)];
      var wall = new THREE.MeshBasicMaterial({ map: tex });
      var box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [wall, wall, roofMat, roofMat, wall, wall]);
      box.add(new THREE.LineSegments(
        new THREE.EdgesGeometry(box.geometry),
        new THREE.LineBasicMaterial({ color: 0x8a5a26, transparent: true, opacity: 0.5 })
      ));
      placeAhead(box, PAV_OPTS);
      // seed some BEHIND-ish / around so the world starts full
      if (i % 3 === 0) box.position.z += 120;
      scene.add(box);
      pavilions.push(box);
    }

    /* ---- giant far silhouettes: scale of an endless castle ---- */
    var silhs = [];
    var SILH_OPTS = { near: 220, far: 520, spread: 240, minLat: 60, tilt: true };
    for (var si = 0; si < (isCoarse ? 6 : 12); si++) {
      var sw = 24 + Math.random() * 40;
      var sh = 60 + Math.random() * 140;
      var sBox = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sw), silhMat);
      placeAhead(sBox, SILH_OPTS);
      scene.add(sBox);
      silhs.push(sBox);
    }

    /* ---- crossing beams ---- */
    var beams = [];
    var BEAM_OPTS = { near: 30, far: 260, spread: 60, minLat: 7, tilt: true };
    for (var b = 0; b < (isCoarse ? 16 : 30); b++) {
      var len = 26 + Math.random() * 46;
      var beam = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, len), beamMat);
      beam.add(new THREE.LineSegments(new THREE.EdgesGeometry(beam.geometry), beamEdge));
      placeAhead(beam, BEAM_OPTS);
      beam.rotation.set((Math.random() - 0.5) * 1.4, (Math.random() - 0.5) * 1.4, Math.random() * Math.PI);
      scene.add(beam);
      beams.push(beam);
    }

    /* ---- red gates on the flight path ---- */
    var gates = [];
    var GATE_OPTS = { near: 60, far: 240, spread: 5, minLat: 0, face: true };
    function makeGate(size) {
      var gGroup = new THREE.Group();
      var t = 0.55;
      var top = new THREE.Mesh(new THREE.BoxGeometry(size * 2.3, t, t), gateMat);
      top.position.y = size;
      var top2 = new THREE.Mesh(new THREE.BoxGeometry(size * 2.0, t * 0.8, t * 0.8), gateMat);
      top2.position.y = size - 1.1;
      var left = new THREE.Mesh(new THREE.BoxGeometry(t, size * 2, t), gateMat);
      left.position.x = -size * 0.85;
      var right = left.clone(); right.position.x = size * 0.85;
      gGroup.add(top, top2, left, right);
      return gGroup;
    }
    for (var gi = 0; gi < 5; gi++) {
      var gt = makeGate(5.5 + Math.random() * 2.5);
      placeAhead(gt, GATE_OPTS);
      scene.add(gt);
      gates.push(gt);
    }

    /* ---- lanterns ---- */
    var lanternGeo = new THREE.OctahedronGeometry(0.42, 0);
    var lanternMat = new THREE.MeshBasicMaterial({ color: 0xffc46b });
    var lanterns = [];
    var LAN_OPTS = { near: 10, far: 220, spread: 40, minLat: 3 };
    for (var L = 0; L < (isCoarse ? 30 : 52); L++) {
      var lm = new THREE.Mesh(lanternGeo, lanternMat);
      placeAhead(lm, LAN_OPTS);
      lm.userData = { ph: Math.random() * Math.PI * 2, sp: 0.4 + Math.random() * 0.8 };
      scene.add(lm);
      lanterns.push(lm);
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
        transparent: true, opacity: opacity, depthWrite: false
      }));
      scene.add(pts);
      return { pts: pts, arr: arr, count: count, spread: spread };
    }
    var embers = makeCloud(isCoarse ? 450 : 900, 0xffa04a, 0.34, 0.8, 55);
    var dust = makeCloud(isCoarse ? 250 : 550, 0x6b5a9e, 0.22, 0.5, 90);

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
      var dp = curP - prevP;              // signed scroll step
      var vel = Math.abs(dp);

      /* --- 360° STEERING ---
         Habang malayo ang cursor sa gitna, TULOY-TULOY ang pag-ikot ng
         tingin (parang flight sim). Walang limit ang yaw, kaya kaya mong
         umikot nang buo, lumingon paatras, at mag-zoom kahit saan ka
         nakatingin. Cursor sa gitna = derecho lang. */
      cmx += (mx - cmx) * 0.07;
      cmy += (my - cmy) * 0.07;
      var dead = 0.045;
      var ox = Math.abs(cmx) > dead ? cmx - dead * (cmx > 0 ? 1 : -1) : 0;
      var oy = Math.abs(cmy) > dead ? cmy - dead * (cmy > 0 ? 1 : -1) : 0;
      yaw += ox * 0.052;
      pitch += -oy * 0.036;
      if (pitch > 1.25) pitch = 1.25;      // huwag lang tuluyang baliktad
      if (pitch < -1.25) pitch = -1.25;
      dir.set(
        Math.sin(yaw) * Math.cos(pitch),
        Math.sin(pitch),
        -Math.cos(yaw) * Math.cos(pitch)
      );

      // move along wherever you're looking; scroll up flies you back
      pos.addScaledVector(dir, dp * TOTAL_DIST);

      camera.position.copy(pos);
      camera.lookAt(pos.x + dir.x * 14, pos.y + dir.y * 14, pos.z + dir.z * 14);
      camera.rotation.z += -ox * 0.5;      // bank into the turn

      // speed → FOV rush
      var fovT = 66 + Math.min(26, vel * 5200);
      fovCur += (fovT - fovCur) * 0.12;
      if (Math.abs(camera.fov - fovCur) > 0.05) {
        camera.fov = fovCur;
        camera.updateProjectionMatrix();
      }

      // speed → motion blur + streaks
      if (!reduce) {
        var blurPx = Math.min(2.6, vel * 640);
        if (Math.abs(blurPx - lastBlur) > 0.15) {
          canvas.style.filter = blurPx > 0.25 ? 'blur(' + blurPx.toFixed(2) + 'px)' : '';
          lastBlur = blurPx;
        }
        if (speedFx) speedFx.style.opacity = Math.min(0.85, vel * 260);
      }

      /* --- endless world: recycle everything around the flight --- */
      // stagger the checks across frames so no frame does all the work
      var mod = frame % 3;
      if (mod === 0) {
        for (var p1 = 0; p1 < pavilions.length; p1++) {
          if (needsRecycle(pavilions[p1], 30, 340)) placeAhead(pavilions[p1], PAV_OPTS);
        }
        for (var s1 = 0; s1 < silhs.length; s1++) {
          if (needsRecycle(silhs[s1], 80, 700)) placeAhead(silhs[s1], SILH_OPTS);
        }
      } else if (mod === 1) {
        for (var b1 = 0; b1 < beams.length; b1++) {
          if (needsRecycle(beams[b1], 30, 300)) placeAhead(beams[b1], BEAM_OPTS);
        }
        for (var g1 = 0; g1 < gates.length; g1++) {
          if (needsRecycle(gates[g1], 16, 280)) placeAhead(gates[g1], GATE_OPTS);
        }
      } else {
        recycleCloud(embers);
        recycleCloud(dust);
      }

      // little life
      for (var li = 0; li < lanterns.length; li++) {
        var ln = lanterns[li];
        ln.position.y += Math.sin(t * ln.userData.sp + ln.userData.ph) * 0.006;
        ln.rotation.y = t * 0.6 + ln.userData.ph;
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
