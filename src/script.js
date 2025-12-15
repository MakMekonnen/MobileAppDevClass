// Helper functions
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const on = (el, event, fn, opts) => el && el.addEventListener(event, fn, opts);

function debounce(fn, delay = 150) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}
document.addEventListener('DOMContentLoaded', () => {
  setupNav();
  setupScrollProgress();
  setupScrollSpy();
  setupScrollReveal();
  setupProjectGallery();
  setupContactForm();
});

  //  Navigation + smooth scroll
function setupNav() {
  const toggle = $('.nav-toggle');
  const navList = $('nav ul');

  on(toggle, 'click', () => {
    const isOpen = navList.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  $$('nav a[href^="#"]').forEach((a) => {
    on(a, 'click', (e) => {
      const href = a.getAttribute('href');
      const target = href ? $(href) : null;
      if (!target) return;

      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });

      if (navList.classList.contains('is-open')) {
        navList.classList.remove('is-open');
        toggle?.setAttribute('aria-expanded', 'false');
      }
    });
  });
}

  //  Scroll progress bar
function setupScrollProgress() {
  const bar = $('#scroll-progress');
  if (!bar) return;

  const update = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = `${progress}%`;
  };

  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
}

  //  Scroll spy (nav highlight)
function setupScrollSpy() {
  const sections = ['about', 'projects', 'contact']
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  const links = $$('nav a[href^="#"]');
  if (!sections.length || !links.length) return;

  const setActive = (id) => {
    links.forEach((a) =>
      a.classList.toggle('is-active', a.getAttribute('href') === `#${id}`)
    );
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const top = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (top) setActive(top.target.id);
    },
    { threshold: [0.25, 0.5, 0.7] }
  );

  sections.forEach((s) => observer.observe(s));
}

/* ----------------------------
   Scroll reveal
---------------------------- */
function setupScrollReveal() {
  const targets = $$('section, article');
  targets.forEach((el) => el.classList.add('reveal'));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-visible');
        observer.unobserve(e.target);
      });
    },
    { threshold: 0.15 }
  );

  targets.forEach((el) => observer.observe(el));
}

  //  Projects: filters + search + sort + modal
function setupProjectGallery() {
  const grid = $('#projects');
  if (!grid) return;

  const cards = $$('article', grid);
  if (!cards.length) return;

  const searchInput = $('#project-search');
  const sortSelect = $('#project-sort');
  const filtersWrap = $('#project-filters');
  const emptyEl = $('#project-empty');

  // Precompute card data once
  const data = cards.map((card) => {
    const tags = (card.dataset.tags || '')
      .toLowerCase()
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const title = (card.querySelector('figcaption strong')?.textContent || '').trim();
    const dateMs = Date.parse(card.dataset.date || '1970-01-01') || 0;
    const featured = card.dataset.featured === 'true';
    const text = card.innerText.toLowerCase();

    return { card, tags, title, dateMs, featured, text };
  });

  const tagList = Array.from(new Set(data.flatMap((d) => d.tags))).sort();

  const state = { tags: new Set(), q: '', sort: 'recent' };

  // Build filter buttons
  if (filtersWrap) {
    filtersWrap.innerHTML = '';

    filtersWrap.appendChild(
      makeBtn('All', () => {
        state.tags.clear();
        apply();
      }, true)
    );

    tagList.forEach((tag) => {
      filtersWrap.appendChild(
        makeBtn(tag, () => {
          state.tags.has(tag) ? state.tags.delete(tag) : state.tags.add(tag);
          apply();
        })
      );
    });
  }

  on(
    searchInput,
    'input',
    debounce(() => {
      state.q = (searchInput.value || '').trim().toLowerCase();
      apply();
    }, 150)
  );

  on(sortSelect, 'change', () => {
    state.sort = sortSelect.value;
    apply();
  });

  // Modal open
  data.forEach((d, idx) => {
    d.card.tabIndex = 0;
    d.card.style.cursor = 'pointer';

    on(d.card, 'click', () => openProjectModal(idx, cards));

    on(d.card, 'keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openProjectModal(idx, cards);
      }
    });
  });

  apply();

  function apply() {
    // Active states for filter buttons
    if (filtersWrap) {
      const btns = $$('button', filtersWrap);
      const anyTags = state.tags.size > 0;

      btns.forEach((b, i) => {
        if (i === 0) b.classList.toggle('is-active', !anyTags);
        else b.classList.toggle('is-active', state.tags.has(b.dataset.tag));
      });
    }

    // Filter
    const visible = [];
    data.forEach((d) => {
      const matchTags =
        state.tags.size === 0 || [...state.tags].every((t) => d.tags.includes(t));
      const matchQuery = !state.q || d.text.includes(state.q);

      const show = matchTags && matchQuery;
      d.card.classList.toggle('is-hidden', !show);
      if (show) visible.push(d);
    });

    // Sort
    visible.sort((a, b) => {
      if (state.sort === 'title') return a.title.localeCompare(b.title);

      if (state.sort === 'featured') {
        if (a.featured !== b.featured) return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
        return b.dateMs - a.dateMs;
      }

      return b.dateMs - a.dateMs; // recent
    });

    // Reorder DOM
    visible.forEach((d) => grid.appendChild(d.card));

    // Empty state
    if (emptyEl) {
      const isEmpty = visible.length === 0;
      emptyEl.textContent = isEmpty
        ? 'No projects match that filter. Try a different tag or search.'
        : '';
      emptyEl.classList.toggle('sr-only', !isEmpty);
    }
  }

  function makeBtn(label, fn, active = false) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.dataset.tag = label.toLowerCase();
    b.className = active ? 'filter-btn is-active' : 'filter-btn';
    b.addEventListener('click', fn);
    return b;
  }
}

  //  Modal (arrows, esc, click outside, focus trap)
