/* ============================================================
   Inland fisheries study: interactions
   Edit the DATA sections (SURVEY, SPECIES, QUIZ) to match your project.
   ============================================================ */

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Mobile menu ---------- */
(function () {
  const btn = document.querySelector('.menu-btn');
  const nav = document.querySelector('.nav');
  if (!btn || !nav) return;
  btn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
  });
})();

/* ---------- Depth gauge: the page gets deeper as you scroll ---------- */
(function () {
  const gauge = document.querySelector('.gauge');
  const mark = document.querySelector('.gauge-mark');
  if (!gauge || !mark) return;
  const [from, to] = (document.body.dataset.depth || '0,1').split(',').map(Number);
  function update() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    mark.style.top = (p * 100) + '%';
    mark.textContent = (from + (to - from) * p).toFixed(1) + ' m';
  }
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();

/* ---------- Home: the live pond ---------- */
(function () {
  const pond = document.querySelector('.pond');
  if (!pond) return;
  const canvas = pond.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const eatenEl = pond.querySelector('[data-eaten]');
  const feedBtn = pond.querySelector('[data-feed]');
  const SURFACE = 30;
  const COLORS = ['#f2a53b', '#e4ebe8', '#c4da6c', '#d46a4a', '#f0d27a', '#b9c9c4'];

  let w = 0, h = 0, eaten = 0, visible = true, last = 0;
  const fish = [], pellets = [], bubbles = [], ripples = [];
  const stalks = Array.from({ length: 26 }, () => ({ x: Math.random(), hgt: 40 + Math.random() * 90, sway: Math.random() * 6 }));
  const pebbles = Array.from({ length: 60 }, () => ({ x: Math.random(), r: 3 + Math.random() * 7, s: Math.random() }));
  const weed = Array.from({ length: 34 }, () => ({ x: Math.random(), r: 4 + Math.random() * 7, o: Math.random() * 6 }));

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = pond.clientWidth; h = pond.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const want = Math.max(5, Math.min(9, Math.round(w / 170)));
    while (fish.length < want) fish.push(makeFish());
    fish.length = want;
    fish.forEach(f => { f.x = Math.min(f.x, w - 20); f.y = Math.min(f.y, h - 70); });
    if (REDUCED) draw(0);
  }

  function makeFish() {
    const a = Math.random() * Math.PI * 2;
    return {
      x: Math.random() * (w || 800), y: SURFACE + 80 + Math.random() * ((h || 600) - 260),
      angle: a, wa: a, speed: .5 + Math.random() * .6, size: 13 + Math.random() * 14,
      color: COLORS[Math.floor(Math.random() * COLORS.length)], phase: Math.random() * 6
    };
  }

  function wrap(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }

  function drop(x) {
    ripples.push({ x, r: 4, a: 1 });
    for (let i = 0; i < 5; i++) {
      pellets.push({ x: x + (Math.random() - .5) * 36, y: SURFACE + 2 + Math.random() * 10, vy: .4 + Math.random() * .3, rest: 0 });
    }
  }

  function step(dt) {
    for (const f of fish) {
      let tx = null, ty = null, best = Infinity;
      for (const p of pellets) {
        const d = (p.x - f.x) ** 2 + (p.y - f.y) ** 2;
        if (d < best) { best = d; tx = p.x; ty = p.y; }
      }
      const chasing = tx !== null && best < 480 * 480;
      let desired;
      if (chasing) {
        desired = Math.atan2(ty - f.y, tx - f.x);
      } else {
        f.wa += (Math.random() - .5) * .16;
        let dx = Math.cos(f.wa), dy = Math.sin(f.wa);
        if (f.y < SURFACE + 60) dy = Math.abs(dy) + .4;
        if (f.y > h - 80) dy = -Math.abs(dy) - .4;
        if (f.x < 40) dx = Math.abs(dx) + .3;
        if (f.x > w - 40) dx = -Math.abs(dx) - .3;
        desired = Math.atan2(dy, dx);
        f.wa = desired;
      }
      f.angle += wrap(desired - f.angle) * (chasing ? .09 : .04) * dt;
      const sp = f.speed * (chasing ? 2.6 : 1);
      f.x += Math.cos(f.angle) * sp * dt;
      f.y += Math.sin(f.angle) * sp * dt;
      f.phase += (.13 + sp * .1) * dt;
      if (chasing && best < (f.size * .9) ** 2) {
        const i = pellets.findIndex(p => (p.x - tx) ** 2 + (p.y - ty) ** 2 < 4);
        if (i > -1) {
          pellets.splice(i, 1);
          eaten++;
          if (eatenEl) eatenEl.textContent = eaten;
          bubbles.push({ x: f.x, y: f.y, r: 2 + Math.random() * 2, vy: .6 });
        }
      }
    }
    for (let i = pellets.length - 1; i >= 0; i--) {
      const p = pellets[i];
      if (p.y < h - 26) p.y += p.vy * dt; else { p.rest += dt; if (p.rest > 420) pellets.splice(i, 1); }
    }
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i]; b.y -= b.vy * dt; b.x += Math.sin(b.y / 14) * .2;
      if (b.y < SURFACE) bubbles.splice(i, 1);
    }
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i]; r.r += 1.1 * dt; r.a -= .012 * dt; if (r.a <= 0) ripples.splice(i, 1);
    }
    if (Math.random() < .03 * dt) {
      const s = stalks[Math.floor(Math.random() * stalks.length)];
      bubbles.push({ x: s.x * w, y: h - 26, r: 1.5 + Math.random() * 2.5, vy: .5 + Math.random() * .5 });
    }
  }

  function drawFish(f) {
    const s = f.size, tw = Math.sin(f.phase) * s * .28;
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.angle);
    if (Math.cos(f.angle) < 0) ctx.scale(1, -1);
    ctx.fillStyle = f.color;
    ctx.beginPath();
    ctx.moveTo(s, 0);
    ctx.bezierCurveTo(s * .6, -s * .55, -s * .3, -s * .5, -s * .7, 0);
    ctx.lineTo(-s * 1.15, -s * .4 + tw);
    ctx.quadraticCurveTo(-s * .95, tw * .5, -s * 1.15, s * .4 + tw);
    ctx.lineTo(-s * .7, 0);
    ctx.bezierCurveTo(-s * .3, s * .5, s * .6, s * .55, s, 0);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.beginPath();
    ctx.ellipse(s * .05, s * .12, s * .5, s * .16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#10201e';
    ctx.beginPath(); ctx.arc(s * .62, -s * .1, Math.max(1.6, s * .09), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    // sky strip with wavy water surface
    ctx.fillStyle = '#cfe4de';
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(w, 0); ctx.lineTo(w, SURFACE);
    for (let x = w; x > 0; x -= 8) ctx.lineTo(x, SURFACE + Math.sin(x / 38 + t / 900) * 2.2);
    ctx.lineTo(0, SURFACE + Math.sin(t / 900) * 2.2);
    ctx.closePath(); ctx.fill();
    // duckweed on the surface
    ctx.fillStyle = '#9dbb4a';
    for (const d of weed) {
      const x = ((d.x * w + Math.sin(t / 3000 + d.o) * 8) + w) % w;
      ctx.beginPath(); ctx.ellipse(x, SURFACE + 1, d.r, d.r * .38, 0, 0, Math.PI * 2); ctx.fill();
    }
    // ripples
    for (const r of ripples) {
      ctx.strokeStyle = 'rgba(255,255,255,' + (r.a * .7).toFixed(2) + ')';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(r.x, SURFACE + 2, r.r, r.r * .22, 0, 0, Math.PI * 2); ctx.stroke();
    }
    // plant stalks
    ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(120,160,70,.75)';
    for (const s of stalks) {
      const x = s.x * w, sw = Math.sin(t / 900 + s.sway) * 9;
      ctx.beginPath(); ctx.moveTo(x, h - 20);
      ctx.quadraticCurveTo(x + sw * .4, h - 20 - s.hgt * .5, x + sw, h - 20 - s.hgt);
      ctx.stroke();
    }
    // bubbles
    ctx.fillStyle = 'rgba(255,255,255,.28)';
    for (const b of bubbles) { ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); }
    for (const f of fish) drawFish(f);
    // feed pellets
    ctx.fillStyle = '#f2a53b';
    for (const p of pellets) { ctx.beginPath(); ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2); ctx.fill(); }
    // pond bed
    ctx.fillStyle = '#4a4833';
    ctx.fillRect(0, h - 22, w, 22);
    for (const p of pebbles) {
      ctx.fillStyle = p.s > .5 ? '#6b6748' : '#37352a';
      ctx.beginPath(); ctx.ellipse(p.x * w, h - 18 + p.s * 8, p.r, p.r * .6, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  function loop(t) {
    if (!visible) return;
    const dt = Math.min(2.5, (t - last) / 16.67 || 1);
    last = t;
    step(dt);
    draw(t);
    requestAnimationFrame(loop);
  }

  resize();
  window.addEventListener('resize', resize);

  if (REDUCED) { pond.classList.add('static'); return; }

  pond.addEventListener('pointerdown', e => {
    if (e.target.closest('a, button')) return;
    drop(e.clientX - pond.getBoundingClientRect().left);
  });
  if (feedBtn) feedBtn.addEventListener('click', () => drop(w * .15 + Math.random() * w * .7));

  new IntersectionObserver(([en]) => {
    const was = visible;
    visible = en.isIntersecting;
    if (visible && !was) { last = performance.now(); requestAnimationFrame(loop); }
  }).observe(pond);

  requestAnimationFrame(loop);
})();

