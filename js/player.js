// Плеєр тренування: таймер, підказки, звук і голос
const Player = (() => {
  let wakeLock = null, feel = null, steps = [], i = 0, endAt = 0, left = 0, paused = false, timer = null, person = null, session = null, startedAt = 0, audio = null, spokenAt = -1;
  const PH = { ready: 'Приготуйтесь', warm: 'Розминка', main: 'Робота', rest: 'Відпочинок', round: 'Перерва між колами', cool: 'Заминка' };

  function build(s) {
    const out = [{ ph: 'ready', id: s.warm[0], dur: 8 }];
    s.warm.forEach(id => out.push({ ph: 'warm', id, dur: 40 }));
    for (let r = 1; r <= s.rounds; r++) {
      s.main.forEach((id, j) => {
        out.push({ ph: 'main', id, dur: s.work, round: r });
        const lastInRound = j === s.main.length - 1;
        if (!lastInRound) out.push({ ph: 'rest', id: s.main[j + 1], dur: s.rest, round: r });
        else if (r < s.rounds) out.push({ ph: 'round', id: s.main[0], dur: 45, round: r });
      });
    }
    out.push({ ph: 'rest', id: s.cool[0], dur: 10 });
    s.cool.forEach(id => out.push({ ph: 'cool', id, dur: 40 }));
    return out;
  }

  function start(p, s) {
    if (!s) return;
    person = p; session = s; steps = build(s); i = 0; paused = false; startedAt = Date.now();
    try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); } catch (e) { audio = null; }
    const el = document.createElement('div');
    el.id = 'player'; el.className = 'player';
    document.body.appendChild(el);
    document.body.classList.add('noscroll');
    document.addEventListener('keydown', onKey);
    el.addEventListener('click', onClick);
    begin();
    timer = setInterval(tick, 200);
    keepAwake();
  }

  // Не даємо екрану телефона згаснути під час тренування
  async function keepAwake() {
    try { if (navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen'); } catch (e) { wakeLock = null; }
  }
  document.addEventListener('visibilitychange', () => { if (timer && document.visibilityState === 'visible') keepAwake(); });

  function beep(freq = 880, len = 0.12) {
    if (!audio || !Store.state.settings.sound) return;
    const o = audio.createOscillator(), g = audio.createGain();
    o.frequency.value = freq; o.type = 'sine';
    g.gain.setValueAtTime(0.25, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + len);
    o.connect(g); g.connect(audio.destination);
    o.start(); o.stop(audio.currentTime + len);
  }

  function say(text) {
    if (!Store.state.settings.voice || !window.speechSynthesis) return;
    const voices = speechSynthesis.getVoices();
    const v = voices.find(x => x.lang && x.lang.toLowerCase().startsWith('uk'));
    if (!v) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = v; u.lang = v.lang; u.rate = 1.05;
    speechSynthesis.speak(u);
  }

  function begin() {
    const s = steps[i];
    left = s.dur * 1000; endAt = Date.now() + left; spokenAt = -1;
    const e = EX_BY_ID[s.id];
    if (s.ph === 'ready') say('Приготуйтесь. Розминка. ' + e.name);
    else if (s.ph === 'rest' || s.ph === 'round') say((s.ph === 'round' ? 'Перерва. ' : 'Відпочинок. ') + 'Далі: ' + e.name);
    else {
      beep(1200, 0.25);
      const prevPh = steps[i - 1] && steps[i - 1].ph;
      say(s.ph === 'main' && (prevPh === 'rest' || prevPh === 'round') ? 'Почали!' : e.name);
    }
    draw();
  }

  function tick() {
    if (paused) return;
    const rem = endAt - Date.now();
    const sec = Math.ceil(rem / 1000);
    if (sec <= 3 && sec >= 1 && spokenAt !== sec) { spokenAt = sec; beep(660); }
    if (rem <= 0) { next(); return; }
    const t = document.getElementById('pl-time'), ring = document.getElementById('pl-ring');
    if (t) t.textContent = fmt(sec);
    if (ring) ring.style.strokeDashoffset = String(565 * (1 - rem / (steps[i].dur * 1000)));
    const tot = document.getElementById('pl-total');
    if (tot) tot.style.width = progressPct() + '%';
  }

  function progressPct() {
    const all = steps.reduce((s, x) => s + x.dur, 0);
    const done = steps.slice(0, i).reduce((s, x) => s + x.dur, 0) + (steps[i].dur - Math.max(0, (endAt - Date.now()) / 1000));
    return Math.min(100, done / all * 100);
  }

  const fmt = s => s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : String(Math.max(0, s));

  function next() { if (i < steps.length - 1) { i++; begin(); } else finish(); }
  function prev() { if (i > 0) { i--; begin(); } }
  function togglePause() {
    if (paused) { endAt = Date.now() + left; paused = false; } else { left = endAt - Date.now(); paused = true; }
    draw();
  }

  function draw() {
    const el = document.getElementById('player');
    if (!el) return;
    const s = steps[i], e = EX_BY_ID[s.id];
    const resting = s.ph === 'rest' || s.ph === 'round' || s.ph === 'ready';
    const nx = steps.slice(i + 1).find(x => x.ph !== 'rest' && x.ph !== 'round');
    const sec = Math.ceil((paused ? left : endAt - Date.now()) / 1000);
    el.innerHTML = `
      <div class="pl-top"><div class="pl-bar"><div id="pl-total" style="width:${progressPct()}%"></div></div>
        <div class="pl-head"><span class="pl-phase ${resting ? 'rest' : ''}">${PH[s.ph]}${s.round ? ` · коло ${s.round} з ${session.rounds}` : ''}</span>
        <button class="icon-btn" data-pl="close" title="Завершити">${App.icon(App.ICON.x)}</button></div></div>
      <div class="pl-body">
        <div class="pl-fig ${resting ? 'dim' : ''}">${Figures.render(e, { animate: !resting })}</div>
        <div class="pl-info">
          <div class="pl-label">${resting ? 'Далі' : ''}</div>
          <h2>${App.esc(e.name)}</h2>
          ${e.side && !resting ? '<div class="pill">Половину часу — на кожну сторону</div>' : ''}
          <ul class="pl-how">${e.how.map(x => `<li>${App.esc(x)}</li>`).join('')}</ul>
          <div class="pl-timer"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="90" class="ring-bg"/><circle id="pl-ring" cx="100" cy="100" r="90" class="ring ${resting ? 'rest' : ''}" style="stroke-dashoffset:${565 * (1 - (paused ? left : endAt - Date.now()) / (s.dur * 1000))}"/></svg>
            <div id="pl-time">${fmt(sec)}</div></div>
          <div class="pl-ctrl">
            <button class="icon-btn lg" data-pl="prev" title="Назад">${App.icon(App.ICON.chevl)}</button>
            <button class="btn primary lg" data-pl="pause">${paused ? App.icon(App.ICON.play) + ' Продовжити' : 'Пауза'}</button>
            <button class="icon-btn lg" data-pl="next" title="Пропустити">${App.icon(App.ICON.chev)}</button>
          </div>
          ${nx && !resting ? `<div class="pl-next">Далі: ${App.esc(EX_BY_ID[nx.id].name)}</div>` : ''}
          <div class="pl-keys">Пробіл — пауза · ← → — перемикання</div>
        </div>
      </div>`;
  }

  function finish() {
    clearInterval(timer); timer = null;
    beep(880, 0.15); setTimeout(() => beep(1320, 0.3), 180);
    say('Тренування завершено. Чудова робота!');
    const date = D.iso();
    mark(person.id, date);
    const others = Store.state.profiles.filter(p => p.id !== person.id && !(Store.state.logs.workouts[p.id] || {})[date]);
    const mins = Math.round((Date.now() - startedAt) / 60000);
    // до 3 вправ на повторення (без статики) — щоб бачити прогрес у силі
    const repEx = [...new Set(session.main)].filter(id => !EX_BY_ID[id].hold && EX_BY_ID[id].pat !== 'cardio').slice(0, 3);
    feel = null;
    const el = document.getElementById('player');
    el.innerHTML = `<div class="pl-done"><div class="logo big"><span>FIT</span>DUO</div><h1>Тренування завершено!</h1>
      <p class="muted">${App.esc(person.name)}, ${mins} хв роботи над собою. Відмічено в чек-листі.</p>
      <div class="pl-feel"><div class="sub">Як було?</div><div class="seg">
        ${[['easy', 'Легко'], ['ok', 'Нормально'], ['hard', 'Важко']].map(([v, l]) => `<button class="btn" data-pl="feel" data-v="${v}">${l}</button>`).join('')}</div></div>
      ${repEx.length ? `<div class="pl-reps"><div class="sub">Скільки повторень вийшло в останньому колі? (необовʼязково)</div>
        ${repEx.map(id => `<label><span>${App.esc(EX_BY_ID[id].name)}</span><input type="number" min="0" step="1" data-rep="${id}" placeholder="—"></label>`).join('')}</div>` : ''}
      ${others.map(o => `<button class="btn" data-pl="also" data-id="${o.id}">${App.esc(o.name)} теж ${o.sex === 'f' ? 'тренувалась' : 'тренувався'} — відмітити</button>`).join('')}
      <button class="btn primary lg" data-pl="exit">Готово</button></div>`;
  }

  // Зберігаємо оцінку й повторення; двічі поспіль «легко» чи «важко» — змінюємо складність
  function saveLog() {
    const st = Store.state, pid = person.id, date = D.iso();
    const reps = {};
    document.querySelectorAll('[data-rep]').forEach(i => { const v = parseInt(i.value, 10); if (v > 0) reps[i.dataset.rep] = v; });
    if (Object.keys(reps).length) ((st.logs.reps = st.logs.reps || {})[pid] = st.logs.reps[pid] || {})[date] = reps;
    if (!feel) { Store.save(); return ''; }
    const fl = ((st.logs.feel = st.logs.feel || {})[pid] = st.logs.feel[pid] || {});
    fl[date] = feel;
    const p = st.profiles.find(x => x.id === pid);
    const recent = Object.keys(fl).filter(d => !p.feelMark || d > p.feelMark).sort().slice(-2).map(d => fl[d]);
    let note = '';
    if (recent.length === 2 && recent.every(v => v === 'easy')) {
      const lvl = { beginner: 1, some: 2, regular: 3 }[p.level] || 1;
      const tgt = lvl + (Plan.phase(Math.min(Plan.weekNo(), Plan.PROGRAM_WEEKS)) - 1) * 0.5 + (p.boost || 0);
      if (tgt < 3 && (p.boost || 0) < 1) {
        p.boost = (p.boost || 0) + 1; note = 'Двічі легко — наступні тренування з складнішими варіантами вправ';
      } else if ((p.extraWork || 0) < 10) { p.extraWork = (p.extraWork || 0) + 5; note = 'Двічі легко — робота на 5 с довша, відпочинок коротший'; }
      if (note) p.feelMark = date;
    } else if (recent.length === 2 && recent.every(v => v === 'hard')) {
      if ((p.extraWork || 0) > 0) { p.extraWork -= 5; note = 'Двічі важко — повертаємо попередній темп'; }
      else if ((p.boost || 0) > -1) { p.boost = (p.boost || 0) - 1; note = 'Двічі важко — наступні тренування з легшими варіантами вправ'; }
      if (note) p.feelMark = date;
    }
    Store.save();
    return note;
  }

  function mark(pid, date) {
    const st = Store.state;
    (st.logs.workouts[pid] = st.logs.workouts[pid] || {})[date] = true;
    const c = (st.logs.check[pid] = st.logs.check[pid] || {});
    (c[date] = c[date] || {}).workout = true;
    Store.save();
  }

  function close() {
    clearInterval(timer); timer = null;
    if (window.speechSynthesis) speechSynthesis.cancel();
    if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
    document.removeEventListener('keydown', onKey);
    const el = document.getElementById('player');
    if (el) el.remove();
    document.body.classList.remove('noscroll');
    App.render();
  }

  function onClick(e) {
    const b = e.target.closest('[data-pl]');
    if (!b) return;
    const a = b.dataset.pl;
    if (a === 'pause') togglePause();
    else if (a === 'next') next();
    else if (a === 'prev') prev();
    else if (a === 'close') { if (!timer || confirm('Завершити тренування достроково?')) close(); }
    else if (a === 'exit') { const note = saveLog(); close(); if (note) App.toast(note); }
    else if (a === 'feel') {
      feel = b.dataset.v;
      b.parentNode.querySelectorAll('.btn').forEach(x => x.classList.toggle('primary', x === b));
    }
    else if (a === 'also') { mark(b.dataset.id, D.iso()); b.disabled = true; b.textContent = 'Відмічено'; }
  }

  function onKey(e) {
    if (!timer) return;
    if (e.code === 'Space') { e.preventDefault(); togglePause(); }
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'Escape' && confirm('Завершити тренування достроково?')) close();
  }

  if (window.speechSynthesis) speechSynthesis.getVoices();
  return { start };
})();
