// ===================================
// Wave Canvas - Interactive Background
// ===================================
const initWaveCanvas = () => {
  const canvas = document.getElementById('waveCanvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const waves = [];
  let animationId;
  
  // Set canvas size
  const resizeCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  // Wave class
  class Wave {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.radius = 0;
      this.maxRadius = Math.random() * 300 + 200;
      this.speed = Math.random() * 2 + 1;
      this.opacity = 1;
      this.color = `rgba(212, 175, 55, ${this.opacity})`;
    }
    
    update() {
      this.radius += this.speed;
      this.opacity = 1 - (this.radius / this.maxRadius);
      this.color = `rgba(212, 175, 55, ${this.opacity * 0.3})`;
      
      return this.radius < this.maxRadius;
    }
    
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  
  // Create wave on click
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Create multiple concentric waves
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        waves.push(new Wave(x, y));
      }, i * 150);
    }
  });
  
  // Also create waves on mouse move (throttled)
  let lastMoveTime = 0;
  canvas.addEventListener('mousemove', (e) => {
    const now = Date.now();
    if (now - lastMoveTime < 500) return; // Throttle to every 500ms
    lastMoveTime = now;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    waves.push(new Wave(x, y));
  });
  
  // Animation loop
  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let i = waves.length - 1; i >= 0; i--) {
      const wave = waves[i];
      const alive = wave.update();
      wave.draw();
      
      if (!alive) {
        waves.splice(i, 1);
      }
    }
    
    animationId = requestAnimationFrame(animate);
  };
  
  animate();
  
  // Cleanup
  return () => {
    cancelAnimationFrame(animationId);
  };
};

// ===================================
// Intro Animation
// ===================================
// Intro, audio and the liquid-gold canvas are handled by the
// "Landing v2" experience module at the bottom of this file.

// ===================================
// Reading Progress Bar (Thesis Page)
// ===================================
const progressBar = document.getElementById('readingProgress');

if (progressBar) {
  const updateProgress = () => {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    const scrollPercentage = (scrollTop / (documentHeight - windowHeight)) * 100;
    progressBar.style.width = `${Math.min(scrollPercentage, 100)}%`;
  };
  
  window.addEventListener('scroll', updateProgress);
  updateProgress(); // Initial call
}

const initChapterProgress = () => {
  if (!document.body.classList.contains('chapter-page')) return;

  const progress = document.createElement('div');
  progress.className = 'chapter-scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.appendChild(progress);

  const update = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const current = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
    progress.style.width = `${Math.min(current, 100)}%`;
  };

  window.addEventListener('scroll', update);
  window.addEventListener('resize', update);
  update();
};

initChapterProgress();

// ===================================
// Active Sidebar Link & Smooth Scroll
// ===================================
const sidebarLinks = document.querySelectorAll('.sidebar-link');
const outlineLinks = document.querySelectorAll('.outline-link');
const allNavLinks = [...sidebarLinks, ...outlineLinks];

// Hoisted so smooth scroll handler can reference it
const updateActiveSidebarLink = (clickedLink) => {
  allNavLinks.forEach(link => link.classList.remove('active'));
  if (clickedLink) clickedLink.classList.add('active');
};

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      const offset = 100;
      window.scrollTo({ top: target.offsetTop - offset, behavior: 'smooth' });
      updateActiveSidebarLink(this);
    }
  });
});

