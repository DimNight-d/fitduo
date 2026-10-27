// Калькулятор страви: пошук, тарілка з кількох складових, попередження, заміна прийому їжі
const FoodCalc = (() => {
  const st = () => Store.state;
  const FLAG_LABELS = [['sugar', 'Солодке'], ['salty', 'Солоне'], ['fried', 'Смажене'], ['deep', 'У фритюрі'], ['spicy', 'Гостре'], ['alcohol', 'Алкоголь']];

  // ---------- Єдиний список для пошуку ----------
  let base = null;
  function buildBase() {
    const out = [];
    Object.entries(FOODS).forEach(([id, f]) => {
      if (id.endsWith('_lf')) return out.push(item('f:' + id, f.n, f, (f.tags || []).filter(t => t !== 'dairy').concat('dairy'), '', 'Продукти', 100, f.liq));
      const lac = FOOD_LACTOSE[id];
      out.push(item('f:' + id, f.n, f, (f.tags || []).concat(lac ? [lac] : []), id === 'honey' ? 'sugar' : '', 'Продукти', f.unit ? f.unit.g : 100, f.liq));
    });
    Object.entries(DISHES_RAW).forEach(([cat, list]) => list.forEach((d, i) => {
      const [n, k, p, f, c, tags = '', flags = '', por, abv] = d;
      const it = item(`d:${cat}${i}`, n, { k, p, f, c }, tags.split(' ').filter(Boolean), flags, DISH_CATS[cat][0], por || DISH_CATS[cat][1], cat === 'drink');
      if (abv) it.abv = abv;
      out.push(it);
    }));
    return out;
  }
  function item(id, n, m, tags, flags, cat, por, liq) {
    return { id, n, k: m.k, p: m.p || 0, f: m.f || 0, c: m.c || 0, tags, flags: (typeof flags === 'string' ? flags.split(' ') : flags).filter(Boolean), cat, por, liq: !!liq, key: norm(n) };
  }
  const norm = s => s.toLowerCase().replace(/[ʼ’'`«»"]/g, '').replace(/ё/g, 'е');
  function all() {
    base = base || buildBase();
    return (st().customFoods || []).map(c => ({ ...c, cat: 'Мої', key: norm(c.n) })).concat(base);
  }
  const byId = id => all().find(x => x.id === id);

  function search(q) {
    const words = norm(q).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return all().filter(x => words.every(w => x.key.includes(w)))
      .sort((a, b) => (b.key.startsWith(words[0]) - a.key.startsWith(words[0])) || a.n.length - b.n.length).slice(0, 30);
  }

  // ---------- Попередження ----------
  const EXC_LABEL = id => (EXCLUSIONS.find(e => e[0] === id) || [, id])[1].toLowerCase();
  function warnItem(it, p) {
    const fam = st().family || { exclude: [] }, h = p.health || {}, out = [];
    const ex = it.tags.filter(t => fam.exclude.includes(t));
    if (ex.length) out.push({ lvl: 'red', text: `містить: ${ex.map(EXC_LABEL).join(', ')} — виключено в анкеті` });
    const L = fam.lactose || 'none';
    const lac = it.tags.includes('lacH') ? 'high' : it.tags.includes('lacL') ? 'low' : null;
    if (lac && L === 'strict' && !fam.exclude.includes('dairy')) out.push({ lvl: 'red', text: 'містить лактозу — у вас непереносимість. Шукайте безлактозний варіант' });
    if (lac === 'high' && L === 'mild') out.push({ lvl: 'yellow', text: 'багато лактози — у вас чутливість. Краще безлактозний варіант' });
    const F = it.flags;
    if (h.diabetes && F.includes('sugar')) out.push({ lvl: 'yellow', text: 'солодке — при діабеті небажано (різко підвищує цукор)' });
    if (h.pressure && F.includes('salty')) out.push({ lvl: 'yellow', text: 'багато солі — при підвищеному тиску небажано' });
    if (h.stomach && (F.includes('fried') || F.includes('deep') || F.includes('spicy'))) out.push({ lvl: 'yellow', text: 'смажене чи гостре — навантаження на шлунок' });
    if (F.includes('alcohol')) out.push({ lvl: 'yellow', text: 'алкоголь — «порожні» калорії, підсилює апетит і погіршує сон' });
    if (F.includes('sugar') && !h.diabetes && !F.includes('alcohol')) out.push({ lvl: 'yellow', text: 'багато цукру — швидко повертає голод' });
    if (F.includes('deep')) out.push({ lvl: 'yellow', text: 'смажене у фритюрі — дуже калорійно' });
    return out;
  }

  // ---------- Журнал дня ----------
  function dayLog(pid, date) {
    const c = st().logs.custom || (st().logs.custom = {});
    c[pid] = c[pid] || {};
    return c[pid][date] = c[pid][date] || { replace: {}, extra: [] };
  }
  const peekLog = (pid, date) => ((st().logs.custom || {})[pid] || {})[date] || { replace: {}, extra: [] };

  // План дня з урахуванням замін: порції незʼїдених прийомів перераховуються під залишок калорій
  function dayPlan(p, date) {
    const t = Calc.targets(p), sl = Plan.slots();
    const plan = Plan.mealWeek(Plan.weekNo(date));
    const ticked = ((st().logs.meals[p.id] || {})[date]) || {};
    const log = peekLog(p.id, date);
    const rows = plan.days[D.weekday(date)].map((rid, i) => ({ i, label: sl[i][1], share: sl[i][2], r: Plan.recipe(rid), rep: log.replace[i] || null, eaten: !!ticked[i] || !!log.replace[i] }));
    const changed = Object.keys(log.replace).length > 0 || log.extra.length > 0;
    // запланований на цей день алкоголь: калорії зарезервовані, порції їжі розраховані з kcalFood
    const drunk = (((st().logs.drinks || {})[p.id] || {})[date]) || {};
    const drinks = (p.alcohol || []).map((a, j) => ({ ...a, j, done: !!drunk[j] })).filter(a => a.wd === D.weekday(date));
    const drinkK = drinks.reduce((s, a) => s + a.kcal, 0);
    const food = t.kcalFood;
    const target = Math.round(food + drinkK);
    let fixed = log.extra.reduce((s, x) => s + x.kcal, 0) + drinkK;
    rows.forEach(rw => {
      if (rw.rep) { fixed += rw.rep.kcal; return; }
      if (rw.eaten) {
        // зʼїдене рахуємо так, як було показано в момент позначки
        rw.por = Plan.portion(rw.r, 1, typeof ticked[rw.i] === 'number' ? ticked[rw.i] : food * rw.share);
        if (typeof ticked[rw.i] === 'number') rw.por.kcal = ticked[rw.i];
        fixed += rw.por.kcal;
      }
    });
    const open = rows.filter(rw => !rw.rep && !rw.eaten);
    const budget = target - fixed;
    const shareSum = open.reduce((s, rw) => s + rw.share, 0) || 1;
    open.forEach(rw => {
      const k = changed ? Math.max(0, budget) * rw.share / shareSum : food * rw.share;
      rw.por = Plan.portion(rw.r, 1, k);
      rw.adjusted = changed && Math.abs(rw.por.kcal - food * rw.share) > 20;
    });
    const eaten = fixed - drinks.filter(a => !a.done).reduce((s, a) => s + a.kcal, 0);
    const planned = fixed + open.reduce((s, rw) => s + rw.por.kcal, 0);
    return { rows, drinks, extra: log.extra, target, eaten, planned, changed, over: planned - target };
  }

  // ---------- Тарілка ----------
  const ui = { plate: [], q: '', slot: null, showForm: false };
  const kcalOf = (it, g) => it.k * g / 100;
  function totals() {
    return ui.plate.reduce((a, row) => {
      const it = byId(row.id); if (!it) return a;
      a.k += kcalOf(it, row.g); a.p += it.p * row.g / 100; a.f += it.f * row.g / 100; a.c += it.c * row.g / 100; a.g += row.g;
      return a;
    }, { k: 0, p: 0, f: 0, c: 0, g: 0 });
  }

  function open(slot) {
    ui.slot = slot === undefined ? null : slot;
    ui.plate = []; ui.q = '';
    App.go('calc');
    setTimeout(() => { const q = document.getElementById('calc-q'); if (q) q.focus(); }, 30);
  }

  // ---------- Екран ----------
  function view() {
    const p = App.prof(), date = D.iso();
    const dp = dayPlan(p, date);
    const slotRow = ui.slot !== null && ui.slot !== 'extra' ? dp.rows[ui.slot] : null;
    const sub = slotRow ? `Заміна: ${slotRow.label} — «${App.esc(slotRow.r.name)}» (${slotRow.por ? slotRow.por.kcal : '—'} ккал)` : ui.slot === 'extra' ? 'Додати зʼїдене поза планом' : 'Порахуйте калорії перед тим, як їсти';
    return App.header('Калькулятор страви', sub) + `
      <div class="grid-main calc">
        <div>
          <div class="card">
            <div class="search"><input id="calc-q" data-calc="q" type="search" placeholder="Почніть вводити: борщ, вареники, гречка, піца…" value="${App.esc(ui.q)}" autocomplete="off"></div>
            <div id="calc-results" class="results">${resultsHtml()}</div>
          </div>
          <div class="card" id="calc-plate">${plateHtml(p)}</div>
        </div>
        <div>
          <div class="card" id="calc-summary">${summaryHtml(p, dp, slotRow)}</div>
          ${customHtml()}
        </div>
      </div>`;
  }

  function resultsHtml() {
    if (!ui.q.trim()) return '<div class="muted sm">Шукайте серед готових страв, продуктів і своїх записів. Натисніть на результат, щоб додати на тарілку.</div>';
    const res = search(ui.q);
    const p = App.prof();
    if (!res.length) return `<div class="empty">Нічого не знайдено. Додайте свою страву або продукт праворуч.</div>`;
    return res.map(it => {
      const w = warnItem(it, p);
      const lvl = w.some(x => x.lvl === 'red') ? 'red' : w.length ? 'yellow' : '';
      return `<button class="res" data-act="calc-add" data-id="${it.id}"><span class="dot ${lvl}"></span><span class="grow">${App.esc(it.n)}<small>${it.cat}</small></span><span class="muted sm">${Math.round(it.k)} ккал / 100 ${it.liq ? 'мл' : 'г'}</span></button>`;
    }).join('');
  }

  function plateHtml(p) {
    if (!ui.plate.length) return '<h3>Тарілка</h3><div class="empty">Порожньо. Знайдіть страву й додайте її, потім вкажіть вагу.</div>';
    return `<h3>Тарілка</h3>${ui.plate.map((row, i) => {
      const it = byId(row.id);
      const w = warnItem(it, p);
      const lvl = w.some(x => x.lvl === 'red') ? 'red' : w.length ? 'yellow' : '';
      return `<div class="plate-row"><span class="dot ${lvl}"></span><span class="grow">${App.esc(it.n)}</span>
        <input type="number" min="1" step="any" value="${row.g}" data-calc="g" data-i="${i}"><span class="unit">${it.liq ? 'мл' : 'г'}</span>
        <b class="pk" id="pk-${i}">${Math.round(kcalOf(it, row.g))} ккал</b>
        <button class="icon-btn sm" data-act="calc-del" data-i="${i}" title="Прибрати">${App.icon(App.ICON.x)}</button></div>`;
    }).join('')}<p class="hint">Вагу страви зручно визначити кухонними вагами: зважте тарілку з їжею й відніміть вагу порожньої тарілки.</p>`;
  }

  function summaryHtml(p, dp, slotRow) {
    const t = totals();
    const warns = [];
    ui.plate.forEach(row => { const it = byId(row.id); warnItem(it, p).forEach(w => warns.push({ ...w, text: `${it.n}: ${w.text}` })); });
    // калорійний контроль
    const slotKcal = slotRow && !slotRow.rep && slotRow.por ? slotRow.por.kcal : 0;
    const remaining = dp.target - dp.eaten + (slotRow && slotRow.rep ? slotRow.rep.kcal : 0);
    if (t.k > 0) {
      if (t.k > remaining) warns.push({ lvl: 'yellow', text: `Перевищить денну норму на ${Math.round(t.k - remaining)} ккал. Решту дня програма зменшить до мінімальних порцій.` });
      else if (slotRow && slotKcal && t.k > slotKcal * 1.3) warns.push({ lvl: 'yellow', text: `На ${Math.round(t.k - slotKcal)} ккал більше за заплановане. Порції решти дня буде зменшено.` });
      else if (!slotRow && t.k > remaining * 0.6) warns.push({ lvl: 'yellow', text: `Це ${Math.round(t.k / Math.max(1, remaining) * 100)}% калорій, що залишилися на сьогодні.` });
    }
    const reds = warns.filter(w => w.lvl === 'red'), yel = warns.filter(w => w.lvl === 'yellow');
    const canLog = ui.plate.length > 0;
    const action = slotRow ? `Записати замість «${slotRow.label}»` : 'Записати як зʼїдене сьогодні';
    return `<div class="sub">Разом ${Math.round(t.g)} г</div>
      <div class="big-num">${Math.round(t.k)}<small> ккал</small></div>
      <div class="macro-row"><span><b>${Math.round(t.p)}</b> г білка</span><span><b>${Math.round(t.f)}</b> г жирів</span><span><b>${Math.round(t.c)}</b> г вуглев.</span></div>
      <dl class="kv"><dt>Норма на сьогодні</dt><dd>${dp.target} ккал</dd><dt>Уже зʼїдено</dt><dd>${Math.round(dp.eaten - (slotRow && slotRow.rep ? slotRow.rep.kcal : 0))} ккал</dd>
        <dt>Залишиться після цієї страви</dt><dd class="${remaining - t.k < 0 ? 'neg' : ''}">${Math.round(remaining - t.k)} ккал</dd></dl>
      ${reds.map(w => `<div class="note danger">${App.icon(App.ICON.info)}<span><b>Не можна.</b> ${App.esc(w.text)}</span></div>`).join('')}
      ${yel.map(w => `<div class="note warn">${App.icon(App.ICON.info)}<span><b>Небажано.</b> ${App.esc(w.text)}</span></div>`).join('')}
      ${canLog && !reds.length && !yel.length ? `<div class="note ok-note">${App.icon(App.ICON.check)}<span>Підходить вашому плану.</span></div>` : ''}
      <div class="row">
        <button class="btn primary" data-act="calc-log" ${canLog ? '' : 'disabled'}>${action}</button>
        ${ui.plate.length ? '<button class="btn ghost" data-act="calc-clear">Очистити</button>' : ''}
      </div>
      ${slotRow && slotRow.rep ? `<button class="btn sm" data-act="calc-undo" data-i="${slotRow.i}">Повернути заплановану страву</button>` : ''}
      ${!slotRow && ui.slot !== 'extra' ? '<p class="hint">Щоб замінити конкретний прийом їжі, натисніть «Замінити» біля нього на екрані «Сьогодні».</p>' : ''}`;
  }

  function customHtml() {
    const mine = st().customFoods || [];
    return `<div class="card"><div class="card-h"><h3>Мої страви та продукти</h3><button class="btn sm" data-act="calc-form">${ui.showForm ? 'Сховати' : '+ Додати'}</button></div>
      ${ui.showForm ? `<form data-form="custom-food" class="custom-form">
        <label class="field"><span>Назва</span><input name="n" type="text" maxlength="60" placeholder="Сирок «Галичина», бургер з кафе…" required></label>
        <div class="grid4">
          <label class="field"><span>Ккал на 100</span><input name="k" type="number" step="1" min="0" required></label>
          <label class="field"><span>Білки, г</span><input name="p" type="number" step="0.1" min="0"></label>
          <label class="field"><span>Жири, г</span><input name="f" type="number" step="0.1" min="0"></label>
          <label class="field"><span>Вуглеводи, г</span><input name="c" type="number" step="0.1" min="0"></label>
        </div>
        <div class="grid4">
          <label class="field"><span>Звична порція</span><input name="por" type="number" step="any" min="1" value="100"></label>
          <label class="field"><span>Одиниці</span><select name="liq"><option value="0">грами</option><option value="1">мілілітри</option></select></label>
          <label class="field"><span>Лактоза</span><select name="lac"><option value="">немає</option><option value="lacL">трохи</option><option value="lacH">багато</option></select></label>
        </div>
        <div class="field"><span>Склад (для попереджень)</span><div class="chips">${EXCLUSIONS.map(([v, l]) => `<label class="chip"><input type="checkbox" name="tags" value="${v}"><span>${l}</span></label>`).join('')}</div></div>
        <div class="field"><span>Особливості</span><div class="chips">${FLAG_LABELS.map(([v, l]) => `<label class="chip"><input type="checkbox" name="flags" value="${v}"><span>${l}</span></label>`).join('')}</div></div>
        <p class="hint">Калорії та БЖВ беріть з етикетки (на 100 г). Для домашньої страви — приблизно зі схожої в пошуку.</p>
        <button class="btn primary">Зберегти</button></form>` : ''}
      ${mine.length ? mine.map(c => `<div class="log-row"><span class="grow">${App.esc(c.n)}</span><span class="muted sm">${c.k} ккал</span><button class="icon-btn sm" data-act="calc-add" data-id="${c.id}" title="На тарілку">${App.icon('M12 5v14M5 12h14')}</button><button class="icon-btn sm" data-act="calc-del-custom" data-id="${c.id}" title="Видалити">${App.icon(App.ICON.trash)}</button></div>`).join('') : (ui.showForm ? '' : '<div class="muted sm">Додайте продукти з етикеток чи страви з улюбленого кафе — вони зʼявляться в пошуку.</div>')}
    </div>`;
  }

  function refreshSummary() {
    const p = App.prof(), dp = dayPlan(p, D.iso());
    const slotRow = ui.slot !== null && ui.slot !== 'extra' ? dp.rows[ui.slot] : null;
    const el = document.getElementById('calc-summary');
    if (el) el.innerHTML = summaryHtml(p, dp, slotRow);
  }

  // ---------- Події ----------
  function onInput(e) {
    const el = e.target, k = el.dataset.calc;
    if (k === 'q') { ui.q = el.value; document.getElementById('calc-results').innerHTML = resultsHtml(); }
    if (k === 'g') {
      const i = +el.dataset.i, g = Math.max(0, parseFloat(el.value) || 0);
      ui.plate[i].g = g;
      const it = byId(ui.plate[i].id);
      document.getElementById('pk-' + i).textContent = Math.round(kcalOf(it, g)) + ' ккал';
      refreshSummary();
    }
  }

  function onAct(a, el) {
    const p = App.prof(), date = D.iso();
    switch (a) {
      case 'calc-open': open(el.dataset.slot === undefined ? null : el.dataset.slot === 'extra' ? 'extra' : +el.dataset.slot); return true;
      case 'calc-add': {
        const it = byId(el.dataset.id);
        ui.plate.push({ id: it.id, g: it.por || 100 });
        ui.q = '';
        App.render();
        const inputs = document.querySelectorAll('[data-calc="g"]');
        if (inputs.length) { inputs[inputs.length - 1].focus(); inputs[inputs.length - 1].select(); }
        return true;
      }
      case 'calc-del': ui.plate.splice(+el.dataset.i, 1); App.render(); return true;
      case 'calc-clear': ui.plate = []; App.render(); return true;
      case 'calc-form': ui.showForm = !ui.showForm; App.render(); return true;
      case 'calc-del-custom':
        if (confirm('Видалити зі своїх страв?')) { st().customFoods = (st().customFoods || []).filter(c => c.id !== el.dataset.id); Store.save(); App.render(); }
        return true;
      case 'calc-log': {
        const t = totals();
        if (!ui.plate.length || t.k <= 0) { App.toast('Вкажіть вагу страви'); return true; }
        const entry = {
          name: ui.plate.map(r => byId(r.id).n).join(' + '), kcal: Math.round(t.k), prot: Math.round(t.p),
          items: ui.plate.map(r => ({ n: byId(r.id).n, g: r.g, kcal: Math.round(kcalOf(byId(r.id), r.g)) })),
        };
        const log = dayLog(p.id, date);
        if (ui.slot !== null && ui.slot !== 'extra') {
          log.replace[ui.slot] = entry;
          const m = st().logs.meals; ((m[p.id] = m[p.id] || {})[date] = m[p.id][date] || {})[ui.slot] = true;
        } else log.extra.push({ ...entry, time: new Date().toTimeString().slice(0, 5) });
        Store.save();
        const dp = dayPlan(p, date);
        App.toast(dp.changed && dp.rows.some(r => r.adjusted) ? 'Записано. Порції решти дня перераховано' : 'Записано');
        ui.plate = []; ui.slot = null;
        App.go('today');
        return true;
      }
      case 'calc-undo': {
        const log = dayLog(p.id, date);
        delete log.replace[+el.dataset.i];
        const m = (st().logs.meals[p.id] || {})[date]; if (m) delete m[+el.dataset.i];
        Store.save(); ui.slot = null; App.toast('Повернуто заплановану страву'); App.go('today');
        return true;
      }
      case 'extra-del': {
        const log = dayLog(p.id, date);
        log.extra.splice(+el.dataset.i, 1); Store.save(); App.render();
        return true;
      }
    }
    return false;
  }

  function saveCustom(form) {
    const fd = new FormData(form);
    const num = k => { const v = parseFloat(String(fd.get(k) || '').replace(',', '.')); return isNaN(v) ? 0 : v; };
    const n = String(fd.get('n') || '').trim();
    if (!n || !(num('k') > 0)) { App.toast('Вкажіть назву й калорійність'); return; }
    const tags = fd.getAll('tags'); if (fd.get('lac')) tags.push(fd.get('lac'));
    const c = { id: 'c:' + Date.now().toString(36), n, k: num('k'), p: num('p'), f: num('f'), c: num('c'), tags, flags: fd.getAll('flags'), por: num('por') || 100, liq: fd.get('liq') === '1' };
    (st().customFoods = st().customFoods || []).push(c);
    Store.save();
    ui.showForm = false;
    ui.plate.push({ id: c.id, g: c.por });
    App.toast('Збережено й додано на тарілку');
    App.render();
  }

  const alcoholItems = () => all().filter(x => x.flags.includes('alcohol'));

  return { view, onInput, onAct, saveCustom, dayPlan, open, warnItem, search, byId, alcoholItems };
})();