/* ---------- About: where each fish lives in the pond ---------- */
/* zone: 1 surface, 2 mid-water, 3 bottom.  seen: set true for fish you actually recorded. */
const SPECIES = [
  { name: 'Catla', color: '#f2a53b', zone: 1, x: 24, seen: false,
    eats: 'Tiny floating animals (zooplankton) near the top.',
    body: 'Wide head and an upturned mouth, built for feeding at the surface.',
    role: 'Takes the top layer of the pond.' },
  { name: 'Rohu', color: '#d46a4a', zone: 2, x: 52, seen: true, photo: 'images/fish-harvest-2.jpg',
    eats: 'Plankton and soft plant matter floating in the middle layer.',
    body: 'Small mouth at the front, a good all-round pond fish.',
    role: 'Takes the middle layer.' },
  { name: 'Prawn', shape: 'prawn', color: '#e6a37c', zone: 3, x: 82, seen: true, photo: 'images/prawn-harvest-crates.jpg',
    eats: 'Formulated feed pellets, plus natural food found on the pond bottom.',
    body: 'Not a fish: a shelled animal (a crustacean) that sheds its shell as it grows.',
    role: 'A higher-value crop, but more sensitive to water quality and disease than carp.' },
  { name: 'Mrigal', color: '#b98ad6', zone: 3, x: 62, seen: false,
    eats: 'Rotting plant matter and tiny organisms on the pond bottom.',
    body: 'Small mouth near the underside of the head, built for feeding from the bed.',
    role: 'Takes the bottom layer, so it does not compete much with Catla and Rohu.' },
  { name: 'Grass carp', color: '#c4da6c', zone: 2, x: 24, seen: false,
    eats: 'Water plants and weeds.',
    body: 'Long, rounded body with strong teeth in the throat for chewing plants.',
    role: 'Keeps weed growth in check.' },
  { name: 'Common carp', color: '#f0d27a', zone: 3, x: 22, seen: false,
    eats: 'Insects, worms and almost anything on the bottom.',
    body: 'Feeds by digging in the mud.',
    role: 'Can cloud the water when too many are stocked.' },
  { name: 'Magur', color: '#8aa0a8', zone: 3, x: 42, seen: false,
    eats: 'Insects, small fish and feed pellets.',
    body: 'A catfish that can breathe air, so it copes with shallow, low-oxygen water.',
    role: 'Suits small, shallow ponds.' }
];
const ZONE_Y = { 1: 20, 2: 50, 3: 78 };
const ZONE_NAME = { 1: 'Surface', 2: 'Mid-water', 3: 'Bottom' };
const PRAWN_SVG = '<svg viewBox="0 0 64 32" aria-hidden="true"><path d="M52 12C44 3 24 4 14 14c-5 5-6 11-3 15l5-3c-1-4 1-8 6-10 8-4 18-3 23 2 3-1 5-4 7-6z" fill="currentColor"/><path d="M11 29l-7 1 4-6zM52 12c4-3 8-5 11-10M53 14c5-1 8-3 10-6" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"/><circle cx="50" cy="12" r="1.6" fill="#10201e"/></svg>';
const FISH_SVG = '<svg viewBox="0 0 64 32" aria-hidden="true"><path d="M60 16C48 4 24 4 14 14L2 6l4 10-4 10 12-8c10 10 34 10 46-2z" fill="currentColor"/><circle cx="50" cy="13" r="2" fill="#10201e"/></svg>';