if (allNavLinks.length > 0) {
  const handleScrollSpy = () => {
    const sections = document.querySelectorAll('.content-section, .chapter-section');
    let currentSection = '';
    
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;
      
      if (window.pageYOffset >= sectionTop - 150) {
        currentSection = section.getAttribute('id');
      }
    });
    
    allNavLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${currentSection}`) {
        link.classList.add('active');
      }
    });
  };
  
  window.addEventListener('scroll', handleScrollSpy);
  handleScrollSpy(); // Initial call
}

// ===================================
// Staggered Animation for Cards
// ===================================
const observeCards = () => {
  const cards = document.querySelectorAll('.proposal-card, .info-card');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }, index * 100);
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '50px'
  });
  
  cards.forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(card);
  });
};

// Run animation after intro overlay
setTimeout(observeCards, 2600);

// ===================================
// Enhanced 3D Hover Effects for Proposal Cards
// ===================================
const proposalCards = document.querySelectorAll('.proposal-card:not(.placeholder-card)');

proposalCards.forEach(card => {
  card.addEventListener('mouseenter', function() {
    this.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
  });
  
  card.addEventListener('mousemove', function(e) {
    const rect = this.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = (y - centerY) / 30;
    const rotateY = (centerX - x) / 30;
    
    this.style.transform = `
      translateY(-8px) 
      perspective(1000px) 
      rotateX(${rotateX}deg) 
      rotateY(${rotateY}deg)
    `;
  });
  
  card.addEventListener('mouseleave', function() {
    this.style.transform = 'translateY(0) perspective(1000px) rotateX(0) rotateY(0)';
  });
});

// ===================================
// Parallax Scroll Effects
// ===================================
window.addEventListener('scroll', () => {
  const scrolled = window.pageYOffset;

  // Parallax for section numbers. (The hero label-badge keeps its CSS float
  // animation and gets cursor-driven 3D tilt instead — see Landing v2 module.)
  const sectionNumbers = document.querySelectorAll('.section-number');
  sectionNumbers.forEach(num => {
    const yPos = scrolled * 0.3;
    num.style.transform = `translateY(${yPos}px)`;
  });
});

// ===================================
// Social Link Hover Ripple Effect
// ===================================
const socialLinks = document.querySelectorAll('.social-link');

socialLinks.forEach(link => {
  link.addEventListener('mouseenter', function() {
    const ripple = document.createElement('span');
    ripple.classList.add('ripple');

    const rect = this.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);

    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${rect.width / 2 - size / 2}px`;
    ripple.style.top = `${rect.height / 2 - size / 2}px`;

    this.appendChild(ripple);

    setTimeout(() => ripple.remove(), 600);
  });
});

// ===================================
// Print Styles Handler
// ===================================
window.addEventListener('beforeprint', () => {
  // Hide interactive elements for printing
  const elementsToHide = document.querySelectorAll('.gradient-bg, #waveCanvas, .particles-bg');
  elementsToHide.forEach(el => el.style.display = 'none');
});

window.addEventListener('afterprint', () => {
  const elementsToShow = document.querySelectorAll('.gradient-bg, #waveCanvas, .particles-bg');
  elementsToShow.forEach(el => el.style.display = 'block');
});

// ===================================
// Keyboard Navigation Enhancement
// ===================================
document.addEventListener('keydown', (e) => {
  // Navigate between chapters with arrow keys
  if (document.body.classList.contains('chapter-page')) {
    if (e.key === 'ArrowLeft') {
      const prevBtn = document.querySelector('.prev-btn');
      if (prevBtn) prevBtn.click();
    } else if (e.key === 'ArrowRight') {
      const nextBtn = document.querySelector('.next-btn');
      if (nextBtn) nextBtn.click();
    }
  }
  
  // ESC to go back to home
  if (e.key === 'Escape') {
    const backBtn = document.querySelector('.nav-back');
    if (backBtn) backBtn.click();
  }
});

// ===================================
// Performance: Reduce Motion for Accessibility
// ===================================
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

if (prefersReducedMotion.matches) {
  // Disable animations for users who prefer reduced motion
  document.documentElement.style.setProperty('--transition-fast', '0s');
  document.documentElement.style.setProperty('--transition-base', '0s');
  document.documentElement.style.setProperty('--transition-slow', '0s');
  
  // Remove animation classes
  const animatedElements = document.querySelectorAll('[style*="animation"]');
  animatedElements.forEach(el => {
    el.style.animation = 'none';
  });
}

// ===================================
// Book/Page Reveal on Scroll
// ===================================
const initBookReveal = () => {
  if (prefersReducedMotion.matches) return;

  const revealSelectors = [
    '.landing-page .university-info',
    '.landing-page .proposal-section',
    '.landing-page .quick-links-section',
    '.landing-page .home-projects-section',
    '.landing-page .landing-footer',
    '.thesis-page .thesis-header',
    '.thesis-page .content-section',
    '.chapter-page .chapter-header',
    '.chapter-page .chapter-section',
    '.chapter-page .chapter-footer-nav'
  ];

  const revealItems = document.querySelectorAll(revealSelectors.join(','));
  if (revealItems.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        // Reveal once, then stop observing so the effect never replays.
        // (Re-removing 'is-visible' on scroll-out was causing sections to
        // re-tilt/blur, which looked like the slide above was "stuck".)
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.18,
    rootMargin: '0px 0px -8% 0px'
  });

  revealItems.forEach((item, index) => {
    item.classList.add('book-reveal');
    // Stagger only the items already in view on load; later items reveal
    // immediately when scrolled to, with no lingering delay.
    item.style.transitionDelay = `${Math.min(index * 35, 140)}ms`;
    observer.observe(item);
  });
};

