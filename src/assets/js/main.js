/* Handover Technologies — site interactions. No dependencies. */
(() => {
  const root = document.documentElement;
  root.classList.add('js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Opening shot: letterbox retracts, headline rises
  setTimeout(() => document.body.classList.add('is-loaded'), 60);

  // Header state on scroll
  const header = document.querySelector('[data-header]');
  const onScroll = () => header && header.classList.toggle('is-scrolled', scrollY > 8);
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });

  // Mobile menu
  const burger = document.querySelector('[data-burger]');
  const mobile = document.querySelector('[data-mobile-nav]');
  if (burger && mobile) {
    const setOpen = (open) => {
      burger.setAttribute('aria-expanded', open);
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      mobile.classList.toggle('is-open', open);
      header.classList.toggle('is-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    };
    burger.addEventListener('click', () => setOpen(burger.getAttribute('aria-expanded') !== 'true'));
    addEventListener('keydown', (e) => e.key === 'Escape' && setOpen(false));
    matchMedia('(min-width: 1081px)').addEventListener('change', () => setOpen(false));
  }

  // ---- Living menu: sliding pill, magnetic links, text roll, mega-menu previews ----
  const nav = document.querySelector('[data-nav]');
  if (nav) {
    const pill = nav.querySelector('.nav-pill');
    const items = [...nav.querySelectorAll('.nav-list > li')];
    const current = nav.querySelector('.nav-list > li > a[aria-current]');
    const place = (li, show = true) => {
      if (!li) { pill.style.opacity = 0; return; }
      const r = li.getBoundingClientRect(), n = nav.getBoundingClientRect();
      pill.style.width = r.width + 'px';
      pill.style.transform = `translateX(${r.left - n.left}px)`;
      pill.style.opacity = show ? 1 : 0;
    };
    // Wrap each top-level label so it can roll into its serif twin
    items.forEach((li) => {
      const a = li.querySelector(':scope > a');
      const text = [...a.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
      if (text) {
        const label = text.textContent.trim();
        const roll = document.createElement('span');
        roll.className = 'roll';
        roll.innerHTML = `<span data-text="${label}">${label}</span>`;
        a.replaceChild(roll, text);
      }
      li.addEventListener('mouseenter', () => place(li));
      a.addEventListener('focus', () => place(li));
      if (!reduce) {
        a.addEventListener('mousemove', (e) => {
          const r = a.getBoundingClientRect();
          a.style.setProperty('--tx', ((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1) + 'px');
          a.style.setProperty('--ty', ((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1) + 'px');
        });
        a.addEventListener('mouseleave', () => { a.style.setProperty('--tx', '0px'); a.style.setProperty('--ty', '0px'); });
      }
    });
    const rest = () => place(current && current.closest('li'), !!current);
    requestAnimationFrame(rest);
    addEventListener('load', rest);
    if (document.fonts) document.fonts.ready.then(rest);
    addEventListener('resize', rest);
    nav.addEventListener('mouseleave', rest);

    nav.querySelectorAll('[data-mega]').forEach((mega) => {
      const slides = mega.querySelectorAll('.mp-slide');
      mega.querySelectorAll('[data-preview]').forEach((a) => {
        const show = () => slides.forEach((s, i) => s.classList.toggle('is-on', i === +a.dataset.preview));
        a.addEventListener('mouseenter', show);
        a.addEventListener('focus', show);
        a.addEventListener('mousemove', (e) => {
          const r = a.getBoundingClientRect();
          a.style.setProperty('--mx', e.clientX - r.left + 'px');
          a.style.setProperty('--my', e.clientY - r.top + 'px');
        });
      });
    });
  }

  // Cursor-tracking glow on cards
  document.querySelectorAll('[data-spot]').forEach((el) => el.addEventListener('mousemove', (e) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', e.clientX - r.left + 'px');
    el.style.setProperty('--my', e.clientY - r.top + 'px');
  }));

  // Magnetic buttons
  if (!reduce) document.querySelectorAll('[data-magnetic]').forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--tx', ((e.clientX - r.left - r.width / 2) * 0.25).toFixed(1) + 'px');
      el.style.setProperty('--ty', ((e.clientY - r.top - r.height / 2) * 0.35).toFixed(1) + 'px');
    });
    el.addEventListener('mouseleave', () => { el.style.setProperty('--tx', '0px'); el.style.setProperty('--ty', '0px'); });
  });

  // ---- Hero ribbon: hundreds of light threads twisting through the frame ----
  document.querySelectorAll('[data-ribbon]').forEach((canvas) => {
    const ctx = canvas.getContext('2d');
    const stage = canvas.closest('section') || canvas.parentElement;
    const spot = stage.querySelector('.spot');
    const isHero = canvas.dataset.ribbon === 'hero';
    const LINES = isHero ? 84 : 48;
    const STEPS = isHero ? 150 : 110;
    let w = 0, h = 0, visible = true, started = performance.now();
    const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999, f: 0, tf: 0 };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    addEventListener('resize', resize);

    stage.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.tx = e.clientX - r.left; mouse.ty = e.clientY - r.top; mouse.tf = 1;
      if (spot) { spot.style.setProperty('--sx', mouse.tx + 'px'); spot.style.setProperty('--sy', mouse.ty + 'px'); }
    });
    stage.addEventListener('pointerleave', () => { mouse.tf = 0; });

    const y = (x, t, time) => {
      const u = x / w;
      const base = isHero ? h * (0.86 - 0.5 * u) : h * (0.78 - 0.3 * u);
      const amp = h * (isHero ? 0.17 : 0.12);
      const a = Math.sin(u * 4.6 + time * 0.42) * amp;
      const b = Math.sin(u * 3.7 - time * 0.33 + 2.2) * amp * 1.15;
      const spread = h * 0.11 * (0.55 + 0.45 * Math.sin(u * 2.6 + time * 0.27));
      let v = base + a * (1 - t) + b * t + (t - 0.5) * spread * 2 + Math.sin(u * 13 + t * 5 + time * 0.7) * 3;
      if (mouse.f > 0.01) {
        const dx = x - mouse.x, dy = v - mouse.y;
        const g = Math.exp(-(dx * dx) / 52000) * Math.exp(-(dy * dy) / 26000);
        v += Math.sign(dy || 1) * 70 * g * mouse.f;
      }
      return v;
    };

    const packets = Array.from({ length: isHero ? 6 : 3 }, () => ({ line: 0, p: 0, v: 0, trail: [] }));
    const reset = (pk) => { pk.line = (Math.random() * LINES) | 0; pk.p = -Math.random() * 0.4; pk.v = 0.0018 + Math.random() * 0.0024; pk.trail = []; };
    packets.forEach(reset);

    const ease = (k) => 1 - Math.pow(1 - k, 3);
    let raf = 0;
    const schedule = () => { if (!raf) raf = requestAnimationFrame(draw); };
    const draw = (now) => {
      raf = 0;
      const time = now / 1000;
      mouse.x += (mouse.tx - mouse.x) * 0.12; mouse.y += (mouse.ty - mouse.y) * 0.12; mouse.f += (mouse.tf - mouse.f) * 0.06;
      // Threads draw in from the left once the curtain lifts
      const reveal = reduce ? 1 : ease(Math.min(1, Math.max(0, (now - started - (isHero ? 900 : 200)) / 2400)));
      ctx.clearRect(0, 0, w, h);
      const xMax = -60 + (w + 120) * reveal;
      for (let i = 0; i < LINES; i++) {
        const t = i / (LINES - 1);
        const accent = i % 11 === 5;
        const edge = Math.pow(Math.sin(t * Math.PI), 1.6);
        ctx.beginPath();
        for (let s = 0; s <= STEPS; s++) {
          const x = -60 + (s / STEPS) * (w + 120);
          if (x > xMax) break;
          const yy = y(x, t, time);
          s ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy);
        }
        ctx.lineWidth = accent ? 1.2 : 0.8;
        ctx.strokeStyle = accent ? `rgba(20,175,186,${0.4 + 0.4 * edge})` : `rgba(11,12,14,${0.06 + 0.26 * edge})`;
        ctx.stroke();
      }
      // Signals travelling along the threads: the "handover"
      if (reveal > 0.6) for (const pk of packets) {
        pk.p += pk.v;
        if (pk.p > 1.05) reset(pk);
        if (pk.p < 0) continue;
        const x = -60 + pk.p * (w + 120);
        const yy = y(x, pk.line / (LINES - 1), time);
        pk.trail.push([x, yy]);
        if (pk.trail.length > 26) pk.trail.shift();
        for (let k = 1; k < pk.trail.length; k++) {
          ctx.beginPath();
          ctx.moveTo(pk.trail[k - 1][0], pk.trail[k - 1][1]);
          ctx.lineTo(pk.trail[k][0], pk.trail[k][1]);
          ctx.strokeStyle = `rgba(40,200,210,${(k / pk.trail.length) * 0.95})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        const g = ctx.createRadialGradient(x, yy, 0, x, yy, 16);
        g.addColorStop(0, 'rgba(92,225,230,.95)'); g.addColorStop(1, 'rgba(92,225,230,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, yy, 16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, yy, 2, 0, Math.PI * 2); ctx.fill();
      }
      if (visible && !reduce) schedule();
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        if (visible && !reduce) schedule();
      }).observe(canvas);
    }
    addEventListener('resize', schedule);
    schedule();
  });

  // Reveal on scroll
  const targets = document.querySelectorAll('.reveal, [data-animate]');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in-view'); io.unobserve(e.target); }
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    targets.forEach((t) => io.observe(t));
  } else {
    targets.forEach((t) => t.classList.add('in-view'));
  }

  // Widescreen "reveal shot": scales up to full size as it scrolls into view
  const screen = document.querySelector('[data-screen]');
  if (screen && !reduce) {
    let ticking = false;
    const update = () => {
      const r = screen.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, 1 - (r.top - innerHeight * 0.25) / (innerHeight * 0.75)));
      screen.style.setProperty('--s', (0.9 + p * 0.1).toFixed(4));
      ticking = false;
    };
    update();
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  }

  // Running timecode in the hero
  const tc = document.querySelector('[data-timecode]');
  if (tc && !reduce) {
    const start = performance.now();
    const pad = (n) => String(n).padStart(2, '0');
    const tick = (now) => {
      const t = (now - start) / 1000;
      tc.textContent = `${pad(Math.floor(t / 3600))}:${pad(Math.floor(t / 60) % 60)}:${pad(Math.floor(t) % 60)}:${pad(Math.floor((t % 1) * 24))}`;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // Tabs (pricing). Without JS every panel is visible, so content stays crawlable.
  document.querySelectorAll('[data-tabs]').forEach((group) => {
    const tabs = [...group.querySelectorAll('[role="tab"]')];
    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', on);
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      if (focus) tab.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => { select(t); history.replaceState(null, '', '#' + t.dataset.hash); });
      t.addEventListener('keydown', (e) => {
        const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (d) { e.preventDefault(); select(tabs[(i + d + tabs.length) % tabs.length], true); }
      });
    });
    const fromHash = tabs.find((t) => '#' + t.dataset.hash === location.hash);
    select(fromHash || tabs[0]);
  });

  // Currency toggle (product pricing)
  document.querySelectorAll('[data-currency-scope]').forEach((scope) => {
    const btns = scope.querySelectorAll('[data-currency]');
    btns.forEach((b) => b.addEventListener('click', () => {
      btns.forEach((x) => x.setAttribute('aria-pressed', x === b));
      scope.querySelectorAll('[data-zar]').forEach((el) => { el.innerHTML = el.dataset[b.dataset.currency]; });
    }));
  });

  // Pre-select a service on the contact form from ?service=
  const svc = new URLSearchParams(location.search).get('service');
  const svcSelect = document.querySelector('#service');
  if (svc && svcSelect) [...svcSelect.options].forEach((o) => { if (o.value === svc) o.selected = o.defaultSelected = true; });

  // Contact forms post to their own Formspree endpoint (form action).
  // Main contact page → Handover form; DepotTrack / HitchPoint pages → their product forms.
  document.querySelectorAll('[data-contact-form]').forEach((form) => {
    const status = form.querySelector('.form-status');
    const button = form.querySelector('button[type="submit"]');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const data = new FormData(form);
      if (data.get('_gotcha')) return;
      const choice = form.querySelector('select[name="service"] option:checked');
      if (choice && choice.value) data.set('_subject', `Handover Technologies website enquiry: ${choice.textContent.trim()}`);
      data.set('page', location.pathname);

      button.disabled = true;
      status.className = 'form-status';
      status.textContent = 'Sending…';
      try {
        const res = await fetch(form.action, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error();
        form.reset();
        status.className = 'form-status ok';
        status.textContent = 'Thank you, your message has been sent. We’ll be in touch within one business day.';
      } catch {
        status.className = 'form-status err';
        status.textContent = 'Sorry, your message could not be sent. Please check your connection and try again.';
      } finally {
        button.disabled = false;
      }
    });
  });
})();
