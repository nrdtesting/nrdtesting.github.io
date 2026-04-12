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
  const cards = document.querySelectorAll('.proposal-card, .chapter-card');
  
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
// Parallax Effect for Decorative Elements
// ===================================
const cornerDecorations = document.querySelectorAll('.corner-decoration');

if (cornerDecorations.length > 0) {
  window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    
    cornerDecorations.forEach((decoration, index) => {
      const speed = index === 0 ? 0.3 : 0.5;
      const yPos = scrolled * speed;
      decoration.style.transform = `translateY(${yPos}px)`;
    });
  });
}

// ===================================
// Enhanced Hover Effects
// ===================================
const proposalCards = document.querySelectorAll('.proposal-card');

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
// Print Styles Handler
// ===================================
window.addEventListener('beforeprint', () => {
  // Remove decorative elements for printing
  const decorations = document.querySelectorAll('.grain-overlay, .corner-decoration');
  decorations.forEach(el => el.style.display = 'none');
});

window.addEventListener('afterprint', () => {
  const decorations = document.querySelectorAll('.grain-overlay, .corner-decoration');
  decorations.forEach(el => el.style.display = 'block');
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
}

// ===================================
// Copy Chapter templates for 2 and 3
// ===================================
// Note: This is just a comment to remind you to copy chapter1.html
// to chapter2.html and chapter3.html and update the content accordingly