initBookReveal();

// ===================================
// Dynamic Floating Particles for Chapter Pages
// ===================================
const initFloatingParticles = () => {
  const particlesBg = document.querySelector('.particles-bg');
  if (!particlesBg) return;
  
  // Create additional floating particles
  for (let i = 0; i < 8; i++) {
    const particle = document.createElement('div');
    particle.className = 'floating-particle';
    
    const size = Math.random() * 150 + 100;
    const delay = Math.random() * 20;
    const duration = Math.random() * 10 + 15;
    const startX = Math.random() * 100;
    const startY = Math.random() * 100;
    
    particle.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.08);
      filter: blur(40px);
      left: ${startX}%;
      top: ${startY}%;
      animation: float-particle ${duration}s ease-in-out ${delay}s infinite;
      pointer-events: none;
    `;
    
    particlesBg.appendChild(particle);
  }
};

// Initialize particles for chapter pages
if (document.body.classList.contains('chapter-page')) {
  initFloatingParticles();
}

// ===================================
// Scroll-triggered Animations
// ===================================
const animateOnScroll = () => {
  const elements = document.querySelectorAll('.chapter-page .definition-item, .chapter-page .question-item');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
  });
  
  elements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
    observer.observe(el);
  });
};

// Initialize scroll animations
setTimeout(() => {
  animateOnScroll();
}, 100);

// ===================================
// Easter Egg: Konami Code
// ===================================
const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let konamiIndex = 0;

document.addEventListener('keydown', (e) => {
  if (e.key === konamiCode[konamiIndex]) {
    konamiIndex++;
    if (konamiIndex === konamiCode.length) {
      triggerConfetti();
      konamiIndex = 0;
    }
  } else {
    konamiIndex = 0;
  }
});

function triggerConfetti() {
  // Simple confetti effect
  const colors = ['#d4af37', '#f5e6a8', '#8b7500', '#ffffff'];
  const confettiCount = 100;
  
  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement('div');
    confetti.style.cssText = `
      position: fixed;
      width: 10px;
      height: 10px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      left: ${Math.random() * 100}vw;
      top: -10px;
      border-radius: 50%;
      pointer-events: none;
      z-index: 10000;
      animation: confetti-fall ${Math.random() * 3 + 2}s linear forwards;
    `;
    
    document.body.appendChild(confetti);
    
    setTimeout(() => confetti.remove(), 5000);
  }
}

// Add confetti animation dynamically
const style = document.createElement('style');
style.textContent = `
  @keyframes confetti-fall {
    to {
      transform: translateY(100vh) rotate(360deg);
      opacity: 0;
    }
  }
  
  .ripple {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.5);
    transform: scale(0);
    animation: ripple-effect 0.6s ease-out;
    pointer-events: none;
  }
  
  @keyframes ripple-effect {
    to {
      transform: scale(2);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// ===================================
// Cursor Trail Effect (Optional - Subtle)
// ===================================
const initCursorTrail = () => {
  if (window.innerWidth < 768) return; // Only on desktop
  
  const trail = [];
  const trailLength = 15;
  
  for (let i = 0; i < trailLength; i++) {
    const dot = document.createElement('div');
    dot.style.cssText = `
      position: fixed;
      width: 4px;
      height: 4px;
      background: rgba(212, 175, 55, ${1 - i / trailLength});
      border-radius: 50%;
      pointer-events: none;
      z-index: 9999;
      transition: transform 0.1s ease;
    `;
    trail.push(dot);
    document.body.appendChild(dot);
  }
  
  let mouseX = 0;
  let mouseY = 0;
  
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });
  
  const animateTrail = () => {
    let x = mouseX;
    let y = mouseY;
    
    trail.forEach((dot, index) => {
      dot.style.left = `${x - 2}px`;
      dot.style.top = `${y - 2}px`;
      
      const nextDot = trail[index + 1] || trail[0];
      x += (parseFloat(nextDot.style.left) - x) * 0.3;
      y += (parseFloat(nextDot.style.top) - y) * 0.3;
    });
    
    requestAnimationFrame(animateTrail);
  };
  
  animateTrail();
};

