// ==========================================================================
// DgentleMedTech — Fullstack Client Engine & User Auth System
// ==========================================================================

const API_URL = 'https://script.google.com/macros/s/AKfycbxOGq-mC7xxEUs4976DeXVhshqzPg2-Ag-CUS47FChnZHlODJwycxPRaKRBXeBl-nmvYQ/exec';

// Security & Sanitizer helpers
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = u => /^https?:\/\//i.test(u || '') ? u : '';

// User session management
function getActiveUser() {
  try {
    return JSON.parse(localStorage.getItem('currentUser') || 'null');
  } catch (e) {
    return null;
  }
}

function setActiveUser(userData, token) {
  localStorage.setItem('currentUser', JSON.stringify(userData));
  localStorage.setItem('userToken', token);
}

function clearActiveUser() {
  localStorage.removeItem('currentUser');
  localStorage.removeItem('userToken');
}

// Markdown parser
function parseMarkdown(md) {
  if (!md) return '';
  let html = esc(md);
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
  html = html.replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>');
  html = html.replace(/`([^`]+)`/gim, '<code>$1</code>');
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  html = html.split(/\n{2,}/).map(para => {
    para = para.trim();
    if (!para) return '';
    if (/^<(h1|h2|h3|pre|ul|ol|div|blockquote)/i.test(para)) return para;
    return `<p>${para.replace(/\n/g, '<br>')}</p>`;
  }).join('');
  return html;
}

// Simple POST to Apps Script Web App
async function api(body) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body)
  });
  return res.json();
}

function formatDate(isoStr) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) { return ''; }
}

// Project Card Component
function projectCard(p) {
  const tags = String(p.tags || '').split(',').map(t => t.trim()).filter(Boolean).map(t => `<span>${esc(t)}</span>`).join('');
  const img = safeUrl(p.image)
    ? `<img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy">`
    : '<div class="ph"><span>No Preview</span></div>';
  const link = safeUrl(p.link)
    ? `<a class="link-btn" href="${esc(p.link)}" target="_blank" rel="noopener">Live Showcase &rarr;</a>`
    : '';

  return `
    <article class="card">
      <div class="card-img-wrap">
        ${img}
        ${p.featured === 'yes' ? '<span class="card-badge">Featured</span>' : ''}
      </div>
      <div class="body">
        <div class="cat">${esc(p.category || 'Portfolio')}</div>
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.summary || '')}</p>
        ${tags ? `<div class="tags">${tags}</div>` : ''}
        <div class="card-footer">
          ${link}
          <span class="meta-date">${formatDate(p.created)}</span>
        </div>
      </div>
    </article>`;
}

// Blog Card Component
function blogCard(post) {
  const tags = String(post.tags || '').split(',').map(t => t.trim()).filter(Boolean).map(t => `<span>${esc(t)}</span>`).join('');
  const img = safeUrl(post.image)
    ? `<img src="${esc(post.image)}" alt="${esc(post.title)}" loading="lazy">`
    : '<div class="ph"><span>Article</span></div>';
  const url = `/post?id=${encodeURIComponent(post.slug || post.id)}`;

  return `
    <article class="card">
      <div class="card-img-wrap">
        ${img}
        ${post.category ? `<span class="card-badge">${esc(post.category)}</span>` : ''}
      </div>
      <div class="body">
        <div class="cat">${formatDate(post.created)}</div>
        <h3>${esc(post.title)}</h3>
        <p>${esc(post.summary || '')}</p>
        ${tags ? `<div class="tags">${tags}</div>` : ''}
        <div class="card-footer">
          <a class="link-btn" href="${url}">Read Article &rarr;</a>
        </div>
      </div>
    </article>`;
}