(function () {
  const lab = document.getElementById('lab');
  if (!lab) return;
  const column = lab.querySelector('.column');
  const picks = lab.querySelector('.species');
  const detail = lab.querySelector('.detail');
  const marks = SPECIES.map(s => {
    const m = document.createElement('div');
    m.className = 'fishmark';
    m.style.color = s.color;
    m.style.left = s.x + '%';
    m.style.top = ZONE_Y[s.zone] + '%';
    m.innerHTML = (s.shape === 'prawn' ? PRAWN_SVG : FISH_SVG) + '<span>' + s.name + '</span>';
    column.appendChild(m);
    return m;
  });
  const chips = SPECIES.map((s, i) => {
    const b = document.createElement('button');
    b.className = 'chip'; b.type = 'button'; b.textContent = s.name;
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => show(i));
    picks.appendChild(b);
    return b;
  });
  const cmp = document.createElement('button');
  cmp.className = 'chip compare'; cmp.type = 'button';
  cmp.textContent = 'Show Catla, Rohu and Prawn together';
  cmp.setAttribute('aria-pressed', 'false');
  picks.appendChild(cmp);

  function reset() { chips.forEach(c => c.setAttribute('aria-pressed', 'false')); cmp.setAttribute('aria-pressed', 'false'); marks.forEach(m => m.classList.remove('on')); }

  function show(i) {
    reset();
    const s = SPECIES[i];
    chips[i].setAttribute('aria-pressed', 'true');
    marks[i].classList.add('on');
    detail.innerHTML = '<h3>' + s.name + '</h3><p>Usually feeds at the <strong>' + ZONE_NAME[s.zone].toLowerCase() + '</strong> of the pond.</p>' +
      '<dl><div><dt>What it eats</dt><dd>' + s.eats + '</dd></div><div><dt>Body</dt><dd>' + s.body + '</dd></div><div><dt>Role in the pond</dt><dd>' + s.role + '</dd></div></dl>' +
      (s.seen ? '<span class="seen">We saw this on our field visits</span>' : '') +
      (s.photo ? '<img class="species-photo" src="' + s.photo + '" alt="' + s.name + ' from our field visit" loading="lazy"><p class="cap">Photo from our field visit</p>' : '');
  }

  cmp.addEventListener('click', () => {
    reset();
    cmp.setAttribute('aria-pressed', 'true');
    ['Catla', 'Rohu', 'Prawn'].forEach(n => marks[SPECIES.findIndex(s => s.name === n)].classList.add('on'));
    detail.innerHTML = '<h3>Two fish and a prawn, one pond</h3><p>Catla feed at the top, Rohu in the middle and prawns on the bottom. Because they use different layers, they share the pond without competing much for food, so one pond can give more produce.</p>';
  });

  show(0);
})();