// Cursor trail is superseded by the liquid cursor-glow in the Landing v2 module.
// (initCursorTrail is left defined above in case it is wanted on another page.)

// ===================================
// Log Welcome Message
// ===================================
console.log('%c🎓 Thesis Website by JJ', 'font-size: 20px; font-weight: bold; color: #d4af37;');
console.log('%cBuilt with ❤️ for PUP', 'font-size: 14px; color: #888;');
console.log('%cTry the Konami Code! ↑↑↓↓←→←→BA', 'font-size: 12px; color: #666; font-style: italic;');

// ===================================
// Floating Blur Circles Physics
// ===================================
const ambientOrbs = document.querySelectorAll('.ambient-orb');

if (ambientOrbs.length > 0) {
  const orbStates = [
    {
      baseX: 0,
      baseY: 0,
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      scrollSpeed: 0.18,
      idleAmpX: 24,
      idleAmpY: 18,
      idleSpeedX: 0.00045,
      idleSpeedY: 0.00035
    },
    {
      baseX: 0,
      baseY: 0,
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      scrollSpeed: 0.28,
      idleAmpX: 34,
      idleAmpY: 22,
      idleSpeedX: 0.00038,
      idleSpeedY: 0.00030
    },
    {
      baseX: 0,
      baseY: 0,
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      scrollSpeed: 0.14,
      idleAmpX: 18,
      idleAmpY: 26,
      idleSpeedX: 0.00052,
      idleSpeedY: 0.00040
    }
  ];

  const lerp = (a, b, t) => a + (b - a) * t;

  const updateScrollTargets = () => {
    const scrollY = window.scrollY;

    orbStates.forEach((orb, index) => {
      orb.targetY = -(scrollY * orb.scrollSpeed);
      orb.targetX = Math.sin(scrollY * 0.002 + index * 1.5) * (15 + index * 8);
    });
  };

  window.addEventListener('scroll', updateScrollTargets);
  updateScrollTargets();

  const animateAmbientOrbs = (time) => {
    ambientOrbs.forEach((el, index) => {
      const orb = orbStates[index];

      orb.x = lerp(orb.x, orb.targetX, 0.08);
      orb.y = lerp(orb.y, orb.targetY, 0.08);

      const idleX = Math.sin(time * orb.idleSpeedX + index * 2) * orb.idleAmpX;
      const idleY = Math.cos(time * orb.idleSpeedY + index * 1.6) * orb.idleAmpY;
      const scale = 1 + Math.sin(time * 0.0004 + index) * 0.05;

      el.style.transform = `translate3d(${orb.x + idleX}px, ${orb.y + idleY}px, 0) scale(${scale})`;
    });

    requestAnimationFrame(animateAmbientOrbs);
  };

  requestAnimationFrame(animateAmbientOrbs);
}