// Navigation Bar Ingestion with Dynamic User Auth & Registration Check
function injectNavigation(pages, settings) {
  const navContainer = document.querySelector('nav[aria-label="Main"]');
  if (!navContainer) return;

  const currentPath = window.location.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
  const currentUser = getActiveUser();

  let baseLinks = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/projects', label: 'Portfolio' },
    { href: '/blog', label: 'Blog' }
  ];

  if (Array.isArray(pages)) {
    pages.filter(p => p.showInNav === 'yes').forEach(p => {
      baseLinks.push({
        href: `/page?slug=${encodeURIComponent(p.slug || p.id)}`,
        label: p.title
      });
    });
  }

  baseLinks.push({ href: '/contact', label: 'Contact' });

  let navHtml = baseLinks.map(link => {
    const isCurrent = (currentPath === link.href || (link.href !== '/' && window.location.href.includes(link.href)));
    return `<a href="${link.href}" ${isCurrent ? 'aria-current="page"' : ''}>${esc(link.label)}</a>`;
  }).join('');

  // User Auth Link (Account / Sign In / Portal)
  if (currentUser) {
    navHtml += `<a href="/user-dashboard" class="nav-auth-btn">${esc(currentUser.name.split(' ')[0])}'s Portal</a>`;
  } else {
    const authLabel = (settings && settings.allowUserRegistration === 'yes') ? 'Account' : 'Sign In';
    navHtml += `<a href="/auth" class="nav-auth-btn">${authLabel}</a>`;
  }

  // 1. If page uses the modern .site-header
  const siteHeader = document.querySelector('.site-header');
  if (siteHeader) {
    // Sync drawer links dynamically if custom pages exist
    const drawerCatalogNav = document.querySelector('.drawer-nav');
    if (drawerCatalogNav && Array.isArray(pages) && pages.length) {
      pages.filter(p => p.showInNav === 'yes').forEach(p => {
        const customLink = `/page?slug=${encodeURIComponent(p.slug || p.id)}`;
        if (!drawerCatalogNav.querySelector(`a[href="${customLink}"]`)) {
          const a = document.createElement('a');
          a.className = 'drawer-link';
          a.href = customLink;
          a.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg><span>${esc(p.title)}</span>`;
          drawerCatalogNav.appendChild(a);
        }
      });
    }
  }

  // 2. If page uses the older .nav container, style it cleanly into modern header bar
  const navHeader = navContainer.closest('.nav');
  if (navHeader) {
    navHeader.style.display = 'flex';
    navHeader.style.alignItems = 'center';
    navHeader.style.justifyContent = 'space-between';
    navHeader.style.background = '#ffffff';
    navHeader.style.border = '1px solid var(--border-light)';
    navHeader.style.borderRadius = 'var(--radius-lg)';
    navHeader.style.padding = '12px 20px';
    navHeader.style.boxShadow = 'var(--shadow-sm)';
    navHeader.style.marginBottom = '28px';

    const brandEl = navHeader.querySelector('.brand');
    if (brandEl) {
      brandEl.style.display = 'flex';
      brandEl.style.alignItems = 'center';
      brandEl.style.gap = '8px';
      brandEl.style.color = 'var(--text-dark)';
      brandEl.style.fontFamily = 'var(--font-display)';
      brandEl.style.fontWeight = '700';
      brandEl.style.fontSize = '1.2rem';
    }

    navContainer.style.display = 'flex';
    navContainer.style.gap = '8px';
    navContainer.style.flexWrap = 'wrap';
    navContainer.style.alignItems = 'center';

    navContainer.querySelectorAll('a').forEach(a => {
      a.style.color = 'var(--text-dark-secondary)';
      a.style.textDecoration = 'none';
      a.style.fontWeight = '500';
      a.style.fontSize = '0.92rem';
      a.style.padding = '8px 14px';
      a.style.borderRadius = 'var(--radius-md)';
      if (a.getAttribute('aria-current') === 'page') {
        a.style.color = '#ffffff';
        a.style.background = 'var(--purple-button)';
      }
    });

    const authBtn = navContainer.querySelector('.nav-auth-btn');
    if (authBtn) {
      authBtn.style.color = '#ffffff';
      authBtn.style.background = 'var(--purple-button)';
      authBtn.style.boxShadow = '0 4px 14px var(--purple-glow)';
    }
  }
}

// Apply public settings & content
function applyPublic(d) {
  const s = d.settings || {};

  document.querySelectorAll('[data-s]').forEach(el => {
    if (s[el.dataset.s] != null && s[el.dataset.s] !== '') {
      el.textContent = s[el.dataset.s];
    }
  });

  if (s.companyName) {
    document.title = document.title.replace('My Portfolio', s.companyName);
  }

  const soc = document.getElementById('social');
  if (soc) {
    const items = [
      ['Email', s.email ? 'mailto:' + s.email : ''],
      ['LinkedIn', safeUrl(s.linkedin)],
      ['X / Twitter', safeUrl(s.twitter)],
      ['Instagram', safeUrl(s.instagram)]
    ];
    soc.innerHTML = items.filter(i => i[1]).map(i => `<a href="${esc(i[1])}" target="_blank" rel="noopener">${i[0]}</a>`).join('');
  }

  injectNavigation(d.pages, s);

  // Projects Grid
  const projectBox = document.getElementById('projects');
  if (projectBox) {
    let list = d.projects || [];
    if (projectBox.dataset.featured) {
      const f = list.filter(p => p.featured === 'yes');
      if (f.length) list = f;
    }
    const limit = +projectBox.dataset.limit || 999;
    list = list.slice(0, limit);
    projectBox.innerHTML = list.length
      ? list.map(projectCard).join('')
      : '<p style="grid-column:1/-1;text-align:center;padding:36px 0;color:var(--soft);">No portfolio projects listed yet. Add one in the admin dashboard.</p>';
  }

  // Blog Posts Grid
  const blogBox = document.getElementById('blogPosts');
  if (blogBox) {
    let posts = d.posts || [];
    if (blogBox.dataset.featured) {
      const f = posts.filter(p => p.featured === 'yes');
      if (f.length) posts = f;
    }
    const limit = +blogBox.dataset.limit || 999;
    posts = posts.slice(0, limit);
    blogBox.innerHTML = posts.length
      ? posts.map(blogCard).join('')
      : '<p style="grid-column:1/-1;text-align:center;padding:36px 0;color:var(--soft);">No blog articles published yet.</p>';
  }

  // Single Post Reader View
  const postReader = document.getElementById('singlePostContainer');
  if (postReader) {
    const urlParams = new URLSearchParams(window.location.search);
    const identifier = urlParams.get('id') || urlParams.get('slug');
    const post = (d.posts || []).find(p => (p.slug && p.slug === identifier) || String(p.id) === identifier);
    if (post) {
      document.title = `${post.title} | ${s.companyName || 'Portfolio'}`;
      postReader.innerHTML = `
        <article>
          <div class="article-header">
            <span class="badge">${esc(post.category || 'Article')}</span>
            <h1>${esc(post.title)}</h1>
            <div class="article-meta">
              <span>Published on ${formatDate(post.created)}</span>
              ${post.tags ? `<span>&bull;</span> <span>${esc(post.tags)}</span>` : ''}
            </div>
          </div>
          ${safeUrl(post.image) ? `<img class="article-banner" src="${esc(post.image)}" alt="${esc(post.title)}">` : ''}
          <div class="article-body">
            ${parseMarkdown(post.content || post.summary || '')}
          </div>
        </article>
      `;
    } else {
      postReader.innerHTML = '<div style="text-align:center;padding:40px 0;"><h2>Article Not Found</h2><p>The requested blog article does not exist or has been removed.</p><a href="/blog" class="btn">View All Articles</a></div>';
    }
  }

  // Single Custom Page View
  const pageReader = document.getElementById('singlePageContainer');
  if (pageReader) {
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');
    const page = (d.pages || []).find(p => p.slug === slug || String(p.id) === slug);
    if (page) {
      document.title = `${page.title} | ${s.companyName || 'Portfolio'}`;
      pageReader.innerHTML = `
        <article>
          <div class="article-header">
            <h1>${esc(page.title)}</h1>
          </div>
          <div class="article-body">
            ${page.content ? page.content : '<p>No content has been added to this page yet.</p>'}
          </div>
        </article>
      `;
    } else {
      pageReader.innerHTML = '<div style="text-align:center;padding:40px 0;"><h2>Page Not Found</h2><p>The requested page could not be located.</p><a href="/" class="btn">Return to Home</a></div>';
    }
  }

  // Auth page registration visibility handler
  if (typeof updateAuthUI === 'function') {
    updateAuthUI(s.allowUserRegistration);
  }
}

// Golden Dust Particle Motion Canvas
function initInteractiveMotion() {
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let width, height;
  let particles = [];
  const PARTICLE_COUNT = 34;
  const mouse = { x: -1000, y: -1000, radius: 170 };

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  window.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  window.addEventListener('mouseleave', () => {
    mouse.x = -1000;
    mouse.y = -1000;
  });

  class Particle {
    constructor() {
      this.reset();
    }
    reset() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.size = Math.random() * 2 + 1;
      this.vx = (Math.random() - 0.5) * 0.4;
      this.vy = (Math.random() - 0.5) * 0.4;
      this.density = Math.random() * 20 + 2;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;

      if (this.x < 0 || this.x > width) this.vx *= -1;
      if (this.y < 0 || this.y > height) this.vy *= -1;

      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < mouse.radius) {
        const forceDirectionX = dx / distance;
        const forceDirectionY = dy / distance;
        const maxDistance = mouse.radius;
        const force = (maxDistance - distance) / maxDistance;
        const directionX = forceDirectionX * force * this.density;
        const directionY = forceDirectionY * force * this.density;
        this.x -= directionX;
        this.y -= directionY;
      }
    }
    draw() {
      ctx.fillStyle = 'rgba(212, 175, 55, 0.4)';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
    }
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(new Particle());
  }

  function connect() {
    for (let a = 0; a < particles.length; a++) {
      for (let b = a + 1; b < particles.length; b++) {
        const dx = particles[a].x - particles[b].x;
        const dy = particles[a].y - particles[b].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 130) {
          const opacity = (1 - dist / 130) * 0.18;
          ctx.strokeStyle = `rgba(212, 175, 55, ${opacity})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(particles[a].x, particles[a].y);
          ctx.lineTo(particles[b].x, particles[b].y);
          ctx.stroke();
        }
      }
    }
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);
    for (let i = 0; i < particles.length; i++) {
      particles[i].update();
      particles[i].draw();
    }
    connect();
    requestAnimationFrame(animate);
  }
  animate();
}

// Boot
async function boot() {
  initInteractiveMotion();

  try {
    const cached = JSON.parse(sessionStorage.getItem('pub_cache_v3') || 'null');
    if (cached) applyPublic(cached);
  } catch (e) {}

  if (API_URL.indexOf('PASTE_') === 0) return;

  try {
    const fresh = await (await fetch(API_URL + '?action=public')).json();
    if (fresh && fresh.ok) {
      sessionStorage.setItem('pub_cache_v3', JSON.stringify(fresh));
      applyPublic(fresh);
    }
  } catch (e) {
    console.warn('Backend sync error:', e);
  }
}

if (document.body.dataset.page !== 'admin') {
  boot();
}
