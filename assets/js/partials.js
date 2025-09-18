async function loadPartials() {
  const header = document.querySelector('#__header');
  const footer = document.querySelector('#__footer');

  // Load header/footer HTML
  try {
    if (header) {
      const h = await fetch('partials/header.html', { cache: 'no-cache' });
      header.innerHTML = await h.text();
    }
    if (footer) {
      const f = await fetch('partials/footer.html', { cache: 'no-cache' });
      footer.innerHTML = await f.text();
      const yearSpan = document.getElementById('year');
      if (yearSpan) yearSpan.textContent = new Date().getFullYear();
    }
  } catch (e) {
    console.error('Partials load error', e);
  }

  // After header is in the DOM, wire up mobile drawer
  setupMobileNav();
  // Setup scroll reveal animations
  setupScrollReveal();

  document.dispatchEvent(new CustomEvent("partials:loaded")); 
}

function setupMobileNav() {
  const drawer = document.getElementById('mobile-drawer');
  const overlay = document.getElementById('mobile-overlay');
  const burger = document.getElementById('hamburger');
  const closeBtn = document.getElementById('drawer-close');

  if (!drawer || !overlay || !burger) return;

  const open = () => {
    drawer.classList.add('open');
    overlay.hidden = false;
    document.body.classList.add('no-scroll');
    burger.setAttribute('aria-expanded', 'true');
    drawer.setAttribute('aria-hidden', 'false');
  };
  const close = () => {
    drawer.classList.remove('open');
    overlay.hidden = true;
    document.body.classList.remove('no-scroll');
    burger.setAttribute('aria-expanded', 'false');
    drawer.setAttribute('aria-hidden', 'true');
  };

  burger.addEventListener('click', () => {
    if (drawer.classList.contains('open')) close();
    else open();
  });
  overlay.addEventListener('click', close);
  if (closeBtn) closeBtn.addEventListener('click', close);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
  // Close on nav click (mobile)
  drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
}

function setupScrollReveal() {
  // Marca automaticamente elementi tipici; puoi aggiungere manualmente data-reveal dove vuoi.
  document.querySelectorAll('.card, .hero h1, .hero p, .hero .buttons, .section h1, .section h2, .section p, [data-reveal]')
    .forEach(el => {
      // Se il blocco è media/tiles, usa reveal-scale per più presenza
      if (el.matches('.tile, .tile__media')) el.classList.add('reveal-scale');
      else el.classList.add('reveal');
    });

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const el = entry.target;
      if (entry.isIntersecting) {
        el.classList.add('visible');
      } else {
        // reverse on scroll-up: quando esce dal viewport rimuoviamo .visible
        el.classList.remove('visible');
      }
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -10% 0px' });

  document.querySelectorAll('.reveal, .reveal-scale').forEach(el => io.observe(el));
}


document.addEventListener('DOMContentLoaded', loadPartials);
