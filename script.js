/* Serene Library: shared JavaScript for every page.
   Features: 1) dark / light mode  2) like button  3) show / hide synopsis
             4) reading progress bar  5) genre jump buttons  6) "back to where you were" */

/* ---------- Small helper for saving things (works even if storage is blocked) ---------- */
function store(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, value);
  } catch (err) { /* storage unavailable: features still work for this visit */ }
  return null;
}
function session(key, value) {
  try {
    if (value === undefined) return sessionStorage.getItem(key);
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch (err) { /* ignore */ }
  return null;
}

/* ---------- 1. Dark / light mode (icon button) ---------- */
const SVG_START = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
const ICON_MOON = SVG_START + '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
const ICON_SUN = SVG_START + '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('themeToggle');
  if (btn) {
    const dark = theme === 'dark';
    btn.innerHTML = dark ? ICON_SUN : ICON_MOON;      // sun = tap to go light, moon = tap to go dark
    const label = dark ? 'Switch to light mode' : 'Switch to dark mode';
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
    btn.setAttribute('aria-pressed', String(dark));
  }
}
(function initTheme() {
  const saved = store('serene-theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved || (prefersDark ? 'dark' : 'light'));
})();

/* ---------- 2. Like button (remembered between visits) ---------- */
let likedIds = new Set();
try { likedIds = new Set(JSON.parse(store('serene-likes') || '[]').map(String)); } catch (err) { likedIds = new Set(); }

function paintLike(btn) {
  const on = likedIds.has(btn.dataset.like);
  btn.classList.toggle('liked', on);
  btn.setAttribute('aria-pressed', String(on));
  btn.textContent = on ? '\u2665 Liked' : '\u2661 Like';
}
function toggleLike(id) {
  id = String(id);
  if (likedIds.has(id)) likedIds.delete(id); else likedIds.add(id);
  store('serene-likes', JSON.stringify([...likedIds]));
  document.querySelectorAll('[data-like="' + id + '"]').forEach(paintLike);
}
document.querySelectorAll('[data-like]').forEach(paintLike);

/* ---------- 4. Reading progress bar (story pages) ---------- */
function updateProgress() {
  const bar = document.getElementById('progress');
  if (!bar) return;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const pct = max > 0 ? Math.min(100, Math.max(0, (window.pageYOffset / max) * 100)) : 0;
  bar.style.width = pct + '%';
}
window.addEventListener('scroll', updateProgress, { passive: true });
window.addEventListener('resize', updateProgress);
updateProgress();

/* ---------- 5. Genre jump buttons (Stories page) ---------- */
function scrollToEl(el) {
  const header = document.querySelector('.site-header');
  const offset = (header ? header.offsetHeight : 0) + 16;
  const top = el.getBoundingClientRect().top + window.pageYOffset - offset;
  window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
}

/* ---------- 6. Remember where you were on the Stories page ---------- */
(function restoreStoriesScroll() {
  if (!document.body.classList.contains('stories-page')) return;
  const y = session('serene-scroll');
  if (session('serene-restore') === '1' && y !== null && !location.hash) {
    const top = parseInt(y, 10) || 0;
    window.scrollTo({ top: top, behavior: 'instant' });
    requestAnimationFrame(() => window.scrollTo({ top: top, behavior: 'instant' }));
  }
  session('serene-restore', null);
})();

/* ---------- Clicks ---------- */
document.addEventListener('click', e => {
  // dark / light mode
  const themeBtn = e.target.closest('#themeToggle');
  if (themeBtn) {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    store('serene-theme', next);
    return;
  }

  // like
  const like = e.target.closest('[data-like]');
  if (like) { toggleLike(like.dataset.like); return; }

  // show / hide synopsis
  const syn = e.target.closest('[data-syn]');
  if (syn) {
    const box = document.getElementById('syn-' + syn.dataset.syn);
    if (!box) return;
    const show = box.hidden;
    box.hidden = !show;
    syn.setAttribute('aria-expanded', String(show));
    syn.textContent = show ? 'Hide synopsis' : 'Show synopsis';
    return;
  }

  // genre jump
  const chip = e.target.closest('[data-jump]');
  if (chip) {
    const el = document.getElementById('genre-' + chip.dataset.jump);
    if (!el) return;
    document.querySelectorAll('[data-jump]').forEach(c => c.classList.toggle('active', c === chip));
    scrollToEl(el);
    return;
  }

  // opening a book from the Stories page: remember the scroll position
  const read = e.target.closest('a[data-read]');
  if (read && document.body.classList.contains('stories-page')) {
    session('serene-scroll', String(window.pageYOffset));
    return;
  }

  // "Back to ... section" on a story page: return to the same spot if we know it,
  // otherwise the link jumps to the right genre section
  const back = e.target.closest('[data-back]');
  if (back && session('serene-scroll') !== null) {
    e.preventDefault();
    session('serene-restore', '1');
    window.location.href = 'stories.html';
  }
});