/* ---------- Findings: survey bars ---------- */
/* Replace these with your real survey numbers (percentages) and set isSample to false. */
const SURVEY = {
  isSample: true,
  questions: [
    { q: 'Which fish do farmers raise most?', rows: [['Rohu', 42], ['Catla', 31], ['Prawn', 18], ['Other', 9]] },
    { q: 'What is the biggest problem?', rows: [['Feed cost', 38], ['Water quality', 27], ['Low market price', 22], ['Disease', 13]] },
    { q: 'Do you know about government schemes?', rows: [['No', 40], ['Yes', 35], ['Partly', 25]] }
  ]
};

(function () {
  const host = document.getElementById('charts');
  if (!host) return;
  const note = document.getElementById('sample-note');
  if (note) note.hidden = !SURVEY.isSample;
  SURVEY.questions.forEach(qs => {
    const box = document.createElement('div');
    box.className = 'chart';
    box.innerHTML = '<h3></h3>';
    box.querySelector('h3').textContent = qs.q;
    const max = Math.max(...qs.rows.map(r => r[1]));
    qs.rows.forEach(([label, val]) => {
      const row = document.createElement('div');
      row.className = 'bar-row';
      row.innerHTML = '<span></span><span class="track"><span class="fill" data-w="' + (val / max * 100) + '"></span></span><span class="v">' + val + '%</span>';
      row.firstChild.textContent = label;
      box.appendChild(row);
    });
    host.appendChild(box);
  });
  const fills = host.querySelectorAll('.fill');
  const grow = el => { el.style.width = el.dataset.w + '%'; };
  if (REDUCED || !('IntersectionObserver' in window)) { fills.forEach(grow); return; }
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.querySelectorAll('.fill').forEach(grow); io.unobserve(en.target); } });
  }, { threshold: .3 });
  host.querySelectorAll('.chart').forEach(c => io.observe(c));
})();

