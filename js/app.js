// Головний модуль: маршрути, екрани, події
const App = (() => {
  const ui = { route: 'today', week: null, day: null, wday: null, openMeal: null, cmpA: null, cmpB: null, cmpView: 'front' };
  const NAV = [
    ['today', 'Сьогодні', 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z'],
    ['food', 'Харчування', 'M4 3v8a3 3 0 0 0 3 3v7M7 3v6M10 3v8a3 3 0 0 1-3 3M17 21V3c-2 1-3 4-3 8h3'],
    ['calc', 'Калькулятор', 'M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM8 7h8v3H8zM8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01M16 17h.01'],
    ['workout', 'Тренування', 'M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12'],
    ['shop', 'Покупки', 'M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L20 8H6.2M9 20a1 1 0 1 0 0 .1M18 20a1 1 0 1 0 0 .1'],
    ['progress', 'Прогрес', 'M3 20h18M5 16l5-6 4 3 6-8'],
    ['photos', 'Фото', 'M4 7h3l2-3h6l2 3h3v13H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
    ['profiles', 'Профілі', 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0'],
  ];
  const icon = (d, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
  const ICON = {
    check: 'M5 12l5 5L20 7', play: 'M7 4v16l13-8z', swap: 'M4 7h13l-3-3M20 17H7l3 3', chev: 'M9 6l6 6-6 6', chevl: 'M15 6l-6 6 6 6',
    trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3', clock: 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
    fire: 'M12 21c4 0 7-3 7-7 0-5-5-7-5-11-3 2-4 5-4 7-1-1-2-2-2-4-2 2-3 5-3 8 0 4 3 7 7 7z', x: 'M6 6l12 12M18 6L6 18',
    print: 'M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v7H7z',
    yt: 'M10 9l5 3-5 3zM3 12c0-3 .3-5 1-6 1-1 4-1 8-1s7 0 8 1c.7 1 1 3 1 6s-.3 5-1 6c-1 1-4 1-8 1s-7 0-8-1c-.7-1-1-3-1-6z',
    info: 'M12 16v-5M12 8h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  };

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const st = () => Store.state;
  const prof = () => st().profiles[st().active] || st().profiles[0];
  const fmtKg = v => (Math.round(v * 10) / 10).toString().replace('.', ',');
  const sign = v => (v > 0 ? '+' : v < 0 ? '−' : '') + fmtKg(Math.abs(v));

  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2600);
  }

  function warnings(list) {
    if (!list || !list.length) return '';
    return list.map(w => `<div class="note ${w.lvl}">${icon(ICON.info)}<span>${esc(w.text)}</span></div>`).join('');
  }

  function go(route) { ui.route = route; location.hash = route; render(); window.scrollTo(0, 0); }

  // ---------- Каркас ----------
  function render() {
    const root = document.getElementById('app');
    if (Onboard.active || !st().profiles.length) {
      if (!Onboard.active) { Onboard.start('full'); return; }
      root.innerHTML = Onboard.render();
      return;
    }
    const views = { today, food, calc: FoodCalc.view, workout, shop, progress, photos, profiles };
    const view = views[ui.route] || today;
    root.innerHTML = `<div class="layout">
      <aside class="side">
        <div class="logo"><span>FIT</span>DUO</div>
        <nav>${NAV.map(([r, l, d]) => `<a href="#${r}" class="${ui.route === r ? 'on' : ''}" data-act="nav" data-r="${r}">${icon(d)}<span>${l}</span></a>`).join('')}</nav>
        <div class="side-foot">${Calc.inMaintenance() ? 'Тижні підтримки' : Plan.weekNo() > Plan.PROGRAM_WEEKS ? 'Цикл завершено' : `Тиждень ${Plan.weekNo()} з ${Plan.PROGRAM_WEEKS}<br>${Plan.PHASES[Plan.phase(Plan.weekNo())]}`}</div>
      </aside>
      <main class="main" id="main">${view()}</main></div>
      ${tabbar()}`;
    if (ui.route === 'photos') Gallery.mount();
  }

  // Нижнє меню на телефоні: 4 головні розділи + «Ще»
  const TABS = ['today', 'food', 'calc', 'workout'];
  function tabbar() {
    const more = NAV.filter(n => !TABS.includes(n[0]));
    const inMore = more.some(n => n[0] === ui.route);
    const SHORT = { food: 'Меню', workout: 'Спорт' };
    return `<nav class="tabbar">${NAV.filter(n => TABS.includes(n[0])).map(([r, l, d]) =>
      `<a href="#${r}" class="${ui.route === r ? 'on' : ''}" data-act="nav" data-r="${r}">${icon(d)}<span>${SHORT[r] || l}</span></a>`).join('')}
      <a href="#" class="${inMore || ui.more ? 'on' : ''}" data-act="more">${icon('M5 12h.01M12 12h.01M19 12h.01')}<span>Ще</span></a></nav>
      ${ui.more ? `<div class="sheet-bg" data-act="more"></div><div class="sheet">${more.map(([r, l, d]) =>
        `<a href="#${r}" class="${ui.route === r ? 'on' : ''}" data-act="nav" data-r="${r}">${icon(d)}<span>${l}</span></a>`).join('')}</div>` : ''}`;
  }

  function switcher() {
    if (st().profiles.length < 2) return '';
    return `<div class="switch">${st().profiles.map((p, i) => `<button class="${i === st().active ? 'on' : ''}" data-act="profile" data-i="${i}">${esc(p.name)}</button>`).join('')}</div>`;
  }
  function header(title, sub, withSwitch = true) {
    return `<header class="head"><div><div class="sub">${sub || ''}</div><h1>${title}</h1></div>${withSwitch ? switcher() : ''}</header>`;
  }

  // ---------- Сьогодні ----------
  const TIPS = [
    'Жир не спалюється локально: прес робить живіт підтягнутим, а зникає жир завдяки дефіциту калорій і руху.',
    'Білок у кожному прийомі їжі довше тримає ситість і зберігає м\'язи під час схуднення.',
    'Вага щодня коливається на 0,5–1,5 кг через воду й сіль. Дивіться на середнє за тиждень.',
    'Сон менше 7 годин підвищує апетит. Лягайте вчасно — це теж частина програми.',
    'Кроки — найпростіший спосіб збільшити витрату енергії без втоми. Прогулянка після вечері — чудова звичка.',
    'Склянка води перед їжею допомагає не переїдати.',
    'Солодкі напої та соки — приховані калорії. Краще вода, чай, кава без цукру.',
    'Талія зменшується повільніше за вагу на початку — не здавайтеся, заміряйте раз на 2 тижні.',
    'Пропустили тренування? Не страшно. Головне — не пропускати двічі поспіль.',
    'Тримайте поставу: напружений прес і розправлені плечі візуально зменшують живіт уже сьогодні.',
    'Готуйте разом і хваліть одне одного — підтримка партнера подвоює шанси на успіх.',
    'Алкоголь — це калорії й гірший сон. Якщо п\'єте — плануйте це в денну норму.',
  ];

  function checks(pid, date) {
    const c = st().logs.check;
    c[pid] = c[pid] || {};
    return c[pid][date] = c[pid][date] || {};
  }

  function streak(pid) {
    const c = (st().logs.check[pid] || {});
    let d = D.iso(), n = 0;
    const ok = x => x && Object.values(x).filter(Boolean).length >= 3;
    if (!ok(c[d])) d = D.add(d, -1);
    while (ok(c[d])) { n++; d = D.add(d, -1); }
    return n;
  }

  function today() {
    const p = prof(), date = D.iso(), t = Calc.targets(p);
    const n = Plan.weekNo();
    const maint = Calc.inMaintenance(date);
    if (n > Plan.PROGRAM_WEEKS && !maint) {
      const done = !!st().maintenance;
      return header('Програму завершено') + `<div class="card hero-done"><h2>12 тижнів позаду!</h2>
      <p class="muted">Подивіться на свій прогрес і фото «до/після».${done ? ' Тижні підтримки завершено — можна починати новий цикл.' : ' Перед новим циклом радимо 2 тижні підтримки: калорії дорівнюють витраті, тренування тривають. Це знімає втому від дієти й допомагає закріпити нову вагу.'}
      Записи збережуться, а тренування знову піде по фазах.</p>
      <div class="row">${done ? '<button class="btn primary" data-act="new-cycle">Почати новий цикл</button>'
        : '<button class="btn primary" data-act="start-maint">2 тижні підтримки</button><button class="btn" data-act="new-cycle">Новий цикл одразу</button>'}
      <button class="btn" data-act="nav" data-r="progress">Мій прогрес</button></div></div>`;
    }

    const dp = FoodCalc.dayPlan(p, date);
    const kcalEaten = Math.round(dp.eaten);
    const ws = st().logs.weights[p.id] || [];
    const startW = ws.length ? ws[0].kg : p.weight;
    const ms = (st().logs.measures[p.id] || []).filter(m => m.waist);
    const waistNow = ms.length ? ms[ms.length - 1].waist : null;
    const waistDelta = ms.length > 1 ? waistNow - ms[0].waist : null;
    const ck = checks(p.id, date);
    const w = Plan.workoutFor(p, date);
    const doneW = (st().logs.workouts[p.id] || {})[date];
    const adj = (st().adjust[p.id] || {}).notes || [];
    const lastAdj = adj.filter(a => D.diff(date, a.date) <= 3);
    const hasWeightToday = ws.some(x => x.date === date);

    const wcard = !w
      ? `<div class="card wcard rest"><div><div class="sub">Сьогодні</div><h3>День відновлення</h3>
          <p class="muted">Прогулянка 30–40 хвилин швидким кроком і легка розтяжка. Ціль: ${t.steps.toLocaleString('uk-UA')} кроків.</p></div></div>`
      : `<div class="card wcard ${doneW ? 'done' : ''}"><div><div class="sub">Тренування сьогодні · ${w.total} хв</div><h3>${w.name}</h3>
          <p class="muted">${w.main.length} вправ · ${w.rounds} кола · ${w.work}/${w.rest} с${p.noJumps ? ' · без стрибків' : ''}</p></div>
          ${doneW ? `<span class="pill ok">${icon(ICON.check)} Виконано</span>` : `<button class="btn primary" data-act="start-workout">${icon(ICON.play)} Почати</button>`}</div>`;

    const items = [
      ['food', 'Харчування за планом'], ['water', `Вода ${t.water} л`], ['steps', `${t.steps.toLocaleString('uk-UA')} кроків`],
      ['workout', w ? 'Тренування' : 'Прогулянка / розтяжка'], ['sleep', 'Сон 7+ годин'],
    ];
    const s = streak(p.id);
    const stage = maint ? `підтримка, до ${D.fmt(D.add(st().maintenance.until, -1))}` : `тиждень ${n} з ${Plan.PROGRAM_WEEKS} · ${Plan.PHASES[Plan.phase(n)]}`;
    return header(`Привіт, ${esc(p.name)}`, `${D.DAYS_FULL[D.weekday(date)]}, ${D.fmt(date)} · ${stage}`) +
      (maint ? warnings(t.warnings.filter(x => x.text.startsWith('Тижні підтримки'))) : '') +
      backupBanner() + summaryCard(p) +
      lastAdj.map(a => `<div class="note info">${icon(ICON.info)}<span>Калорії скориговано: ${esc(a.text)}</span></div>`).join('') +
      alcoholNotes(p, date, dp, w) +
      `<div class="stats">
        <div class="card stat"><div class="sub">Калорії сьогодні</div><div class="big-num">${kcalEaten.toLocaleString('uk-UA')}<small> / ${dp.target.toLocaleString('uk-UA')}</small></div>
          <div class="bar"><div style="width:${Math.min(100, kcalEaten / dp.target * 100)}%"></div></div><div class="sub">${kcalEaten > dp.target ? `<span class="neg">Перевищено на ${kcalEaten - dp.target} ккал</span>` : `Залишилось ${dp.target - kcalEaten} ккал · білок ${t.protein} г`}</div></div>
        <div class="card stat"><div class="sub">Вага</div><div class="big-num">${fmtKg(t.w)}<small> кг</small> ${Math.abs(t.w - startW) >= 0.05 ? `<span class="delta ${t.w - startW < 0 ? 'good' : ''}">${sign(t.w - startW)}</span>` : ''}</div>
          <div class="sub">ціль ${fmtKg(p.goalWeight)} кг${t.forecastRange ? ' · ' + t.forecastRange : ''}</div>
          ${hasWeightToday ? '' : `<div class="quick"><input type="number" step="0.1" id="q-weight" placeholder="${fmtKg(t.w)}"><button class="btn sm" data-act="quick-weight">Зважитись</button></div>`}</div>
        <div class="card stat"><div class="sub">Талія</div><div class="big-num">${waistNow ? fmtKg(waistNow) : '—'}<small> см</small> ${waistDelta !== null ? `<span class="delta ${waistDelta <= 0 ? 'good' : ''}">${sign(waistDelta)}</span>` : ''}</div>
          <div class="sub">${waistNow ? (waistNow < t.waistGoal ? `<span class="okc">у нормі</span> · ` : `до цілі ${fmtKg(waistNow - t.waistGoal)} см · `) : ''}ціль &lt; ${t.waistGoal} см (½ зросту)</div>
          <button class="btn sm" data-act="nav" data-r="progress">Додати замір</button></div>
      </div>
      ${wcard}
      <div class="grid-main">
        <div class="card"><div class="card-h"><h3>Меню на сьогодні</h3><a class="link" data-act="nav" data-r="food">Усе меню ${icon(ICON.chev)}</a></div>
          ${dp.rows.map(m => m.rep
            ? `<div class="meal-row on rep"><span class="box">${icon(ICON.check)}</span><span class="meal-l"><small>${m.label} · <span class="swap-tag">заміна</span></small>${esc(m.rep.name)}</span><span class="kcal">${m.rep.kcal} ккал</span>
                <button class="icon-btn sm" data-act="calc-undo" data-i="${m.i}" title="Повернути заплановану страву">${icon(ICON.x)}</button></div>`
            : `<div class="meal-row ${m.eaten ? 'on' : ''}"><label class="meal-tick"><input type="checkbox" data-chk="meal" data-i="${m.i}" data-k="${m.por.kcal}" ${m.eaten ? 'checked' : ''}>
                <span class="box">${icon(ICON.check)}</span><span class="meal-l"><small>${m.label}${m.adjusted ? ' · <span class="swap-tag">порцію перераховано</span>' : ''}</small>${esc(m.r.name)}</span></label>
                <span class="kcal">${m.por.kcal} ккал</span>${m.eaten ? '' : `<button class="btn sm ghost" data-act="calc-open" data-slot="${m.i}" title="Зʼїсти іншу страву">${icon(ICON.swap)}<span class="lbl"> Замінити</span></button>`}</div>`).join('')}
          ${dp.drinks.map(a => `<div class="meal-row ${a.done ? 'on' : ''}"><label class="meal-tick"><input type="checkbox" data-chk="drink" data-j="${a.j}" ${a.done ? 'checked' : ''}>
            <span class="box">${icon(ICON.check)}</span><span class="meal-l"><small>Запланований алкоголь</small>${esc(a.name)} · ${a.ml} мл</span></label><span class="kcal">${Math.round(a.kcal)} ккал</span></div>`).join('')}
          ${dp.extra.map((x, i) => `<div class="meal-row on rep"><span class="box">${icon(ICON.check)}</span><span class="meal-l"><small>Поза планом · ${x.time || ''}</small>${esc(x.name)}</span><span class="kcal">${x.kcal} ккал</span>
            <button class="icon-btn sm" data-act="extra-del" data-i="${i}" title="Видалити">${icon(ICON.trash)}</button></div>`).join('')}
          ${dp.changed && dp.over > 50 ? `<div class="note warn">${icon(ICON.info)}<span>Навіть із мінімальними порціями день виходить на ${Math.round(dp.over)} ккал більше за норму. Додайте 30–40 хв прогулянки — це ~150–200 ккал.</span></div>` : ''}
          <div class="row add-extra">${dp.rows.some(m => !m.eaten) ? `<button class="btn sm primary" data-act="all-eaten">${icon(ICON.check)} Все за планом</button>` : ''}
            <button class="btn sm" data-act="calc-open" data-slot="extra">+ Зʼїв(-ла) щось поза планом</button></div>
        </div>
        <div class="card"><div class="card-h"><h3>Чек-лист дня</h3>${s ? `<span class="pill">${icon(ICON.fire)} ${s} дн. поспіль</span>` : ''}</div>
          ${items.map(([k, l]) => `<label class="check-row ${ck[k] ? 'on' : ''}"><input type="checkbox" data-chk="check" data-k="${k}" ${ck[k] ? 'checked' : ''}><span class="box">${icon(ICON.check)}</span>${l}</label>`).join('')}
          <div class="tip">${icon(ICON.info)}<span>${TIPS[D.diff(date, '2024-01-01') % TIPS.length]}</span></div>
        </div>
      </div>`;
  }

  // ---------- Харчування ----------
  function weekNav(n, act) {
    const max = Plan.PROGRAM_WEEKS;
    return `<div class="weeknav"><button class="icon-btn" data-act="${act}" data-d="-1" ${n <= 1 ? 'disabled' : ''}>${icon(ICON.chevl)}</button>
      <span>Тиждень ${n} · ${D.fmt(Plan.weekStart(n), { day: 'numeric', month: 'short' })} – ${D.fmt(D.add(Plan.weekStart(n), 6), { day: 'numeric', month: 'short' })}</span>
      <button class="icon-btn" data-act="${act}" data-d="1" ${n >= max + 1 ? 'disabled' : ''}>${icon(ICON.chev)}</button></div>`;
  }

  function food() {
    const n = ui.week || Math.min(Plan.weekNo(), Plan.PROGRAM_WEEKS + 1);
    ui.week = n;
    const curWeek = Plan.weekNo();
    if (ui.day === null) ui.day = n === curWeek ? D.weekday(D.iso()) : 0;
    const plan = Plan.mealWeek(n), sl = Plan.slots();
    const ps = st().profiles, ts = ps.map(p => Calc.targets(p));
    const day = plan.days[ui.day];
    const date = D.add(Plan.weekStart(n), ui.day);
    // на сьогодні враховуємо заміни й перераховані порції
    const dps = date === D.iso() ? ps.map(p => FoodCalc.dayPlan(p, date)) : null;
    const porFor = (pi, i, r) => dps ? (dps[pi].rows[i].rep ? null : dps[pi].rows[i].por) : Plan.portion(r, sl[i][2], ts[pi].kcalFood);
    const totals = ps.map((p, pi) => {
      const acc = day.reduce((a, rid, i) => {
        const po = porFor(pi, i, Plan.recipe(rid)), rep = dps && dps[pi].rows[i].rep;
        a.k += po ? po.kcal : rep.kcal; a.p += po ? po.prot : rep.prot || 0; return a;
      }, { k: 0, p: 0 });
      if (dps) { dps[pi].extra.forEach(x => { acc.k += x.kcal; acc.p += x.prot || 0; }); dps[pi].drinks.forEach(a => { acc.k += a.kcal; }); }
      acc.k = Math.round(acc.k);
      return acc;
    });
    return header('Харчування', ps.length > 1 ? 'Одне меню на двох · порції окремо' : `Порції під вашу норму · ${ts[0].kcalFood} ккал`, false) + weekNav(n, 'food-week') +
      `<div class="days">${D.DAYS.map((d, i) => `<button class="${i === ui.day ? 'on' : ''} ${D.add(Plan.weekStart(n), i) === D.iso() ? 'today' : ''}" data-act="food-day" data-i="${i}">${d}<small>${D.fmt(D.add(Plan.weekStart(n), i), { day: 'numeric' })}</small></button>`).join('')}</div>
      <div class="day-totals">${ps.map((p, pi) => `<div class="card mini"><b>${esc(p.name)}</b><span>${totals[pi].k} / ${dps ? dps[pi].target : ts[pi].kcalFood} ккал</span><span>білок ${totals[pi].p} / ${ts[pi].protein} г</span>
        ${totals[pi].p < ts[pi].protein * 0.9 ? `<span class="lack">Добрати ~${ts[pi].protein - totals[pi].p} г білка: ${proteinHint(ts[pi].protein - totals[pi].p)}</span>` : ''}</div>`).join('')}</div>
      ${day.map((rid, i) => {
        const r = Plan.recipe(rid);
        const pors = ps.map((p, pi) => porFor(pi, i, r) || { kcal: 0, prot: 0, ing: r.ing.map(([id]) => [id, 0]), rep: dps[pi].rows[i].rep });
        const open = ui.openMeal === i;
        const batchNote = (st().family || {}).batch && sl[i][0] === 'main' ? `<span class="pill">${ui.day % 2 === 0 ? 'Готуйте на 2 дні' : 'Залишок з учора'}</span>` : '';
        return `<div class="card meal ${open ? 'open' : ''}">
          <div class="meal-head" data-act="meal-open" data-i="${i}">
            <div><small class="slot">${sl[i][1]}</small><h3>${esc(r.name)}</h3>
            <div class="meta">${icon(ICON.clock)} ${r.time} хв ${(r.tool || []).map(t => `<span class="tool">${TOOLS[t]}</span>`).join('')} ${batchNote}</div></div>
            <div class="por">${ps.map((p, pi) => `<span><small>${esc(p.name)}</small>${pors[pi].rep ? `<em class="swap-tag">замінено</em>` : pors[pi].kcal + ' ккал'}</span>`).join('')}</div>
            ${icon(ICON.chev, 'chev')}
          </div>
          ${open ? `<div class="meal-body">
            <table class="ing"><thead><tr><th>Інгредієнт</th>${ps.map(p => `<th>${esc(p.name)}</th>`).join('')}${ps.length > 1 ? '<th>Разом</th>' : ''}</tr></thead><tbody>
            ${r.ing.map(([raw], k) => { const id = Plan.subst(raw); return `<tr><td>${FOODS[id].n}</td>${pors.map(po => `<td>${po.rep ? '—' : Plan.fmtAmount(id, po.ing[k][1])}</td>`).join('')}${ps.length > 1 ? `<td>${Plan.fmtAmount(id, pors.reduce((s, po) => s + po.ing[k][1], 0))}</td>` : ''}</tr>`; }).join('')}
            </tbody></table>
            <ol class="steps">${r.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
            <div class="row"><button class="btn" data-act="meal-swap" data-i="${i}">${icon(ICON.swap)} Замінити страву</button>
            <span class="muted sm">Сіль і спеції — за смаком. Білок у порції: ${pors.map((po, pi) => `${esc(ps[pi].name)} ${po.prot} г`).join(', ')}.</span></div>
          </div>` : ''}
        </div>`;
      }).join('')}
      <p class="hint">Порції розраховані за калоріями кожного. Зважуйте продукти перші 1–2 тижні — потім навчитеся визначати «на око». Крупи вказані в сухому вигляді, м'ясо — в сирому. Час для аерогриля орієнтовний: перші рази перевіряйте готовність — у різних моделях він трохи відрізняється.</p>`;
  }

  // Порада, чим добрати білок без зайвих калорій
  function proteinHint(g) {
    const ex = (st().family || {}).exclude || [];
    if (!ex.includes('dairy')) return `${Math.round(g / 17 * 100 / 50) * 50 || 50} г ${Plan.subst('cottage') === 'cottage' ? 'кисломолочного сиру' : 'безлактозного кисломолочного сиру'}`;
    if (!ex.includes('eggs')) return `${Math.max(1, Math.round(g / 7))} яйця або білки`;
    return `${Math.round(g / 23 * 100 / 10) * 10} г курячого філе`;
  }

  // ---------- Покупки ----------
  function shop() {
    const n = ui.week || Math.min(Plan.weekNo(), Plan.PROGRAM_WEEKS + 1);
    ui.week = n;
    const groups = Plan.shopping(n);
    const checked = st().shopping[n] || {};
    const order = Object.keys(SHOP_CATS).filter(c => groups[c]);
    const total = order.reduce((s, c) => s + groups[c].length, 0), done = Object.values(checked).filter(Boolean).length;
    return header('Список покупок', st().profiles.length > 1 ? 'на тиждень для вас обох' : 'на тиждень', false) + weekNav(n, 'food-week') +
      `<div class="row between"><span class="muted">Куплено ${done} з ${total}</span><div class="row">
        <button class="btn sm" data-act="shop-reset">Скинути позначки</button><button class="btn sm" data-act="print">${icon(ICON.print)} Друк</button></div></div>
      <div class="shop">${order.map(c => `<div class="card"><h3>${SHOP_CATS[c]}</h3>
        ${groups[c].map(it => `<label class="check-row ${checked[it.id] ? 'on' : ''}"><input type="checkbox" data-chk="shop" data-id="${it.id}" ${checked[it.id] ? 'checked' : ''}><span class="box">${icon(ICON.check)}</span><span class="grow">${it.name}</span><b>${it.amount}</b></label>`).join('')}
      </div>`).join('')}</div>
      <p class="hint">Кількість — із запасом, з округленням угору. Сіль, спеції, чай/кава — за потребою. Овочі та м'ясо зручно купувати двічі на тиждень.</p>`;
  }

  // ---------- Тренування ----------
  function exThumb(id, extra = '') {
    const e = EX_BY_ID[id];
    return `<button class="ex" data-act="ex-open" data-id="${id}">${Figures.render(e, { animate: false })}<span>${esc(e.name)}${extra ? `<small>${extra}</small>` : ''}</span></button>`;
  }

  function workout() {
    const p = prof();
    const n = Math.min(Plan.weekNo(), Plan.PROGRAM_WEEKS);
    const week = Plan.workoutWeek(p, n);
    const todayWd = D.weekday(D.iso());
    if (ui.wday === null || ui.wday === undefined) ui.wday = week[todayWd] ? todayWd : +Object.keys(week)[0];
    const s = week[ui.wday];
    const date = D.add(Plan.weekStart(n), ui.wday);
    const done = (st().logs.workouts[p.id] || {})[date];
    const safeCount = EXERCISES.filter(e => Plan.safe(p, e)).length;
    return header('Тренування', `Тиждень ${n} · фаза «${Plan.PHASES[Plan.phase(n)]}» · ${p.days} тренування на тиждень`) +
      `<div class="days">${D.DAYS.map((d, i) => `<button class="${i === ui.wday ? 'on' : ''} ${week[i] ? 'has' : 'off'} ${i === todayWd ? 'today' : ''}" data-act="w-day" data-i="${i}" ${week[i] ? '' : 'disabled'}>${d}<small>${week[i] ? week[i].type : '—'}</small></button>`).join('')}</div>
      ${s ? `<div class="card wcard ${done ? 'done' : ''}"><div><div class="sub">${D.DAYS_FULL[ui.wday]} · ~${s.total} хв</div><h3>${s.name}</h3>
          <p class="muted">${s.rounds} кола × ${s.main.length} вправ · робота ${s.work} с / відпочинок ${s.rest} с · між колами 45 с</p></div>
          ${done ? `<span class="pill ok">${icon(ICON.check)} Виконано</span>` : (ui.wday === todayWd ? `<button class="btn primary" data-act="start-workout">${icon(ICON.play)} Почати</button>` : `<button class="btn" data-act="start-workout" data-wd="${ui.wday}">${icon(ICON.play)} Почати зараз</button>`)}</div>
        <h3 class="sec">Розминка · ${s.warm.length * 40 / 60 | 0} хв</h3><div class="ex-grid">${s.warm.map(id => exThumb(id, '40 с')).join('')}</div>
        <h3 class="sec">Основна частина · ${s.rounds} кола</h3><div class="ex-grid">${s.main.map(id => exThumb(id, `${s.work} с${EX_BY_ID[id].side ? ' · по ½ на сторону' : ''}`)).join('')}</div>
        <h3 class="sec">Заминка · ${s.cool.length * 40 / 60 | 0} хв</h3><div class="ex-grid">${s.cool.map(id => exThumb(id, '40 с')).join('')}</div>` : ''}
      <div class="note info">${icon(ICON.info)}<span>Темп і складність ростуть щофази: тижні 1–4 — адаптація, 5–8 — розвиток, 9–12 — інтенсив. Вправи підібрано під ваш рівень, інвентар і здоров'я (доступно ${safeCount} з ${EXERCISES.length}). Якщо щось болить (не плутати з втомою м'язів) — зупиніться.</span></div>`;
  }

  function exModal(id) {
    const e = EX_BY_ID[id];
    const q = encodeURIComponent(e.name + ' техніка виконання');
    modal(`<div class="ex-modal">${Figures.render(e)}
      <div><h2>${esc(e.name)}</h2>
      <div class="tags">${['', 'Легко', 'Середньо', 'Складно'][e.lvl] ? `<span class="tag">${['', 'Легко', 'Середньо', 'Складно'][e.lvl]}</span>` : ''}${e.side ? '<span class="tag">На кожну сторону</span>' : ''}${e.hold ? '<span class="tag">Статика</span>' : ''}${e.eq ? e.eq.map(x => `<span class="tag">${EQUIPMENT.find(q => q[0] === x)[1]}</span>`).join('') : ''}</div>
      <h4>Як виконувати</h4><ol class="steps">${e.how.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
      <h4>Зверніть увагу</h4><ul class="steps">${e.tips.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
      <a class="btn" href="https://www.youtube.com/results?search_query=${q}" target="_blank" rel="noopener">${icon(ICON.yt)} Відео в YouTube</a></div></div>`);
  }

  function modal(html) {
    closeModal();
    const m = document.createElement('div');
    m.className = 'modal'; m.id = 'modal';
    m.innerHTML = `<div class="modal-box"><button class="icon-btn close" data-act="modal-close">${icon(ICON.x)}</button>${html}</div>`;
    document.body.appendChild(m);
  }
  function closeModal() { const m = document.getElementById('modal'); if (m) m.remove(); }

  // ---------- Прогрес ----------
  function progress() {
    const p = prof(), t = Calc.targets(p);
    const ws = (st().logs.weights[p.id] || []).map(x => ({ date: x.date, v: x.kg }));
    const ms = st().logs.measures[p.id] || [];
    const adj = (st().adjust[p.id] || {}).notes || [];
    const mser = (k, cls) => ({ points: ms.filter(m => m[k]).map(m => ({ date: m.date, v: m[k] })), cls });
    const first = ws[0], last = ws[ws.length - 1];
    return header('Прогрес', `${esc(p.name)} · старт ${first ? fmtKg(first.v) + ' кг' : '—'} · зараз ${fmtKg(t.w)} кг · ціль ${fmtKg(p.goalWeight)} кг`) +
      `<div class="grid-main">
        <div class="card"><div class="card-h"><h3>Вага</h3>${first && last ? `<span class="delta ${last.v - first.v <= 0 ? 'good' : ''}">${sign(last.v - first.v)} кг</span>` : ''}</div>
          ${Chart.line([{ points: ws, cls: 'raw' }, { points: Chart.rolling(ws), cls: 'avg', dots: false }], { goal: p.goalWeight, unit: 'кг' })}
          <div class="legend"><span class="swatch raw"></span>зважування <span class="swatch avg"></span>середнє за 7 днів</div>
          <form class="inline-form" data-form="weight"><input type="date" name="date" value="${D.iso()}" max="${D.iso()}"><input type="number" step="0.1" name="kg" placeholder="кг" required><button class="btn primary">Додати</button></form>
          <p class="hint">Зважуйтеся зранку після туалету, до сніданку. Можна щодня або 2–3 рази на тиждень.</p>
        </div>
        <div class="card"><div class="card-h"><h3>Заміри, см</h3></div>
          ${Chart.line([mser('waist', 'raw'), mser('belly', 'c2'), mser('hips', 'c3'), mser('chest', 'c4')], { unit: 'см', goal: t.waistGoal, goalLabel: 'талія' })}
          <div class="legend"><span class="swatch raw"></span>талія <span class="swatch c2"></span>живіт <span class="swatch c3"></span>стегна <span class="swatch c4"></span>груди</div>
          <form class="inline-form wrap" data-form="measure"><input type="date" name="date" value="${D.iso()}" max="${D.iso()}">
            <input type="number" step="0.5" name="waist" placeholder="талія"><input type="number" step="0.5" name="belly" placeholder="живіт (пупок)">
            <input type="number" step="0.5" name="hips" placeholder="стегна"><input type="number" step="0.5" name="chest" placeholder="груди"><button class="btn primary">Додати</button></form>
          <p class="hint">Ціль для талії — менше половини зросту (${t.waistGoal} см): так оцінюють жир на животі. Талія — найвужче місце; живіт — на рівні пупка; стегна — найширше місце сідниць. Раз на 2 тижні, зранку.</p>
        </div>
      </div>
      <div class="grid-main">
        <div class="card"><h3>Журнал ваги</h3><div class="log">${ws.slice().reverse().map(w => `<div class="log-row"><span>${D.fmt(w.date, { day: 'numeric', month: 'short', year: 'numeric' })}</span><b>${fmtKg(w.v)} кг</b><button class="icon-btn sm" data-act="del-weight" data-date="${w.date}" title="Видалити">${icon(ICON.trash)}</button></div>`).join('') || '<div class="empty">Порожньо</div>'}</div></div>
        <div class="card"><h3>Журнал замірів</h3><div class="log">${ms.slice().reverse().map((m, ri) => `<div class="log-row"><span>${D.fmt(m.date, { day: 'numeric', month: 'short', year: 'numeric' })}</span><span class="muted sm">${['waist:талія', 'belly:живіт', 'hips:стегна', 'chest:груди'].map(x => x.split(':')).filter(([k]) => m[k]).map(([k, l]) => `${l} ${fmtKg(m[k])}`).join(' · ')}</span><button class="icon-btn sm" data-act="del-measure" data-i="${ms.length - 1 - ri}" title="Видалити">${icon(ICON.trash)}</button></div>`).join('') || '<div class="empty">Порожньо</div>'}</div>
        ${adj.length ? `<h3 class="sec">Корекції калорій</h3>${adj.map(a => `<div class="log-row"><span>${D.fmt(a.date)}</span><span class="muted sm">${esc(a.text)}</span></div>`).join('')}` : ''}</div>
      </div>
      ${strengthTable(p)}
      ${weeksTable(p)}`;
  }

  // ---------- Тижневі підсумки ----------
  function weekStats(p, n) {
    const start = Plan.weekStart(n), today = D.iso();
    const days = [...Array(7)].map((_, i) => D.add(start, i)).filter(d => d <= today);
    const ck = st().logs.check[p.id] || {}, wo = st().logs.workouts[p.id] || {};
    const cnt = k => days.filter(d => (ck[d] || {})[k]).length;
    const ww = Plan.workoutWeek(p, Math.min(n, Plan.PROGRAM_WEEKS));
    const avg = (from, to) => {
      const l = (st().logs.weights[p.id] || []).filter(x => x.date >= from && x.date <= to);
      return l.length ? l.reduce((s, x) => s + x.kg, 0) / l.length : null;
    };
    const w = avg(start, D.add(start, 6)), wPrev = avg(D.add(start, -7), D.add(start, -1));
    return { n, days: days.length, food: cnt('food'), steps: cnt('steps'), sleep: cnt('sleep'), water: cnt('water'),
      workouts: days.filter(d => wo[d]).length, planned: ww ? Object.keys(ww).length : 0, w, dw: w !== null && wPrev !== null ? w - wPrev : null };
  }

  function weekAdvice(s) {
    if (s.planned && s.workouts < s.planned * 0.6) return 'Тренування випадали. Заплануйте їх як зустріч: конкретний день і час, форма підготовлена звечора. Навіть 20 хвилин краще, ніж нічого.';
    if (s.food < 4) return 'Харчування за планом менше половини днів. Готуйте на 2 дні наперед, а якщо їсте інше — записуйте через калькулятор, щоб порції решти дня перерахувалися.';
    if (s.steps < 4) return 'Кроків замало. Найпростіше — 20–30 хвилин прогулянки після вечері або частину дороги пішки.';
    if (s.sleep < 4) return 'Сну мало: недосип підвищує апетит. Спробуйте лягати на 30 хвилин раніше і без телефона в ліжку.';
    if (s.dw !== null && s.dw > 0.2) return 'Вага трохи зросла, хоча план виконано. Це майже завжди вода (сіль, тренування, цикл). Не урізайте їжу — дивіться на тренд за 2 тижні.';
    return 'Відмінний тиждень! Нічого не змінюйте — стабільність дає результат.';
  }

  function summaryCard(p) {
    const n = Plan.weekNo() - 1;
    if (n < 1 || ((st().summarySeen || {})[p.id] || 0) >= n) return '';
    const s = weekStats(p, n);
    const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
    const item = (l, v, ok) => `<div class="sum-i"><b class="${ok ? 'okc' : 'warnc'}">${v}</b><span>${l}</span></div>`;
    return `<div class="card summary"><div class="card-h"><h3>Підсумок тижня ${n}</h3><button class="btn sm" data-act="summary-ok" data-n="${n}">Зрозуміло</button></div>
      <div class="sum-grid">
        ${item('вага за тиждень', s.dw === null ? (s.w ? fmtKg(s.w) + ' кг' : '—') : sign(s.dw) + ' кг', s.dw === null || s.dw <= 0)}
        ${item('харчування за планом', `${s.food} з ${s.days} дн.`, pct(s.food, s.days) >= 70)}
        ${item('тренування', `${s.workouts} з ${s.planned}`, s.workouts >= s.planned)}
        ${item('кроки', `${s.steps} з ${s.days} дн.`, pct(s.steps, s.days) >= 70)}
        ${item('сон 7+ год', `${s.sleep} з ${s.days} дн.`, pct(s.sleep, s.days) >= 70)}
      </div>
      <div class="tip">${icon(ICON.info)}<span>${weekAdvice(s)}</span></div></div>`;
  }

  // Прогрес у силі: повторення в останньому колі для вправ, які записували
  function strengthTable(p) {
    const reps = (st().logs.reps || {})[p.id] || {};
    const feel = (st().logs.feel || {})[p.id] || {};
    const by = {};
    Object.keys(reps).sort().forEach(d => Object.entries(reps[d]).forEach(([id, v]) => (by[id] = by[id] || []).push({ d, v })));
    const ids = Object.keys(by).filter(id => EX_BY_ID[id]);
    const fl = Object.keys(feel).sort().slice(-6).map(d => ({ easy: 'легко', ok: 'нормально', hard: 'важко' })[feel[d]]);
    if (!ids.length && !fl.length) return '';
    return `<div class="card"><h3>Сила й самопочуття</h3>
      ${ids.length ? `<div class="table-wrap"><table class="ing weeks"><thead><tr><th>Вправа</th><th>Перший раз</th><th>Останній</th><th>Найкраще</th><th>Зміна</th></tr></thead><tbody>
      ${ids.map(id => { const l = by[id], f = l[0], z = l[l.length - 1], best = Math.max(...l.map(x => x.v)), dv = z.v - f.v;
        return `<tr><td>${esc(EX_BY_ID[id].name)}</td><td>${f.v} <span class="muted sm">${D.fmt(f.d, { day: 'numeric', month: 'short' })}</span></td><td>${z.v}</td><td>${best}</td><td class="${dv > 0 ? 'okc' : ''}">${dv > 0 ? '+' : ''}${dv}</td></tr>`; }).join('')}
      </tbody></table></div>` : ''}
      ${fl.length ? `<p class="sm muted">Останні оцінки тренувань: ${fl.join(' · ')}. Двічі поспіль «легко» — програма ускладнює тренування, двічі «важко» — полегшує.</p>` : ''}
      ${p.boost || p.extraWork ? `<p class="sm">Поточне налаштування: ${p.boost > 0 ? 'складніші варіанти вправ' : p.boost < 0 ? 'легші варіанти вправ' : 'базові варіанти'}${p.extraWork ? `, робота +${p.extraWork} с` : ''}.</p>` : ''}
    </div>`;
  }

  function weeksTable(p) {
    const last = Math.min(Plan.weekNo() - 1, 30);
    if (last < 1) return '';
    const rows = [];
    for (let n = last; n >= 1; n--) {
      const s = weekStats(p, n);
      rows.push(`<tr><td>${n}</td><td>${s.w ? fmtKg(s.w) : '—'}</td><td class="${s.dw !== null && s.dw <= 0 ? 'okc' : ''}">${s.dw === null ? '—' : sign(s.dw)}</td><td>${s.food}/${s.days}</td><td>${s.workouts}/${s.planned}</td><td>${s.steps}/${s.days}</td><td>${s.sleep}/${s.days}</td></tr>`);
    }
    return `<div class="card"><h3>Підсумки тижнів</h3><div class="table-wrap"><table class="ing weeks"><thead><tr><th>Тиждень</th><th>Вага, кг</th><th>Зміна</th><th>Харчування</th><th>Тренування</th><th>Кроки</th><th>Сон</th></tr></thead><tbody>${rows.join('')}</tbody></table></div></div>`;
  }

  // ---------- Фото ----------
  function photos() {
    const p = prof();
    return header('Фото прогресу', `${esc(p.name)} · зберігаються лише на цьому пристрої`) +
      `<div class="card"><h3>Додати фото</h3>
        <form class="inline-form wrap" data-form="photo"><input type="date" name="date" value="${D.iso()}" max="${D.iso()}">
          <select name="view"><option value="front">Спереду</option><option value="side">Збоку</option><option value="back">Ззаду</option></select>
          <label class="btn file">Вибрати файл<input type="file" name="file" accept="image/*" hidden></label><button class="btn primary">Зберегти</button></form>
        <p class="hint">Фотографуйтеся раз на 2 тижні: те саме місце, світло, одяг і поза. Камера на рівні пояса, у повний зріст.</p></div>
      <div id="gallery"><div class="empty">Завантаження…</div></div>`;
  }

  // ---------- Профілі ----------
  function profiles() {
    const fam = st().family;
    return header('Профілі та налаштування', 'Розрахунки оновлюються автоматично', false) +
      `<div class="grid2">${st().profiles.map((p, i) => {
        const t = Calc.targets(p);
        const h = Object.keys(p.health || {}).filter(k => p.health[k]);
        const HL = { back: 'спина', knees: 'коліна', shoulders: 'плечі', pressure: 'тиск', thyroid: 'щитовидка', diabetes: 'діабет', stomach: 'ШКТ' };
        return `<div class="card">
          <div class="card-h"><h3>${esc(p.name)}</h3><button class="btn sm" data-act="edit-person" data-i="${i}">Редагувати анкету</button></div>
          <div class="muted sm">${p.sex === 'm' ? 'Чоловік' : 'Жінка'}, ${p.age} р. · ${p.height} см · зараз ${fmtKg(t.w)} кг → ${fmtKg(p.goalWeight)} кг</div>
          <div class="big-num">${t.kcal}<small> ккал/день</small></div>
          ${t.alcWeek ? `<div class="sub">з них на їжу ${t.kcalFood} ккал — решта зарезервована під алкоголь</div>` : ''}
          <div class="macro-row"><span><b>${t.protein}</b> г білка</span><span><b>${t.fat}</b> г жирів</span><span><b>${t.carbs}</b> г вуглев.</span></div>
          <dl class="kv"><dt>Базовий обмін</dt><dd>${t.bmr} ккал</dd><dt>Витрата за день</dt><dd>${t.tdee} ккал (×${t.act.toFixed(2)})</dd>
            <dt>Дефіцит</dt><dd>${t.deficit} ккал${t.adj ? ` (корекція ${t.adj > 0 ? '+' : ''}${t.adj})` : ''}</dd><dt>Очікуваний темп</dt><dd>~${t.weeklyLoss.toFixed(2)} кг/тиж.</dd>
            <dt>ІМТ</dt><dd>${t.bmi.toFixed(1)} → ${t.goalBmi.toFixed(1)}</dd><dt>Прогноз</dt><dd>${t.forecastRange || '—'}</dd>
            <dt>Тренування</dt><dd>${p.days}×${p.minutes} хв, ${({ beginner: 'новачок', some: 'середній', regular: 'досвідчений' })[p.level]}</dd>
            <dt>Обмеження</dt><dd>${h.length ? h.map(k => HL[k]).join(', ') : 'немає'}</dd></dl>
          ${warnings(t.warnings)}
          ${alcoholHtml(p)}</div>`;
      }).join('')}</div>
      ${st().profiles.length < 2 ? `<div class="card add-person"><div><h3>Програма на двох</h3><p class="muted sm">Додайте партнера: меню стане спільним, а порції рахуватимуться окремо для кожного.</p></div><button class="btn" data-act="add-person">Додати другого учасника</button></div>` : ''}
      <div class="grid2">
        <div class="card"><div class="card-h"><h3>Харчування</h3><button class="btn sm" data-act="edit-family">Змінити</button></div>
          <dl class="kv"><dt>Прийомів їжі</dt><dd>${fam.meals}</dd><dt>Бюджет</dt><dd>${fam.budget === 'econ' ? 'економний' : 'середній'}</dd>
          <dt>Готування</dt><dd>${fam.batch ? 'на 2 дні наперед' : 'щодня'}</dd><dt>Лактоза</dt><dd>${({ none: 'без обмежень', mild: 'чутливість', strict: 'непереносимість' })[fam.lactose || 'none']}</dd><dt>Виключено</dt><dd>${fam.exclude.length ? fam.exclude.map(x => EXCLUSIONS.find(e => e[0] === x)[1].toLowerCase()).join(', ') : 'нічого'}</dd></dl></div>
        <div class="card"><h3>Дані</h3>
          <p class="sm">${st().lastBackup ? `Остання резервна копія: ${D.fmt(st().lastBackup, { day: 'numeric', month: 'long' })}` : 'Резервну копію ще не робили'}</p>
          <p class="muted sm">Усе зберігається лише на цьому пристрої. Робіть резервну копію раз на тиждень-два: на iPhone — у «Файли» чи iCloud Drive, на Mac — у «Завантаження». Нею ж можна перенести дані на інший пристрій.</p>
          <div class="row"><button class="btn primary" data-act="export">Зберегти резервну копію</button>
          <label class="btn file">Відновити з файлу<input type="file" accept=".json,application/json" data-act-change="import" hidden></label></div>
          <div class="row"><label class="toggle"><input type="checkbox" data-chk="setting" data-k="voice" ${st().settings.voice ? 'checked' : ''}><span></span>Голосові підказки в тренуванні</label></div>
          <div class="row"><label class="toggle"><input type="checkbox" data-chk="setting" data-k="sound" ${st().settings.sound ? 'checked' : ''}><span></span>Звукові сигнали таймера</label></div>
          <button class="btn danger sm" data-act="reset">Видалити всі дані</button></div>
      </div>
      <div class="card"><h3>Чесно про живіт і боки</h3>
        <p class="muted">Локально «спалити» жир на животі вправами неможливо — організм витрачає жир з усього тіла, а живіт і боки часто йдуть останніми. Тому програма працює так: <b>дефіцит калорій</b> зменшує жир, <b>силові вправи</b> зберігають м'язи й прискорюють обмін, <b>вправи на кор і косі м'язи</b> підтягують талію та покращують поставу, а <b>кроки й сон</b> підтримують результат. Терпіння: перші зміни талії — через 3–4 тижні, помітні — через 8–12.</p></div>`;
  }

  // Тиха плашка, якщо резервну копію давно не робили
  function backupBanner() {
    const since = st().lastBackup ? D.diff(D.iso(), st().lastBackup) : D.diff(D.iso(), st().startDate);
    if (since < 14) return '';
    const text = st().lastBackup ? `Остання резервна копія — ${since} дн. тому.` : 'Ви ще не робили резервну копію.';
    return `<div class="note info backup">${icon(ICON.info)}<span class="grow">${text} Вона захистить журнал і фото, якщо дані Safari буде очищено.</span><button class="btn sm" data-act="export">Зберегти копію</button></div>`;
  }

  // Підказки в день з алкоголем і наступного дня
  function alcoholNotes(p, date, dp, w) {
    const out = [];
    if (dp.drinks.length) {
      const what = dp.drinks.map(a => `${a.name.toLowerCase()} ${a.ml} мл`).join(', ');
      out.push(`Сьогодні запланований алкоголь: ${esc(what)} (~${Math.round(dp.drinks.reduce((s, a) => s + a.kcal, 0))} ккал) — вже враховано в нормі.${Plan.weekNo(date) >= (st().alcoholFrom || 99) ? ' Обід і вечеря сьогодні більш білкові.' : ' Віддавайте перевагу білковій їжі.'}
        Між келихами — склянка води. Закуски: овочі, курка, яйця, сир — без чипсів, сухариків і солоних горішків (перевірте в калькуляторі).${w ? ' Тренування — до, а не після.' : ''}`);
    }
    const y = D.add(date, -1);
    if ((p.alcohol || []).some(a => a.wd === D.weekday(y))) out.push('Учора був алкоголь: сьогодні більше води й прогулянка 40–60 хвилин — вона вирівняє апетит і самопочуття краще за «відсипання».');
    return out.map(t => `<div class="note warn">${icon(ICON.info)}<span>${t}</span></div>`).join('');
  }

  // Запланований алкоголь у профілі
  function alcoholHtml(p) {
    const list = p.alcohol || [];
    const drinks = FoodCalc.alcoholItems();
    return `<div class="alc"><h4>Запланований алкоголь</h4>
      ${list.length ? list.map((a, j) => `<div class="log-row"><span>${D.DAYS[a.wd]}</span><span class="grow">${esc(a.name)} · ${a.ml} мл</span><span class="muted sm">~${Math.round(a.kcal)} ккал</span>
        <button class="icon-btn sm" data-act="alc-del" data-pid="${p.id}" data-j="${j}" title="Видалити">${icon(ICON.trash)}</button></div>`).join('')
        : '<p class="muted sm">Якщо ви регулярно пʼєте в певні дні, вкажіть це — програма заздалегідь розподілить ці калорії на тиждень, а в ці дні меню буде більш білковим.</p>'}
      <form class="inline-form wrap" data-form="alcohol" data-pid="${p.id}">
        <select name="wd">${D.DAYS_FULL.map((d, i) => `<option value="${i}" ${i === 4 ? 'selected' : ''}>${d}</option>`).join('')}</select>
        <select name="id">${drinks.map(d => `<option value="${d.id}">${esc(d.n)}</option>`).join('')}</select>
        <input type="number" name="ml" min="10" step="any" placeholder="мл" required>
        <button class="btn">Додати</button></form></div>`;
  }

  // ---------- Події ----------
  function onClick(e) {
    const el = e.target.closest('[data-act]');
    if (!el) { if (e.target.id === 'modal') closeModal(); return; }
    const a = el.dataset.act;
    const p = prof();
    switch (a) {
      case 'more': e.preventDefault(); ui.more = !ui.more; render(); break;
      case 'nav': e.preventDefault(); ui.more = false; ui.openMeal = null; if (el.dataset.r !== ui.route) { ui.week = null; ui.day = null; } go(el.dataset.r); break;
      case 'profile': st().active = +el.dataset.i; Store.save(); render(); break;
      case 'ob-next': Onboard.next(); break;
      case 'ob-back': Onboard.back(); break;
      case 'food-week': ui.week = Math.max(1, ui.week + +el.dataset.d); ui.day = 0; ui.openMeal = null; render(); break;
      case 'food-day': ui.day = +el.dataset.i; ui.openMeal = null; render(); break;
      case 'meal-open': ui.openMeal = ui.openMeal === +el.dataset.i ? null : +el.dataset.i; render(); break;
      case 'meal-swap': Plan.swap(ui.week, ui.day, +el.dataset.i); render(); toast('Страву замінено'); break;
      case 'shop-reset': st().shopping[ui.week] = {}; Store.save(); render(); break;
      case 'print': window.print(); break;
      case 'w-day': ui.wday = +el.dataset.i; render(); break;
      case 'ex-open': exModal(el.dataset.id); break;
      case 'modal-close': closeModal(); break;
      case 'start-workout': {
        const date = el.dataset.wd !== undefined ? D.add(Plan.weekStart(Math.min(Plan.weekNo(), Plan.PROGRAM_WEEKS)), +el.dataset.wd) : D.iso();
        const s = Plan.workoutFor(p, date) || Plan.workoutWeek(p, Math.min(Plan.weekNo(), Plan.PROGRAM_WEEKS))[+el.dataset.wd];
        Player.start(p, s);
        break;
      }
      case 'quick-weight': {
        const v = parseFloat(String(document.getElementById('q-weight').value).replace(',', '.'));
        if (!(v > 30 && v < 300)) { toast('Введіть вагу в кг'); return; }
        addWeight(p.id, D.iso(), v); render(); toast('Вагу записано'); break;
      }
      case 'del-weight': if (confirm('Видалити запис?')) { st().logs.weights[p.id] = st().logs.weights[p.id].filter(x => x.date !== el.dataset.date); Store.save(); render(); } break;
      case 'del-measure': if (confirm('Видалити запис?')) { st().logs.measures[p.id].splice(+el.dataset.i, 1); Store.save(); render(); } break;
      case 'edit-person': Onboard.start('person', +el.dataset.i); break;
      case 'edit-family': Onboard.start('family'); break;
      case 'add-person': Onboard.start('add'); break;
      case 'start-maint':
        st().maintenance = { from: D.iso(), until: D.add(D.iso(), 14) };
        Store.save(); toast('Почалися 2 тижні підтримки'); go('today'); break;
      case 'summary-ok': (st().summarySeen = st().summarySeen || {})[p.id] = +el.dataset.n; Store.save(); render(); break;
      case 'all-eaten': {
        // відмічає всі ще не відмічені прийоми їжі з тими порціями, що показані зараз
        const date = D.iso(), dp = FoodCalc.dayPlan(p, date);
        const m = st().logs.meals; m[p.id] = m[p.id] || {}; m[p.id][date] = m[p.id][date] || {};
        dp.rows.filter(r => !r.eaten).forEach(r => { m[p.id][date][r.i] = r.por.kcal; });
        checks(p.id, date).food = true;
        Store.save(); render(); toast('День відмічено за планом'); break;
      }
      case 'alc-del': {
        const ap = st().profiles.find(x => x.id === el.dataset.pid);
        ap.alcohol.splice(+el.dataset.j, 1);
        alcoholChanged(); break;
      }
      case 'export': Backup.exportAll(); break;
      case 'reset':
        if (confirm('Видалити ВСІ дані: профілі, журнал, фото? Цю дію не можна скасувати.') && confirm('Точно? Рекомендуємо спершу зберегти резервну копію.')) {
          Store.reset(); Photos.clear().then(() => { Store.save(); location.hash = ''; location.reload(); });
        }
        break;
      case 'new-cycle':
        st().startDate = D.monday(D.iso()); st().plans = {}; st().shopping = {}; st().maintenance = null; st().summarySeen = {};
        Object.values(st().adjust).forEach(a => a.checks = 0);
        Store.save(); toast('Новий цикл розпочато'); go('today'); break;
      default: if (FoodCalc.onAct(a, el)) return; if (window.Gallery && Gallery.onAct(a, el)) return;
    }
  }

  // Меню майбутніх тижнів перебудовується під нові дні з алкоголем
  function alcoholChanged() {
    const n = Plan.weekNo();
    st().alcoholFrom = n + 1; // білкове меню в дні з алкоголем — з наступного тижня
    Object.keys(st().plans).forEach(k => { if (+k > n) delete st().plans[k]; });
    Store.save(); render(); toast('Збережено. Калорії перераховано');
  }

  function addWeight(pid, date, kg) {
    const ws = st().logs.weights[pid] = st().logs.weights[pid] || [];
    const ex = ws.find(x => x.date === date);
    if (ex) ex.kg = kg; else ws.push({ date, kg });
    ws.sort((a, b) => a.date.localeCompare(b.date));
    Store.save();
    Calc.reviewAdjustments();
  }

  function onChange(e) {
    const el = e.target;
    if (el.dataset.actChange === 'import') { Backup.importFile(el.files[0]); return; }
    const k = el.dataset.chk;
    if (!k) { if (el.type === 'file' && el.closest('label.file')) el.closest('label.file').firstChild.textContent = el.files[0] ? el.files[0].name : 'Вибрати файл'; return; }
    const p = prof(), date = D.iso();
    if (k === 'meal') {
      const m = st().logs.meals; m[p.id] = m[p.id] || {}; m[p.id][date] = m[p.id][date] || {};
      // запамʼятовуємо калорії порції, яку показували в момент позначки
      if (el.checked) m[p.id][date][el.dataset.i] = +el.dataset.k || true; else delete m[p.id][date][el.dataset.i];
      if (FoodCalc.dayPlan(p, date).rows.every(x => x.eaten)) checks(p.id, date).food = true;
    } else if (k === 'drink') {
      const dr = st().logs.drinks || (st().logs.drinks = {});
      ((dr[p.id] = dr[p.id] || {})[date] = dr[p.id][date] || {})[el.dataset.j] = el.checked;
    } else if (k === 'check') {
      checks(p.id, date)[el.dataset.k] = el.checked;
    } else if (k === 'shop') {
      (st().shopping[ui.week] = st().shopping[ui.week] || {})[el.dataset.id] = el.checked;
    } else if (k === 'setting') {
      st().settings[el.dataset.k] = el.checked;
    }
    Store.save();
    render();
  }

  function onSubmit(e) {
    const f = e.target.closest('[data-form]');
    if (!f) return;
    e.preventDefault();
    const fd = new FormData(f), p = prof();
    const num = k => { const v = parseFloat(String(fd.get(k) || '').replace(',', '.')); return isNaN(v) ? null : v; };
    const date = fd.get('date') || D.iso();
    if (f.dataset.form === 'weight') {
      const kg = num('kg');
      if (!(kg > 30 && kg < 300)) return toast('Введіть вагу в кг');
      addWeight(p.id, date, kg); toast('Вагу записано');
    } else if (f.dataset.form === 'measure') {
      const m = { date };
      ['waist', 'belly', 'hips', 'chest'].forEach(k => { const v = num(k); if (v) m[k] = v; });
      if (Object.keys(m).length < 2) return toast('Введіть хоча б один замір');
      const list = st().logs.measures[p.id] = st().logs.measures[p.id] || [];
      const ex = list.find(x => x.date === date);
      if (ex) Object.assign(ex, m); else list.push(m);
      list.sort((a, b) => a.date.localeCompare(b.date));
      Store.save(); toast('Заміри записано');
    } else if (f.dataset.form === 'photo') {
      Gallery.add(f, p.id); return;
    } else if (f.dataset.form === 'alcohol') {
      const ap = st().profiles.find(x => x.id === f.dataset.pid);
      const it = FoodCalc.byId(fd.get('id')), ml = num('ml');
      if (!it || !(ml > 0)) return toast('Вкажіть кількість у мл');
      (ap.alcohol = ap.alcohol || []).push({ wd: +fd.get('wd'), id: it.id, name: it.n, ml, kcal: it.k * ml / 100, alc: ml * (it.abv || 0) / 100 * 0.789 });
      ap.alcohol.sort((a, b) => a.wd - b.wd);
      alcoholChanged(); return;
    } else if (f.dataset.form === 'custom-food') {
      FoodCalc.saveCustom(f); return;
    }
    render();
  }

  function init() {
    Store.load();
    const h = location.hash.slice(1);
    if (NAV.some(n => n[0] === h)) ui.route = h;
    document.addEventListener('click', onClick);
    document.addEventListener('change', onChange);
    document.addEventListener('submit', onSubmit);
    document.addEventListener('input', e => { if (e.target.dataset && e.target.dataset.calc) FoodCalc.onInput(e); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
    window.addEventListener('hashchange', () => { const r = location.hash.slice(1); if (r !== ui.route && NAV.some(n => n[0] === r)) { ui.route = r; render(); } });
    // офлайн-режим для iPhone (працює лише з http/https, не з файлу)
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
    if (st().profiles.length) Calc.reviewAdjustments();
    // змінився набір страв: перегенеровуємо меню майбутніх тижнів; у поточному id ті самі,
    // тож він одразу показує оновлені рецепти — лише скидаємо позначки покупок
    if (st().startDate && st().recipesVersion !== RECIPES_VERSION) {
      const n = Plan.weekNo();
      Object.keys(st().plans).forEach(k => { if (+k > n) delete st().plans[k]; });
      delete st().shopping[n];
      st().recipesVersion = RECIPES_VERSION;
      Store.save();
    }
    render();
  }

  return { init, render, go, esc, toast, warnings, modal, closeModal, icon, ICON, ui, addWeight, prof, header };
})();

// ---------- Галерея фото ----------
const Gallery = (() => {
  let cache = [];
  const VIEWS = { front: 'Спереду', side: 'Збоку', back: 'Ззаду' };

  async function mount() {
    const el = document.getElementById('gallery');
    if (!el) return;
    const pid = Store.state.profiles[Store.state.active].id;
    cache = (await Photos.all()).filter(x => x.pid === pid).sort((a, b) => b.date.localeCompare(a.date));
    const ui = App.ui;
    if (!cache.length) { el.innerHTML = '<div class="card empty">Ще немає фото. Зробіть перші — через 12 тижнів ви будете раді, що їх маєте.</div>'; return; }
    const dates = [...new Set(cache.map(x => x.date))];
    const oldest = dates[dates.length - 1], newest = dates[0];
    if (!dates.includes(ui.cmpA)) ui.cmpA = oldest;
    if (!dates.includes(ui.cmpB)) ui.cmpB = newest;
    const find = (d, v) => cache.find(x => x.date === d && x.view === v);
    const a = find(ui.cmpA, ui.cmpView), b = find(ui.cmpB, ui.cmpView);
    const opt = sel => dates.map(d => `<option value="${d}" ${d === sel ? 'selected' : ''}>${D.fmt(d, { day: 'numeric', month: 'short', year: 'numeric' })}</option>`).join('');
    el.innerHTML = `${dates.length > 1 ? `<div class="card"><div class="card-h"><h3>Порівняння «до / після»</h3>
        <div class="row"><select data-gal="cmpA">${opt(ui.cmpA)}</select><span class="muted">→</span><select data-gal="cmpB">${opt(ui.cmpB)}</select>
        <select data-gal="cmpView">${Object.entries(VIEWS).map(([k, l]) => `<option value="${k}" ${k === ui.cmpView ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
        ${a && b ? `<div class="compare" id="compare"><img src="${b.data}" alt=""><div class="cmp-top" id="cmp-top"><img src="${a.data}" alt=""></div><div class="cmp-line" id="cmp-line"></div>
          <span class="cmp-l">${D.fmt(a.date)}</span><span class="cmp-r">${D.fmt(b.date)}</span></div>
          <input type="range" min="0" max="100" value="50" class="cmp-range" data-gal="slider">` : '<div class="empty">Для вибраних дат немає фото з цього ракурсу.</div>'}</div>` : ''}
      ${dates.map(d => `<div class="card"><h3>${D.fmt(d, { day: 'numeric', month: 'long', year: 'numeric' })}</h3><div class="photos">
        ${cache.filter(x => x.date === d).map(x => `<figure><img src="${x.data}" alt="" data-act="photo-view" data-id="${x.id}"><figcaption>${VIEWS[x.view]}<button class="icon-btn sm" data-act="photo-del" data-id="${x.id}">${App.icon(App.ICON.trash)}</button></figcaption></figure>`).join('')}
      </div></div>`).join('')}`;
    el.querySelectorAll('[data-gal]').forEach(s => s.addEventListener('input', onInput));
    setSlider(50);
  }

  function setSlider(v) {
    const top = document.getElementById('cmp-top'), line = document.getElementById('cmp-line');
    if (top) { top.style.clipPath = `inset(0 ${100 - v}% 0 0)`; line.style.left = v + '%'; }
  }

  function onInput(e) {
    const k = e.target.dataset.gal;
    if (k === 'slider') return setSlider(+e.target.value);
    App.ui[k] = e.target.value;
    mount();
  }

  async function add(form, pid) {
    const file = form.file.files[0];
    if (!file) return App.toast('Виберіть файл');
    try {
      const data = await Photos.compress(file);
      const date = form.date.value || D.iso(), view = form.view.value;
      await Photos.put({ id: `${pid}-${date}-${view}`, pid, date, view, data });
      App.toast('Фото збережено');
      App.render();
    } catch (e) { App.toast(e.message); }
  }

  function onAct(a, el) {
    if (a === 'photo-del') {
      if (confirm('Видалити фото?')) Photos.remove(el.dataset.id).then(mount);
      return true;
    }
    if (a === 'photo-view') {
      const x = cache.find(c => c.id === el.dataset.id);
      App.modal(`<img class="photo-full" src="${x.data}" alt="">`);
      return true;
    }
    return false;
  }

  return { mount, add, onAct };
})();

// ---------- Резервна копія ----------
const Backup = {
  async exportAll() {
    const data = { app: 'fitduo', exported: new Date().toISOString(), state: Store.state, photos: await Photos.all() };
    const name = `fitduo-backup-${D.iso()}.json`;
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const done = msg => { Store.state.lastBackup = D.iso(); Store.save(); App.toast(msg); App.render(); };
    // На iPhone — меню «Поділитися» (зберегти у Файли / iCloud Drive, AirDrop); на Mac — звичайне завантаження
    const file = new File([blob], name, { type: 'application/json' });
    if (matchMedia('(pointer: coarse)').matches && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'FitDuo — резервна копія' }); done('Резервну копію збережено'); }
      catch (e) { if (e.name !== 'AbortError') alert('Не вдалося поділитися файлом: ' + e.message); }
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    done('Резервну копію збережено в «Завантаження»');
  },
  importFile(file) {
    if (!file) return;
    const r = new FileReader();
    r.onload = async () => {
      try {
        const data = JSON.parse(r.result);
        if (data.app !== 'fitduo' || !data.state) throw new Error('Це не файл FitDuo');
        if (!confirm('Замінити поточні дані даними з файлу?')) return;
        Store.state = Object.assign(Store.defaults(), data.state);
        Store.save();
        await Photos.clear();
        for (const p of data.photos || []) await Photos.put(p);
        App.toast('Дані відновлено');
        App.go('today');
      } catch (e) { alert('Не вдалося відновити: ' + e.message); }
    };
    r.readAsText(file);
  },
};
