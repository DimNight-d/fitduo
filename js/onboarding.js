// Анкета: перший запуск і редагування
const Onboard = (() => {
  let flow = [], idx = 0, draft = null, mode = 'full', errors = {}, count = 1;

  const blank = (i) => ({
    id: 'p' + (i + 1), name: '', sex: null, age: '', height: '', weight: '', waist: '',
    goalWeight: '', goalWeeks: 16, work: 'sedentary', steps: 's4to7', health: {}, level: 'beginner', days: 3, minutes: 30,
    equipment: ['mat'], noJumps: true,
  });

  function start(m = 'full', personIdx = 0) {
    mode = m;
    const st = Store.state;
    count = m === 'add' ? 2 : m === 'full' ? count : st.profiles.length;
    draft = {
      profiles: [0, 1].map(i => JSON.parse(JSON.stringify(st.profiles[i] || blank(i)))),
      family: JSON.parse(JSON.stringify(st.family || { exclude: [], lactose: 'none', meals: 4, budget: 'mid', batch: true })),
    };
    if (m === 'full') flow = [{ s: 'welcome' }];
    else if (m === 'person') flow = [...person(personIdx), { s: 'summary' }];
    else if (m === 'add') flow = [...person(1), { s: 'summary' }];
    else flow = [{ s: 'family' }, { s: 'summary' }];
    idx = 0; errors = {};
    App.render();
  }

  const person = i => ['basic', 'activity', 'health', 'training'].map(s => ({ s, i }));
  const esc = App.esc;
  const radio = (name, val, opts) => `<div class="seg">${opts.map(([v, l, sub]) =>
    `<label class="seg-opt"><input type="radio" name="${name}" value="${v}" ${String(val) === String(v) ? 'checked' : ''}><span>${l}${sub ? `<small>${sub}</small>` : ''}</span></label>`).join('')}</div>`;
  const checks = (name, vals, opts) => `<div class="chips">${opts.map(([v, l]) =>
    `<label class="chip"><input type="checkbox" name="${name}" value="${v}" ${vals.includes(v) ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>`;
  const field = (name, label, val, attrs = '', suffix = '') => `<label class="field"><span>${label}</span>
    <div class="input-wrap"><input name="${name}" value="${esc(val)}" ${attrs}>${suffix ? `<em>${suffix}</em>` : ''}</div>
    ${errors[name] ? `<small class="err">${errors[name]}</small>` : ''}</label>`;

  function stepHtml() {
    const { s, i } = flow[idx];
    const p = i !== undefined ? draft.profiles[i] : null;
    const who = p ? `<div class="ob-who">${esc(p.name || (i ? 'Другий учасник' : 'Перший учасник'))}</div>` : '';
    switch (s) {
      case 'welcome': return `
        <div class="ob-hero"><div class="logo big"><span>FIT</span>DUO</div>
        <h1>Персональна програма схуднення</h1>
        <p class="muted">Дайте відповіді на кілька запитань. Програма розрахує калорії й порції, складе меню з простих продуктів і план тренувань удома на 12 тижнів.</p>
        <ul class="ob-list"><li>Займе ~5 хвилин</li><li>Усі дані зберігаються лише на цьому пристрої</li><li>Анкету можна змінити будь-коли</li></ul>
        <div class="field"><span>Для кого програма</span>${radio('count', count, [[1, 'Тільки для мене', 'кожен веде свою програму на своєму пристрої'], [2, 'Для нас двох', 'спільне меню, порції окремо']])}</div></div>`;
      case 'basic': return `${who}<h2>Основні дані</h2>
        <div class="grid2">
          ${field('name', 'Ім\'я', p.name, 'type="text" maxlength="20"')}
          <div class="field"><span>Стать</span>${radio('sex', p.sex, [['m', 'Чоловік'], ['f', 'Жінка']])}${errors.sex ? `<small class="err">${errors.sex}</small>` : ''}</div>
          ${field('age', 'Вік', p.age, 'type="number" min="16" max="90" inputmode="numeric"', 'років')}
          ${field('height', 'Зріст', p.height, 'type="number" min="130" max="220"', 'см')}
          ${field('weight', 'Поточна вага', p.weight, 'type="number" step="0.1" min="35" max="250"', 'кг')}
          ${field('waist', 'Обхват талії (необов\'язково)', p.waist, 'type="number" step="0.5" min="40" max="200"', 'см')}
          ${field('goalWeight', 'Бажана вага', p.goalWeight, 'type="number" step="0.1" min="35" max="250"', 'кг')}
          <div class="field"><span>Бажаний термін</span>${radio('goalWeeks', p.goalWeeks, [[8, '2 міс'], [12, '3 міс'], [16, '4 міс'], [24, '6 міс'], [36, '9 міс']])}</div>
        </div>
        <p class="hint">Талію міряйте зранку натщесерце сантиметровою стрічкою на рівні пупка, на видиху, не втягуючи живіт.</p>`;
      case 'activity': return `${who}<h2>Активність</h2>
        <div class="field"><span>Ваша робота / день</span>${radio('work', p.work, [['sedentary', 'Сидяча', 'офіс, комп\'ютер'], ['mixed', 'Змішана', 'частково на ногах'], ['active', 'Активна', 'весь день на ногах']])}</div>
        <div class="field"><span>Скільки кроків приблизно проходите за день</span>${radio('steps', p.steps, [['lt4', '< 4 тис.'], ['s4to7', '4–7 тис.'], ['s7to10', '7–10 тис.'], ['gt10', '> 10 тис.']])}</div>
        <p class="hint">Кроки можна подивитися в застосунку «Здоров'я» на iPhone.</p>`;
      case 'health': {
        const h = Object.keys(p.health).filter(k => p.health[k]);
        const opts = [['back', 'Біль або травма спини'], ['knees', 'Проблеми з колінами'], ['shoulders', 'Проблеми з плечима'], ['pressure', 'Підвищений тиск'], ['thyroid', 'Щитовидна залоза'], ['diabetes', 'Діабет'], ['stomach', 'Шлунок / ШКТ']];
        return `${who}<h2>Здоров'я</h2>
        <p class="muted">Позначте все, що стосується вас. Програма прибере небезпечні вправи й підкаже обмеження. Якщо нічого — просто натисніть «Далі».</p>
        ${checks('health', h, opts)}
        <p class="hint">Програма не замінює лікаря. При хронічних захворюваннях погодьте план зі своїм лікарем.</p>`;
      }
      case 'training': return `${who}<h2>Тренування</h2>
        <div class="field"><span>Рівень підготовки</span>${radio('level', p.level, [['beginner', 'Новачок', 'давно не займався(-лась)'], ['some', 'Трохи займаюсь', 'іноді тренуюсь'], ['regular', 'Регулярно', '2+ рази на тиждень']])}</div>
        <div class="field"><span>Днів на тиждень</span>${radio('days', p.days, [[2, '2'], [3, '3'], [4, '4'], [5, '5']])}</div>
        <div class="field"><span>Хвилин на одне тренування</span>${radio('minutes', p.minutes, [[20, '20'], [30, '30'], [40, '40'], [45, '45'], [60, '60']])}</div>
        <div class="field"><span>Інвентар удома</span>${checks('equipment', p.equipment, EQUIPMENT)}</div>
        <div class="field"><span>Стрибки</span>${radio('noJumps', p.noJumps ? '1' : '0', [['1', 'Без стрибків', 'тихо для сусідів'], ['0', 'Можна стрибати']])}</div>`;
      case 'family': return `${count > 1 ? '<div class="ob-who">Для вас обох</div>' : ''}<h2>Харчування</h2>
        <p class="muted">${count > 1 ? 'Меню одне на двох — порції програма розрахує окремо для кожного.' : 'Порції програма розрахує під вашу норму калорій.'}</p>
        <div class="field"><span>Що НЕ їсте${count > 1 ? ' (хоча б один із вас)' : ''} або алергія</span>${checks('exclude', draft.family.exclude, EXCLUSIONS)}</div>
        <div class="field"><span>Реакція на лактозу${count > 1 ? ' (у когось із вас)' : ''}</span>${radio('lactose', draft.family.lactose || 'none', [['none', 'Немає', 'звичайні молочні продукти'], ['mild', 'Чутливість', 'дискомфорт від молока, кисломолочне — нормально'], ['strict', 'Непереносимість', 'реакція на всі молочні продукти']])}</div>
        <p class="hint">При чутливості програма замінить молоко й сметану на безлактозні. При непереносимості — також кефір, йогурт і кисломолочний сир. Твердий витриманий сир майже не містить лактози. Якщо молочне не підходить зовсім — позначте «Молочні продукти» вище.</p>
        <div class="field"><span>Скільки разів на день їсти</span>${radio('meals', draft.family.meals, [[3, '3 рази', 'сніданок, обід, вечеря'], [4, '4 рази', '+ перекус'], [5, '5 разів', '+ 2 перекуси']])}</div>
        <div class="field"><span>Бюджет на продукти</span>${radio('budget', draft.family.budget, [['econ', 'Економний', 'без дорожчих продуктів'], ['mid', 'Середній', 'увесь асортимент']])}</div>
        <div class="field"><span>Готування</span>${radio('batch', draft.family.batch ? '1' : '0', [['1', 'На 2 дні наперед', 'обід і вечеря повторюються 2 дні'], ['0', 'Щодня свіже', 'більше різноманіття']])}</div>`;
      case 'summary': return summaryHtml();
    }
  }

  function summaryHtml() {
    const st = Store.state;
    const saved = st.profiles;
    // тимчасово підставляємо чернетку для розрахунку
    st.profiles = draft.profiles.slice(0, count);
    const cards = draft.profiles.slice(0, count).map(p => {
      const t = Calc.targets(p);
      return `<div class="card">
        <div class="card-h"><h3>${esc(p.name)}</h3><span class="tag">ІМТ ${t.bmi.toFixed(1)}</span></div>
        <div class="big-num">${t.kcal}<small> ккал/день</small></div>
        <div class="macro-row"><span><b>${t.protein}</b> г білка</span><span><b>${t.fat}</b> г жирів</span><span><b>${t.carbs}</b> г вуглеводів</span></div>
        <dl class="kv">
          <dt>Базовий обмін</dt><dd>${t.bmr} ккал</dd>
          <dt>Витрата за день</dt><dd>${t.tdee} ккал</dd>
          <dt>Дефіцит</dt><dd>${t.deficit} ккал (~${t.weeklyLoss.toFixed(2)} кг/тиж.)</dd>
          <dt>Вода</dt><dd>${t.water} л</dd>
          <dt>Ціль по кроках</dt><dd>${t.steps.toLocaleString('uk-UA')} (+1 000 кожні 2 тижні)</dd>
          <dt>Прогноз досягнення ${p.goalWeight} кг</dt><dd>${t.forecastRange ? `${t.forecastRange} (${t.forecastWeeksRange})` : '—'}</dd>
        </dl>
        ${App.warnings(t.warnings)}
      </div>`;
    }).join('');
    st.profiles = saved;
    return `<h2>Ваші розрахунки</h2>
      <p class="muted">Формула Міффліна–Сан Жеора, помірний дефіцит до 20% (не швидше 0,75% ваги на тиждень). Кожні 2 тижні програма підкоригує калорії за фактичною динамікою ваги.</p>
      <div class="grid2">${cards}</div>`;
  }

  function collect() {
    const form = document.getElementById('ob-form');
    const { s, i } = flow[idx];
    const fd = new FormData(form);
    errors = {};
    if (i !== undefined) {
      const p = draft.profiles[i];
      if (s === 'basic') {
        p.name = (fd.get('name') || '').trim();
        p.sex = fd.get('sex');
        if (!p.sex) errors.sex = 'Виберіть стать';
        const num = (k, min, max, opt) => {
          const raw = String(fd.get(k) || '').replace(',', '.').trim();
          if (!raw && opt) { p[k] = ''; return; }
          const v = parseFloat(raw);
          if (isNaN(v) || v < min || v > max) errors[k] = `Введіть значення від ${min} до ${max}`;
          p[k] = isNaN(v) ? raw : v;
        };
        if (!p.name) errors.name = 'Введіть ім\'я';
        num('age', 16, 90); num('height', 130, 220); num('weight', 35, 250); num('waist', 40, 200, true); num('goalWeight', 35, 250);
        if (!errors.goalWeight && !errors.weight && p.goalWeight > p.weight) errors.goalWeight = 'Бажана вага має бути не більшою за поточну';
        p.goalWeeks = +fd.get('goalWeeks');
      }
      if (s === 'activity') { p.work = fd.get('work'); p.steps = fd.get('steps'); }
      if (s === 'health') { p.health = {}; fd.getAll('health').forEach(k => p.health[k] = true); }
      if (s === 'training') {
        p.level = fd.get('level'); p.days = +fd.get('days'); p.minutes = +fd.get('minutes');
        p.equipment = fd.getAll('equipment'); p.noJumps = fd.get('noJumps') === '1';
      }
    }
    if (s === 'family') {
      draft.family = { exclude: fd.getAll('exclude'), lactose: fd.get('lactose') || 'none', meals: +fd.get('meals'), budget: fd.get('budget'), batch: fd.get('batch') === '1' };
    }
    return !Object.keys(errors).length;
  }

  function next() {
    if (flow[idx].s === 'welcome') {
      const c = +new FormData(document.getElementById('ob-form')).get('count') || 1;
      if (c !== count) {
        count = c;
        draft.profiles = [0, 1].map(i => blank(i));
      }
      flow = [flow[0], ...person(0), ...(count > 1 ? person(1) : []), { s: 'family' }, { s: 'summary' }];
    }
    if (flow[idx].s !== 'welcome' && flow[idx].s !== 'summary' && !collect()) { App.render(); return; }
    if (flow[idx].s === 'summary') return finish();
    idx++;
    App.render();
    window.scrollTo(0, 0);
  }
  function back() {
    if (idx === 0) { if (mode !== 'full' || Store.state.profiles.length) { flow = []; App.go('profiles'); } return; }
    if (flow[idx].s !== 'summary' && flow[idx].s !== 'welcome') collect();
    errors = {};
    idx--;
    App.render();
  }

  function finish() {
    const st = Store.state;
    const today = D.iso();
    const first = !st.startDate;
    const famChanged = JSON.stringify(st.family) !== JSON.stringify(draft.family);
    const profiles = draft.profiles.slice(0, count);
    profiles.forEach(p => {
      const ws = st.logs.weights[p.id] || (st.logs.weights[p.id] = []);
      const last = ws[ws.length - 1];
      if (!last || last.kg !== p.weight) {
        const ex = ws.find(x => x.date === today);
        if (ex) ex.kg = p.weight; else ws.push({ date: today, kg: p.weight });
        ws.sort((a, b) => a.date.localeCompare(b.date));
      }
      if (p.waist && first) (st.logs.measures[p.id] = st.logs.measures[p.id] || []).push({ date: today, waist: p.waist });
    });
    st.profiles = profiles;
    st.family = draft.family;
    if (first) { st.startDate = D.monday(today); st.recipesVersion = RECIPES_VERSION; }
    if (famChanged) {
      // перегенеровуємо меню з поточного тижня
      const n = Plan.weekNo();
      Object.keys(st.plans).forEach(k => { if (+k >= n) delete st.plans[k]; });
    }
    Store.save();
    flow = [];
    App.toast(first ? 'Програму створено. Успіхів!' : 'Анкету оновлено, розрахунки перераховано');
    App.go(first ? 'today' : 'profiles');
  }

  function render() {
    const st = flow[idx];
    const pct = Math.round((idx + 1) / flow.length * 100);
    const nextLabel = st.s === 'welcome' ? 'Почати' : st.s === 'summary' ? (mode === 'full' && !Store.state.startDate ? 'Почати програму' : 'Зберегти') : 'Далі';
    const showBack = idx > 0 || mode !== 'full' || Store.state.profiles.length;
    return `<div class="ob">
      <div class="ob-progress"><div style="width:${pct}%"></div></div>
      <form id="ob-form" class="ob-card" onsubmit="return false">${stepHtml()}
        <div class="ob-actions">
          ${showBack ? '<button type="button" class="btn ghost" data-act="ob-back">Назад</button>' : '<span></span>'}
          <button type="submit" class="btn primary" data-act="ob-next">${nextLabel}</button>
        </div>
      </form></div>`;
  }

  return { start, render, next, back, get active() { return flow.length > 0; } };
})();