/* ---------- Findings: pond income estimator ---------- */
(function () {
  const form = document.getElementById('calc');
  if (!form) return;
  const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');
  const out = id => document.getElementById(id);
  function calc() {
    const v = n => Math.max(0, parseFloat(form.elements[n].value) || 0);
    const harvest = v('acres') * v('seed') * (v('survival') / 100) * v('weight');
    const revenue = harvest * v('price');
    const costs = v('acres') * v('seed') * v('seedcost') + harvest * v('other');
    const profit = revenue - costs;
    out('r-harvest').textContent = Math.round(harvest).toLocaleString('en-IN') + ' kg';
    out('r-revenue').textContent = inr(revenue);
    out('r-costs').textContent = inr(costs);
    const big = out('r-profit');
    big.textContent = (profit < 0 ? '-' : '') + inr(Math.abs(profit));
    big.classList.toggle('loss', profit < 0);
    out('r-label').textContent = profit < 0 ? 'Estimated loss in one season' : 'Estimated profit in one season';
    const costPct = revenue > 0 ? Math.min(100, costs / revenue * 100) : 100;
    out('bar-cost').style.width = costPct + '%';
    out('bar-gain').style.width = (profit > 0 ? 100 - costPct : 0) + '%';
  }
  form.addEventListener('input', calc);
  calc();
})();

/* ---------- Activities: awareness quiz ---------- */
const QUIZ = [
  { q: 'Which fish usually feeds near the surface of a pond?', o: ['Catla', 'Prawn', 'Common carp'], a: 0,
    why: 'Catla has an upturned mouth and eats tiny animals floating near the top.' },
  { q: 'When is the oxygen in pond water usually lowest?', o: ['Noon', 'Just before sunrise', 'Late afternoon'], a: 1,
    why: 'Plants and plankton make oxygen only in daylight. By dawn the night has used it up, so fish gasping at the surface early in the morning is a warning sign.' },
  { q: 'Why should farmers avoid overfeeding?', o: ['Fish grow too fast', 'Leftover feed rots and spoils the water', 'Feed floats away'], a: 1,
    why: 'Uneaten feed decays, uses up oxygen and wastes money.' },
  { q: 'The pond water turns dark and smells foul. What is the best first step?', o: ['Add more feed', 'Ignore it for a week', 'Stop feeding and ask the local fisheries officer'], a: 2,
    why: 'Bad water can kill fish quickly. Cut feeding at once and get expert advice.' },
  { q: 'Why can Catla, Rohu and prawn share one pond?', o: ['They look alike', 'They feed in different layers of the pond', 'They only eat each other'], a: 1,
    why: 'Using the top, middle and bottom layers lets one pond support more.' }
];