// ===================================================================
// LANDING v2 — Liquid Gold Experience
// Audio (synth) · droplet canvas · 3D hero tilt · control dock · intro
// ===================================================================
(() => {
  if (!document.body.classList.contains('landing-page')) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const GOLD = '212, 175, 55';
  const GOLD_L = '245, 230, 168';

  // -------------------- AUDIO (Web Audio API, fully synthesized) --------------------
  const JJAudio = (() => {
    let ctx, master, started = false;
    let enabled = localStorage.getItem('jjSound') !== 'off'; // default ON

    const init = () => {
      if (ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
    };

    const ramp = (param, to, t) => {
      const now = ctx.currentTime;
      param.cancelScheduledValues(now);
      param.setValueAtTime(param.value, now);
      param.linearRampToValueAtTime(to, now + t);
    };

    const startPad = () => {
      if (started || !ctx) return;
      started = true;
      const padGain = ctx.createGain();
      padGain.gain.value = 0.4;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 620;
      lp.Q.value = 0.7;
      padGain.connect(lp);
      lp.connect(master);

      // Soft, warm A-minor-ish pad
      [110, 164.81, 220, 277.18].forEach((f, i) => {
        const o = ctx.createOscillator();
        o.type = i % 2 ? 'sine' : 'triangle';
        o.frequency.value = f;
        o.detune.value = (i - 1.5) * 5;
        const g = ctx.createGain();
        g.gain.value = i === 0 ? 0.55 : 0.26;
        o.connect(g);
        g.connect(padGain);
        o.start();
      });

      // Slow filter sweep so the pad gently breathes
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.frequency.value = 0.06;
      lg.gain.value = 200;
      lfo.connect(lg);
      lg.connect(lp.frequency);
      lfo.start();
    };

    const tone = (freq, when, dur, vol, type = 'sine') => {
      if (!ctx) return;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      const t0 = ctx.currentTime + when;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g);
      g.connect(master);
      o.start(t0);
      o.stop(t0 + dur + 0.05);
    };

    const live = () => ctx && enabled && ctx.state === 'running';

    return {
      isEnabled: () => enabled,
      unlock() { // must run from a user gesture
        init();
        if (!ctx) return;
        if (ctx.state === 'suspended') ctx.resume();
        startPad();
        ramp(master.gain, enabled ? 0.5 : 0, 2.5);
      },
      chime() {
        if (!live()) return;
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
          tone(f, i * 0.09, 1.3, 0.11, i === 3 ? 'triangle' : 'sine'));
      },
      click() { if (live()) tone(880, 0, 0.09, 0.05); },
      hover() { if (live()) tone(1320, 0, 0.05, 0.02); },
      toggle() {
        enabled = !enabled;
        localStorage.setItem('jjSound', enabled ? 'on' : 'off');
        init();
        if (ctx && ctx.state === 'suspended') ctx.resume();
        startPad();
        if (master) ramp(master.gain, enabled ? 0.5 : 0, 0.8);
        return enabled;
      }
    };
  })();

  // -------------------- LIQUID GOLD DROPLET CANVAS --------------------
  const canvas = document.getElementById('waveCanvas');
  const c = canvas && canvas.getContext('2d');
  if (canvas && c && !reduce) {
    let dpr;
    const ripples = [];
    const drops = [];
    const mouse = { x: -999, y: -999, gx: -999, gy: -999, on: false };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      canvas.style.width = innerWidth + 'px';
      canvas.style.height = innerHeight + 'px';
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    addEventListener('resize', resize);

    const ripple = (x, y, max) => ripples.push({
      x, y, r: 0, max: max || 80 + Math.random() * 120,
      sp: 1.4 + Math.random() * 1.6, life: 1
    });

    const newDrop = (init) => ({
      x: Math.random() * innerWidth,
      y: init ? Math.random() * innerHeight : -20,
      vy: 2.5 + Math.random() * 3.5,
      len: 8 + Math.random() * 16,
      splash: innerHeight * (0.5 + Math.random() * 0.45),
      size: 0.8 + Math.random() * 1.4
    });
    for (let i = 0; i < 13; i++) drops.push(newDrop(true));

    let lastMove = 0;
    addEventListener('pointermove', (e) => {
      mouse.x = e.clientX; mouse.y = e.clientY; mouse.on = true;
      const now = Date.now();
      if (now - lastMove > 90) { lastMove = now; ripple(e.clientX, e.clientY, 55 + Math.random() * 55); }
    });
    addEventListener('pointerdown', (e) => {
      for (let i = 0; i < 3; i++) setTimeout(() => ripple(e.clientX, e.clientY, 120 + i * 45), i * 110);
      JJAudio.click();
    });

    const frame = () => {
      c.clearRect(0, 0, innerWidth, innerHeight);

      // cursor glow (lerped follow)
      mouse.gx += (mouse.x - mouse.gx) * 0.08;
      mouse.gy += (mouse.y - mouse.gy) * 0.08;
      if (mouse.on) {
        const g = c.createRadialGradient(mouse.gx, mouse.gy, 0, mouse.gx, mouse.gy, 190);
        g.addColorStop(0, `rgba(${GOLD}, 0.15)`);
        g.addColorStop(1, `rgba(${GOLD}, 0)`);
        c.fillStyle = g;
        c.fillRect(0, 0, innerWidth, innerHeight);
      }

      // falling droplets -> splash into ripples
      for (const d of drops) {
        d.y += d.vy;
        if (d.y >= d.splash) { ripple(d.x, d.splash, 45 + Math.random() * 65); Object.assign(d, newDrop(false)); }
        const grad = c.createLinearGradient(d.x, d.y - d.len, d.x, d.y);
        grad.addColorStop(0, `rgba(${GOLD_L}, 0)`);
        grad.addColorStop(1, `rgba(${GOLD_L}, 0.5)`);
        c.strokeStyle = grad;
        c.lineWidth = d.size;
        c.beginPath();
        c.moveTo(d.x, d.y - d.len);
        c.lineTo(d.x, d.y);
        c.stroke();
      }

      // ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.r += r.sp;
        r.life = 1 - r.r / r.max;
        if (r.life <= 0) { ripples.splice(i, 1); continue; }
        c.beginPath();
        c.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        c.strokeStyle = `rgba(${GOLD}, ${r.life * 0.5})`;
        c.lineWidth = r.life * 2 + 0.4;
        c.stroke();
        c.beginPath();
        c.arc(r.x, r.y, r.r * 0.6, 0, Math.PI * 2);
        c.strokeStyle = `rgba(${GOLD_L}, ${r.life * 0.18})`;
        c.lineWidth = 1;
        c.stroke();
      }

      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  // -------------------- CURSOR-REACTIVE 3D HERO TILT --------------------
  const hero = document.querySelector('.hero-content');
  if (hero && !reduce) {
    let tx = 0, ty = 0, cx = 0, cy = 0;
    addEventListener('pointermove', (e) => {
      tx = (e.clientY / innerHeight - 0.5) * -6;
      ty = (e.clientX / innerWidth - 0.5) * 8;
    });
    const tick = () => {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      hero.style.transform = `perspective(900px) rotateX(${cx}deg) rotateY(${cy}deg)`;
      requestAnimationFrame(tick);
    };
    tick();
  }

  // -------------------- FILM GRAIN + CONTROL DOCK --------------------
  const grain = document.createElement('div');
  grain.className = 'jj-grain';
  grain.setAttribute('aria-hidden', 'true');
  document.body.appendChild(grain);

  const dock = document.createElement('div');
  dock.className = 'jj-dock';

  const soundBtn = document.createElement('button');
  soundBtn.type = 'button';
  soundBtn.setAttribute('aria-label', 'Toggle sound');
  const syncSound = () => {
    soundBtn.textContent = JJAudio.isEnabled() ? '🔊' : '🔇';
    soundBtn.title = JJAudio.isEnabled() ? 'Sound on' : 'Sound off';
    soundBtn.classList.toggle('is-off', !JJAudio.isEnabled());
  };
  syncSound();
  soundBtn.addEventListener('click', () => {
    const on = JJAudio.toggle();
    syncSound();
    if (on) JJAudio.chime();
  });

  const partyBtn = document.createElement('button');
  partyBtn.type = 'button';
  partyBtn.title = 'Celebrate';
  partyBtn.setAttribute('aria-label', 'Celebrate');
  partyBtn.textContent = '✨';
  partyBtn.addEventListener('click', () => {
    if (typeof triggerConfetti === 'function') triggerConfetti();
    JJAudio.chime();
  });

  dock.appendChild(soundBtn);
  dock.appendChild(partyBtn);
  document.body.appendChild(dock);

  // soft hover ticks on the key interactive elements
  document.querySelectorAll('.quick-link-card, .proposal-card, .home-project-card, .social-link, .nav-back, .intro-enter')
    .forEach(el => el.addEventListener('mouseenter', () => JJAudio.hover()));

  // -------------------- TAP-TO-ENTER INTRO (unlocks audio) --------------------
  const overlay = document.getElementById('introOverlay');
  if (overlay) {
    let entered = false;
    const enter = (withSound) => {
      if (entered) return;
      entered = true;
      if (withSound) { JJAudio.unlock(); JJAudio.chime(); }
      overlay.classList.add('is-hidden');
      setTimeout(() => { overlay.style.display = 'none'; }, 950);
    };
    overlay.addEventListener('click', () => enter(true));
    const btn = document.getElementById('introEnter');
    if (btn) btn.addEventListener('click', (e) => { e.stopPropagation(); enter(true); });
    // Safety: never trap the visitor — auto-open after a while (no audio).
    setTimeout(() => enter(false), 9000);
  }
})();
