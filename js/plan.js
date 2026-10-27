// Генерація меню, порцій, списку покупок і тренувань
const Plan = (() => {
  const SLOTS = {
    3: [['breakfast', 'Сніданок', 0.3], ['main', 'Обід', 0.4], ['main', 'Вечеря', 0.3]],
    4: [['breakfast', 'Сніданок', 0.25], ['main', 'Обід', 0.35], ['snack', 'Перекус', 0.15], ['main', 'Вечеря', 0.25]],
    5: [['breakfast', 'Сніданок', 0.25], ['snack', 'Перекус', 0.1], ['main', 'Обід', 0.3], ['snack', 'Перекус', 0.1], ['main', 'Вечеря', 0.25]],
  };
  const PROGRAM_WEEKS = 12;

  function rng(seed) {
    return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function shuffle(arr, seed) {
    const a = arr.slice(), r = rng(seed);
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  // ---- Тижні програми ----
  function weekNo(date = D.iso()) {
    const st = Store.state;
    if (!st.startDate) return 1;
    return Math.floor(D.diff(D.monday(date), st.startDate) / 7) + 1;
  }
  const weekStart = n => D.add(Store.state.startDate, (n - 1) * 7);
  const phase = n => n <= 4 ? 1 : n <= 8 ? 2 : 3;
  const PHASES = { 1: 'Адаптація', 2: 'Розвиток', 3: 'Інтенсив' };

  // ---- Харчування ----
  function slots() { return SLOTS[(Store.state.family || {}).meals || 3]; }

  function allowed(type) {
    const fam = Store.state.family || { exclude: [] };
    let list = RECIPES.filter(r => r.type === type && !fam.exclude.some(t => r.tags.has(t)));
    if (fam.budget === 'econ') { const cheap = list.filter(r => !r.exp); if (cheap.length >= 4) list = cheap; }
    if (!list.length) list = RECIPES.filter(r => r.type === type);
    return list;
  }

  function mealWeek(n) {
    const st = Store.state;
    // збережене меню з неіснуючими стравами (після оновлення бази) — генеруємо заново
    if (st.plans[n] && st.plans[n].days.flat().every(id => RECIPES.some(r => r.id === id))) return st.plans[n];
    const fam = st.family || {};
    const sl = slots();
    const pools = {};
    ['breakfast', 'main', 'snack'].forEach((t, i) => pools[t] = shuffle(allowed(t), n * 97 + i * 13 + 7));
    // у дні з алкоголем (і в парні дні при готуванні наперед) — найбільш білкові обіди й вечері
    const alcDays = new Set(st.profiles.flatMap(p => (p.alcohol || []).map(a => a.wd)));
    const isAlc = d => alcDays.has(d) || (fam.batch && alcDays.has(d % 2 ? d - 1 : d + 1));
    const byProt = pools.main.slice().sort((a, b) => b.prot / b.kcal - a.prot / a.kcal);
    pools.mainProt = shuffle(byProt.slice(0, Math.max(4, Math.ceil(byProt.length / 2))), n * 31 + 5);
    const days = [];
    for (let d = 0; d < 7; d++) {
      const counters = { main: 0, snack: 0 };
      days.push(sl.map(([type]) => {
        const pool = type === 'main' && isAlc(d) ? pools.mainProt : pools[type];
        if (type === 'breakfast') return pool[d % pool.length].id;
        const k = counters[type]++;
        if (type === 'main') {
          const base = fam.batch ? Math.floor(d / 2) * 2 : d * 2;
          return pool[(base + k) % pool.length].id;
        }
        return pool[(d + k * 3) % pool.length].id;
      }));
    }
    st.plans[n] = { days };
    Store.save();
    return st.plans[n];
  }

  function swap(n, day, slotIdx) {
    const plan = mealWeek(n);
    const cur = plan.days[day][slotIdx];
    const type = slots()[slotIdx][0];
    const pool = allowed(type);
    const used = new Set(plan.days[day]);
    let i = pool.findIndex(r => r.id === cur);
    for (let step = 1; step <= pool.length; step++) {
      const cand = pool[(i + step) % pool.length];
      if (!used.has(cand.id)) { plan.days[day][slotIdx] = cand.id; break; }
    }
    // при готуванні наперед міняємо і парний день
    const fam = Store.state.family || {};
    if (fam.batch && type === 'main') {
      const pair = day % 2 === 0 ? day + 1 : day - 1;
      if (pair >= 0 && pair < 7 && plan.days[pair][slotIdx] === cur) plan.days[pair][slotIdx] = plan.days[day][slotIdx];
    }
    Store.save();
  }

  const recipe = id => RECIPES.find(r => r.id === id);

  // Масштаб порції для людини
  function scale(r, share, kcal) { return Math.max(0.5, Math.min(2.5, kcal * share / r.kcal)); }
  const round5 = g => Math.max(5, Math.round(g / 5) * 5);

  // Заміна продукту з урахуванням реакції на лактозу
  const subst = id => (LACTOSE[(Store.state.family || {}).lactose] || {})[id] || id;

  function portion(r, share, kcal) {
    const s = scale(r, share, kcal);
    return { s, kcal: Math.round(r.kcal * s), prot: Math.round(r.prot * s), ing: r.ing.map(([id, g]) => [subst(id), round5(g * s)]) };
  }

  function fmtAmount(id, g) {
    const f = FOODS[id];
    if (f.unit) { const n = g / f.unit.g; return `${n < 1 ? '½' : Math.round(n * 2) / 2} ${f.unit.n}`.replace('.5', '½'); }
    const [u, U] = f.liq ? ['мл', 'л'] : ['г', 'кг'];
    return g >= 1000 ? (g / 1000).toFixed(1).replace('.', ',') + ' ' + U : g + ' ' + u;
  }

  function shopping(n) {
    const plan = mealWeek(n), sl = slots();
    const totals = {};
    const ts = Store.state.profiles.map(p => Calc.targets(p).kcalFood);
    plan.days.forEach(day => day.forEach((rid, i) => {
      const r = recipe(rid);
      ts.forEach(kcal => portion(r, sl[i][2], kcal).ing.forEach(([id, g]) => totals[id] = (totals[id] || 0) + g));
    }));
    const groups = {};
    Object.entries(totals).forEach(([id, g]) => {
      const cat = FOODS[id].cat;
      (groups[cat] = groups[cat] || []).push({ id, g, name: FOODS[id].n, amount: shopAmount(id, g) });
    });
    Object.values(groups).forEach(l => l.sort((a, b) => a.name.localeCompare(b.name, 'uk')));
    return groups;
  }

  function shopAmount(id, g) {
    const f = FOODS[id];
    if (f.unit) return Math.ceil(g / f.unit.g) + ' ' + f.unit.n;
    const [u, U] = f.liq ? ['мл', 'л'] : ['г', 'кг'];
    if (g >= 1000) return (Math.ceil(g / 100) / 10).toString().replace('.', ',') + ' ' + U;
    return Math.ceil(g / 10) * 10 + ' ' + u;
  }

  // ---- Тренування ----
  const SCHEDULE = { 2: [1, 5], 3: [0, 2, 4], 4: [0, 1, 3, 5], 5: [0, 1, 2, 4, 5] };
  const TEMPLATES = {
    A: { name: 'Все тіло', pats: ['squat', 'push', 'hinge', 'pull', 'core', 'oblique', 'cardio'] },
    B: { name: 'Ноги, сідниці + кор', pats: ['squat', 'lunge', 'hinge', 'core', 'oblique', 'core', 'cardio'] },
    C: { name: 'Верх тіла + кор + кардіо', pats: ['push', 'pull', 'cardio', 'oblique', 'core', 'push', 'cardio'] },
  };
  const TIMING = { 1: [30, 30], 2: [40, 20], 3: [45, 15] };
  const LEVEL = { beginner: 1, some: 2, regular: 3 };

  function safe(p, e) {
    const h = p.health || {};
    const eq = p.equipment || [];
    if (e.jump && p.noJumps) return false;
    if (e.knee && h.knees && e.lvl > 1) return false;
    if (e.back && h.back) return false;
    if (e.shoulder && h.shoulders) return false;
    if (e.eq && !e.eq.every(x => eq.includes(x))) return false;
    if (h.pressure && e.hold && e.lvl > 1) return false;
    return true;
  }

  function pick(p, pat, target, seed, used) {
    let c = EXERCISES.filter(e => e.pat === pat && safe(p, e) && !used.has(e.id));
    if (!c.length) c = EXERCISES.filter(e => e.pat === pat && safe(p, e));
    if (!c.length) return null;
    const best = Math.max(...c.filter(e => e.lvl <= target).map(e => e.lvl), Math.min(...c.map(e => e.lvl)));
    let pool = c.filter(e => e.lvl === best);
    if (pool.length < 2) pool = c.filter(e => e.lvl === best || e.lvl === best - 1);
    return pool[seed % pool.length];
  }

  function workoutWeek(p, n) {
    const ph = phase(n);
    // boost / extraWork змінюються за оцінками «легко / важко» після тренувань
    const target = Math.max(1, Math.min(3, (LEVEL[p.level] || 1) + (ph - 1) * 0.5 + (p.boost || 0)));
    const [w0, r0] = p.level === 'beginner' && ph === 1 ? [30, 30] : TIMING[ph];
    const extra = p.extraWork || 0;
    const work = w0 + extra, rest = Math.max(10, r0 - extra);
    const days = SCHEDULE[Math.max(2, Math.min(5, p.days || 3))];
    const order = ['A', 'B', 'C'];
    const week = {};
    days.forEach((wd, i) => {
      const t = order[(i + (n - 1) * days.length) % 3];
      const used = new Set();
      const main = TEMPLATES[t].pats.map((pat, j) => {
        const e = pick(p, pat, Math.floor(target), n + i * 3 + j, used);
        if (e) used.add(e.id);
        return e && e.id;
      }).filter(Boolean);
      const warm = ['w_march', 'w_arms', 'w_halfsquat', i % 2 ? 'w_bend' : 'w_catcow'];
      const cool = ['c_child', 'c_kneehug', 'c_hams', 'c_quad'];
      const avail = Math.max(10, (p.minutes || 30) - 6) * 60;
      const perRound = main.length * (work + rest) + 45;
      const rounds = Math.max(2, Math.min(5, Math.floor(avail / perRound)));
      const total = Math.round((warm.length * 40 + rounds * perRound - 45 + cool.length * 40) / 60);
      week[wd] = { type: t, name: TEMPLATES[t].name, warm, main, cool, rounds, work, rest, total };
    });
    return week;
  }

  function workoutFor(p, date = D.iso()) {
    const n = weekNo(date);
    const w = workoutWeek(p, n);
    return w ? w[D.weekday(date)] || null : null;
  }

  return { subst, SLOTS, PROGRAM_WEEKS, PHASES, weekNo, weekStart, phase, slots, mealWeek, swap, recipe, portion, fmtAmount, shopping, workoutWeek, workoutFor, safe };
})();