(function () {
  const box = document.getElementById('quiz');
  if (!box) return;
  let i = 0, score = 0;
  function ask() {
    const q = QUIZ[i];
    box.innerHTML = '<p class="count">Question ' + (i + 1) + ' of ' + QUIZ.length + '</p><h3></h3><div class="opts"></div><div class="after" aria-live="polite"></div>';
    box.querySelector('h3').textContent = q.q;
    const opts = box.querySelector('.opts');
    q.o.forEach((text, n) => {
      const b = document.createElement('button');
      b.className = 'opt'; b.type = 'button'; b.textContent = text;
      b.addEventListener('click', () => pick(n));
      opts.appendChild(b);
    });
  }
  function pick(n) {
    const q = QUIZ[i];
    const btns = box.querySelectorAll('.opt');
    btns.forEach((b, k) => { b.disabled = true; if (k === q.a) b.classList.add('right'); else if (k === n) b.classList.add('wrong'); });
    if (n === q.a) score++;
    const after = box.querySelector('.after');
    after.innerHTML = '<p class="why"></p><button class="btn small" type="button"></button>';
    after.querySelector('.why').textContent = (n === q.a ? 'Correct. ' : 'Not quite. ') + q.why;
    const next = after.querySelector('button');
    next.textContent = i < QUIZ.length - 1 ? 'Next question' : 'See my score';
    next.addEventListener('click', () => { i++; i < QUIZ.length ? ask() : done(); });
    next.focus();
  }
  function done() {
    const msg = score === QUIZ.length ? 'Pond expert.' : score >= 3 ? 'Good water sense.' : 'Worth another read of the About page.';
    box.innerHTML = '<p class="count">Quiz finished</p><p class="score">' + score + ' / ' + QUIZ.length + '</p><p class="why">' + msg + '</p><button class="btn small" type="button">Play again</button>';
    box.querySelector('button').addEventListener('click', () => { i = 0; score = 0; ask(); });
  }
  ask();
})();

/* ---------- Gallery: missing-photo placeholders and lightbox ---------- */
(function () {
  const figs = document.querySelectorAll('.gallery figure');
  if (!figs.length) return;
  const lb = document.querySelector('.lightbox');
  const lbImg = lb && lb.querySelector('img');
  figs.forEach(f => {
    const img = f.querySelector('img');
    const ph = f.querySelector('.ph');
    const miss = () => { f.classList.add('missing'); if (ph) ph.textContent = 'Add your photo as ' + img.getAttribute('src'); };
    if (img.complete && img.naturalWidth === 0) miss();
    img.addEventListener('error', miss);
    f.addEventListener('click', () => {
      if (f.classList.contains('missing') || !lb) return;
      lbImg.src = img.src; lbImg.alt = img.alt; lb.classList.add('open');
    });
  });
  if (lb) {
    lb.addEventListener('click', () => lb.classList.remove('open'));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') lb.classList.remove('open'); });
  }
})();

/* ---------- Gallery: filter by category (also reads #fish, #prawns from links) ---------- */
(function () {
  const chips = document.querySelectorAll('.filters .chip');
  if (!chips.length) return;
  const figs = document.querySelectorAll('.gallery figure');
  function apply(f) {
    chips.forEach(c => c.setAttribute('aria-pressed', String(c.dataset.filter === f)));
    figs.forEach(g => { g.hidden = !(f === 'all' || g.dataset.cat === f); });
  }
  chips.forEach(c => c.addEventListener('click', () => {
    apply(c.dataset.filter);
    try { history.replaceState(null, '', c.dataset.filter === 'all' ? location.pathname : '#' + c.dataset.filter); } catch (e) {}
  }));
  const h = location.hash.slice(1);
  apply([...chips].some(c => c.dataset.filter === h) ? h : 'all');
})();

/* ---------- Contact form: opens the visitor's email app ---------- */
(function () {
  const form = document.getElementById('contact-form');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const subject = encodeURIComponent('Message from ' + form.elements.name.value.trim() + ' about the inland fisheries study');
    const body = encodeURIComponent(form.elements.message.value.trim());
    window.location.href = 'mailto:' + form.dataset.email + '?subject=' + subject + '&body=' + body;
  });
})();


/* ---------- Single page: highlight the current section, back to top ---------- */
(function () {
  const links = [...document.querySelectorAll('.nav a[href^="#"]')];
  const top = document.querySelector('.to-top');
  if (!links.length) return;
  const targets = links.map(a => document.getElementById(a.getAttribute('href').slice(1)));
  function update() {
    const y = window.scrollY + 140;
    let cur = 0;
    targets.forEach((t, i) => { if (t && t.offsetTop <= y) cur = i; });
    links.forEach((a, i) => a.classList.toggle('on', i === cur));
    if (top) top.hidden = window.scrollY < 600;
  }
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  links.forEach(a => a.addEventListener('click', () => {
    const nav = document.querySelector('.nav'), btn = document.querySelector('.menu-btn');
    if (nav) nav.classList.remove('open');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }));
  update();
})();