function openProjectModal(startIndex, cards) {
  const visibleCards = cards.filter((c) => !c.classList.contains('is-hidden'));
  if (!visibleCards.length) return;

  let index = visibleCards.indexOf(cards[startIndex]);
  if (index < 0) index = 0;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const modal = document.createElement('div');
  modal.className = 'modal';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'modal-close';
  closeBtn.textContent = 'Close';
  closeBtn.setAttribute('aria-label', 'Close modal');

  const img = document.createElement('img');
  const caption = document.createElement('div');
  caption.className = 'modal-caption';

  const actions = document.createElement('div');
  actions.className = 'modal-actions';

  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.textContent = '← Prev';

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.textContent = 'Next →';

  actions.appendChild(prevBtn);
  actions.appendChild(nextBtn);

  modal.appendChild(closeBtn);
  modal.appendChild(img);
  modal.appendChild(caption);
  modal.appendChild(actions);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  requestAnimationFrame(() => overlay.classList.add('is-visible'));

  const previouslyFocused = document.activeElement;

  const render = () => {
    const card = visibleCards[index];
    const cardImg = card.querySelector('img');
    const cardCap = card.querySelector('figcaption');

    img.src = cardImg?.getAttribute('src') || '';
    img.alt = cardImg?.getAttribute('alt') || 'Project image';
    caption.innerHTML = cardCap ? cardCap.innerHTML : '';
  };

  const close = () => {
    overlay.classList.remove('is-visible');
    setTimeout(() => {
      overlay.remove();
      previouslyFocused?.focus?.();
    }, 180);
    document.removeEventListener('keydown', onKeydown);
  };

  const goPrev = () => {
    index = (index - 1 + visibleCards.length) % visibleCards.length;
    render();
  };

  const goNext = () => {
    index = (index + 1) % visibleCards.length;
    render();
  };

  const onKeydown = (e) => {
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') goPrev();
    if (e.key === 'ArrowRight') goNext();

    if (e.key === 'Tab') {
      const focusables = $$(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        overlay
      );
      if (!focusables.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  on(closeBtn, 'click', close);
  on(prevBtn, 'click', goPrev);
  on(nextBtn, 'click', goNext);

  on(overlay, 'click', (e) => {
    if (e.target === overlay) close();
  });

  document.addEventListener('keydown', onKeydown);

  render();
  closeBtn.focus();
}

  //  Contact form: validation + localStorage
  //  Note: style errors in CSS with .field-error
function setupContactForm() {
  const form = $('#contact form');
  if (!form) return;

  const fields = [
    {
      el: $('#name', form),
      key: 'contact_name',
      validator: (v) => v.trim().length >= 2,
      msg: 'Please enter your name.'
    },
    {
      el: $('#email', form),
      key: 'contact_email',
      validator: isValidEmail,
      msg: 'Please enter a valid email.'
    },
    {
      el: $('#message', form),
      key: 'contact_message',
      validator: (v) => v.trim().length >= 10,
      msg: 'Message should be at least 10 characters.'
    }
  ].filter((f) => f.el);

  fields.forEach((f) => {
    const err = document.createElement('p');
    err.className = 'field-error sr-only';
    err.id = `${f.el.id}-error`;
    err.style.margin = '0';

    f.el.setAttribute('aria-describedby', err.id);
    f.el.insertAdjacentElement('afterend', err);
    f.errorEl = err;

    const saved = localStorage.getItem(f.key);
    if (saved) f.el.value = saved;

    on(
      f.el,
      'input',
      debounce(() => {
        localStorage.setItem(f.key, f.el.value);
        validateField(f, { quiet: true });
      }, 120)
    );

    on(f.el, 'blur', () => validateField(f));
  });

  const status = document.createElement('p');
  status.id = 'contact-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.style.marginTop = '0.8em';
  form.appendChild(status);

  on(form, 'submit', (e) => {
    e.preventDefault();

    let firstInvalid = null;

    fields.forEach((f) => {
      const ok = validateField(f);
      if (!ok && !firstInvalid) firstInvalid = f.el;
    });

    if (firstInvalid) {
      firstInvalid.focus();
      status.textContent = 'Please fix the highlighted fields.';
      return;
    }

    status.textContent = 'Message ready to send. This form currently has no backend endpoint.';
  });

  function validateField(field, opts = {}) {
    const value = field.el.value || '';
    const ok = field.validator(value);

    field.el.setAttribute('aria-invalid', String(!ok));

    if (ok) {
      field.errorEl.textContent = '';
      field.errorEl.classList.add('sr-only');
    } else if (!opts.quiet) {
      field.errorEl.textContent = field.msg;
      field.errorEl.classList.remove('sr-only');
    }

    return ok;
  }
}

function isValidEmail(v) {
  const value = (v || '').trim();
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}