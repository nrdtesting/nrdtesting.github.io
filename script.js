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
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('introOverlay');
  
  if (overlay) {
    // Disable pointer events after animation
    setTimeout(() => {
      overlay.style.pointerEvents = 'none';
    }, 2600);
  }
  
  // Initialize wave canvas after intro
  setTimeout(() => {
    initWaveCanvas();
  }, 2600);
});

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

// ===================================
// Smooth Scroll for Anchor Links
// ===================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    
    if (target) {
      const offset = 100; // Offset for sticky nav
      const targetPosition = target.offsetTop - offset;
      
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
      
      // Update active sidebar link
      updateActiveSidebarLink(this);
    }
  });
});

// ===================================
// Active Sidebar Link on Scroll
// ===================================
const sidebarLinks = document.querySelectorAll('.sidebar-link');
const outlineLinks = document.querySelectorAll('.outline-link');
const allNavLinks = [...sidebarLinks, ...outlineLinks];

if (allNavLinks.length > 0) {
  const updateActiveSidebarLink = (clickedLink) => {
    allNavLinks.forEach(link => link.classList.remove('active'));
    if (clickedLink) {
      clickedLink.classList.add('active');
    }
  };
  
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
  const cards = document.querySelectorAll('.proposal-card, .chapter-card, .info-card');
  
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
  
  // Parallax for labels
  const labelBadge = document.querySelector('.label-badge');
  if (labelBadge) {
    const yPos = scrolled * 0.5;
    labelBadge.style.transform = `translateY(${yPos}px)`;
  }
  
  // Parallax for section numbers
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
  link.addEventListener('mouseenter', function(e) {
    const ripple = document.createElement('span');
    ripple.classList.add('ripple');
    
    const rect = this.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    
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
  const elements = document.querySelectorAll('.chapter-section');
  
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

// Optionally enable cursor trail on landing page only
if (document.body.classList.contains('landing-page') && !prefersReducedMotion.matches) {
  setTimeout(initCursorTrail, 3000);
}

// ===================================
// Log Welcome Message
// ===================================
console.log('%c🎓 Thesis Website by JJ', 'font-size: 20px; font-weight: bold; color: #d4af37;');
console.log('%cBuilt with ❤️ for PUP', 'font-size: 14px; color: #888;');
console.log('%cTry the Konami Code! ↑↑↓↓←→←→BA', 'font-size: 12px; color: #666; font-style: italic;');
