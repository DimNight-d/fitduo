// Дати та розрахунки
const D = {
  iso(d = new Date()) {
    const z = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
  },
  parse(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); },
  add(s, days) { const d = D.parse(s); d.setDate(d.getDate() + days); return D.iso(d); },
  diff(a, b) { return Math.round((D.parse(a) - D.parse(b)) / 864e5); },
  monday(s) { const d = D.parse(s); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return D.iso(d); },
  weekday(s) { return (D.parse(s).getDay() + 6) % 7; },
  fmt(s, opts = { day: 'numeric', month: 'long' }) { return D.parse(s).toLocaleDateString('uk-UA', opts); },
  // «травень – липень 2027 р.» або «грудень 2026 р. – лютий 2027 р.»
  monthRange(a, b) {
    const my = { month: 'long', year: 'numeric' };
    if (a.slice(0, 7) === b.slice(0, 7)) return D.fmt(a, my);
    if (a.slice(0, 4) === b.slice(0, 4)) return `${D.parse(a).toLocaleDateString('uk-UA', { month: 'long' })} – ${D.fmt(b, my)}`;
    return `${D.fmt(a, my)} – ${D.fmt(b, my)}`;
  },
  DAYS: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'],
  DAYS_FULL: ['Понеділок', 'Вівторок', 'Середа', 'Четвер', 'Пʼятниця', 'Субота', 'Неділя'],
};

const Calc = (() => {
  const WORK = { sedentary: 1.2, mixed: 1.3, active: 1.45 };
  const STEPS = { lt4: 0, s4to7: 0.05, s7to10: 0.1, gt10: 0.15 };
  const STEP_GOAL = { lt4: 6000, s4to7: 8000, s7to10: 10000, gt10: 10000 };

  const bmi = (w, h) => w / ((h / 100) ** 2);
  // Тижні підтримки між циклами: калорії = витрата, без дефіциту
  const inMaintenance = (date = D.iso()) => { const m = Store.state.maintenance; return !!m && date >= m.from && date < m.until; };
  // Ціль по кроках росте на 1 000 кожні 2 тижні до 11 000
  function stepGoal(p) {
    const base = STEP_GOAL[p.steps] || 8000;
    const start = Store.state.startDate;
    const steps = start ? Math.max(0, Math.floor(D.diff(D.iso(), start) / 14)) : 0;
    return Math.min(Math.max(11000, base), base + steps * 1000);
  }
  const bmr = (p, w) => 10 * w + 6.25 * p.height - 5 * p.age + (p.sex === 'm' ? 5 : -161);
  const activity = p => Math.min(1.9, (WORK[p.work] || 1.2) + (STEPS[p.steps] || 0) + (p.days || 0) * 0.025 * Math.min(1.5, (p.minutes || 30) / 40));

  function currentWeight(p) {
    const w = (Store.state.logs.weights[p.id] || []);
    return w.length ? w[w.length - 1].kg : p.weight;
  }

  // Середня вага за 7 днів до дати включно
  function avgWeight(pid, until, span = 7) {
    const list = (Store.state.logs.weights[pid] || []).filter(x => x.date <= until && D.diff(until, x.date) < span);
    if (!list.length) return null;
    return list.reduce((s, x) => s + x.kg, 0) / list.length;
  }

  function targets(p) {
    const w = currentWeight(p);
    const floor = p.sex === 'm' ? 1500 : 1200;
    const b = bmr(p, w), act = activity(p), tdee = b * act;
    const adj = (Store.state.adjust[p.id] || {}).kcal || 0;
    const warnings = [];
    const maxDef = w * 0.0075 * 7700 / 7; // не швидше 0,75% ваги на тиждень
    const maint = inMaintenance();
    let kcal = maint ? Math.max(floor, tdee) : Math.max(floor, tdee - Math.min(tdee * 0.2, maxDef) + adj);
    if (maint) warnings.push({ lvl: 'info', text: 'Тижні підтримки: калорії дорівнюють вашій витраті, мета — утримати вагу й відпочити від дефіциту. Коливання ±1 кг — нормально.' });
    else if (tdee - kcal < 150) warnings.push({ lvl: 'warn', text: 'Ваша витрата енергії близька до мінімальної безпечної норми, тому дефіцит невеликий. Головний важіль — більше руху (кроки, тренування).' });
    kcal = Math.round(kcal / 10) * 10;

    // Запланований алкоголь: його калорії розподіляємо на весь тиждень, зменшуючи їжу щодня потроху
    const alc = p.alcohol || [];
    const alcWeek = alc.reduce((s, a) => s + a.kcal, 0);
    const alcPerDay = alcWeek / 7;
    const alcCut = Math.min(alcPerDay, Math.max(0, kcal - floor));
    const kcalFood = Math.round((kcal - alcCut) / 10) * 10;
    const uncovered = alcPerDay - alcCut; // те, що вже не компенсувати без шкоди

    const deficit = Math.max(0, tdee - kcal - uncovered);
    const weeklyLoss = deficit * 7 / 7700;

    const h2 = (p.height / 100) ** 2;
    const curBmi = bmi(w, p.height);
    const refW = curBmi > 27 ? 25 * h2 * 1.1 : w;
    const protein = Math.round(1.6 * refW);
    const fat = Math.round(Math.max(0.8 * refW, kcal * 0.25 / 9));
    const carbs = Math.max(0, Math.round((kcalFood - protein * 4 - fat * 9) / 4));
    const water = Math.round(w * 0.033 * 10) / 10;

    // Прогноз
    const toLose = w - p.goalWeight;
    // Прогноз — діапазоном: від темпу «все за планом» до реалістично повільнішого (70%)
    let forecastWeeks = null, forecastRange = null, forecastWeeksRange = null;
    if (toLose > 0 && weeklyLoss > 0 && !maint) {
      forecastWeeks = Math.ceil(toLose / (weeklyLoss * 0.85));
      const wFast = Math.ceil(toLose / weeklyLoss), wSlow = Math.ceil(toLose / (weeklyLoss * 0.7));
      forecastRange = D.monthRange(D.add(D.iso(), wFast * 7), D.add(D.iso(), wSlow * 7));
      forecastWeeksRange = `${wFast}–${wSlow} тиж.`;
    }
    const goalBmi = bmi(p.goalWeight, p.height);
    if (goalBmi < 18.5) warnings.push({ lvl: 'danger', text: `Бажана вага дає ІМТ ${goalBmi.toFixed(1)} — це нижче норми (18,5). Радимо ціль не нижче ${Math.ceil(18.5 * h2)} кг.` });
    if (toLose > 0 && p.goalWeeks) {
      const need = toLose / p.goalWeeks;
      if (need > w * 0.01) warnings.push({ lvl: 'warn', text: `Щоб скинути ${toLose.toFixed(1)} кг за ${p.goalWeeks} тиж., треба ${need.toFixed(2)} кг/тиж. — це завеликий темп. Реалістично: ~${forecastWeeks} тиж.` });
    }
    if (alcWeek) {
      const share = Math.round(alcWeek / Math.max(1, (tdee - kcal) * 7) * 100);
      warnings.push({ lvl: 'info', text: `Запланований алкоголь: ~${Math.round(alcWeek)} ккал на тиждень (${share}% тижневого дефіциту). Щоб це компенсувати, порції щодня менші на ~${Math.round(alcCut)} ккал.` });
      if (uncovered > 20) warnings.push({ lvl: 'warn', text: `Алкоголю більше, ніж можна безпечно компенсувати їжею: ~${Math.round(uncovered * 7)} ккал на тиждень залишаються зверху, тому схуднення сповільниться.` });
      const heavy = alc.filter(a => a.alc >= 60);
      if (heavy.length) warnings.push({ lvl: 'warn', text: `${heavy.map(a => `${D.DAYS_FULL[a.wd]}: ${a.name.toLowerCase()} ${a.ml} мл ≈ ${Math.round(a.alc)} г спирту`).join('; ')}. Від 60 г чистого спирту за раз ВООЗ вважає надмірним вживанням — краще зменшити об'єм.` });
    }
    if (p.health) {
      if (p.health.pressure) warnings.push({ lvl: 'info', text: 'Підвищений тиск: не затримуйте дихання у вправах (особливо планки), уникайте різкого підйому з підлоги. Інтенсивність кардіо — помірна.' });
      if (p.health.diabetes) warnings.push({ lvl: 'info', text: 'Діабет: погодьте дефіцит калорій і тренування з ендокринологом, контролюйте цукор до і після занять.' });
      if (p.health.thyroid) warnings.push({ lvl: 'info', text: 'Щитовидна залоза: при нестабільних гормонах вага може йти повільніше — це нормально. Регулярно контролюйте аналізи.' });
      if (p.health.stomach) warnings.push({ lvl: 'info', text: 'Проблеми зі шлунком: їжте регулярно, готуйте на пару чи запікайте; квашену капусту й бобові вводьте обережно.' });
    }
    return { w, bmr: Math.round(b), act, tdee: Math.round(tdee), kcal, kcalFood, alcWeek, alcCut, deficit: Math.round(deficit), weeklyLoss, protein, fat, carbs, water,
      steps: stepGoal(p), maint, waistGoal: Math.round(p.height * 0.5), bmi: curBmi, goalBmi, toLose, forecastWeeks, forecastRange, forecastWeeksRange, warnings, adj };
  }

  // Кожні 14 днів коригуємо калорії за фактичною динамікою ваги
  function reviewAdjustments() {
    const st = Store.state;
    if (!st.startDate || inMaintenance()) return [];
    const today = D.iso();
    const checkpoint = Math.floor(D.diff(today, st.startDate) / 14);
    const notes = [];
    st.profiles.forEach(p => {
      const a = st.adjust[p.id] || (st.adjust[p.id] = { kcal: 0, checks: 0, notes: [] });
      if (checkpoint <= a.checks) return;
      a.checks = checkpoint;
      const now = avgWeight(p.id, today);
      const before = avgWeight(p.id, D.add(today, -14)) || (D.diff(today, st.startDate) <= 21 ? p.weight : null);
      const recent = (st.logs.weights[p.id] || []).filter(x => D.diff(today, x.date) < 7).length;
      if (!now || !before || recent < 2) return;
      const ratePerWeek = (before - now) / 2;
      const pct = ratePerWeek / now;
      let delta = 0, reason = '';
      if (pct < 0.0025 && now > p.goalWeight) { delta = -100; reason = `вага йде повільно (${ratePerWeek.toFixed(2)} кг/тиж.)`; }
      else if (pct > 0.012) { delta = 100; reason = `вага йде надто швидко (${ratePerWeek.toFixed(2)} кг/тиж.)`; }
      if (delta) {
        a.kcal = Math.max(-400, Math.min(300, a.kcal + delta));
        const note = { date: today, delta, text: `${p.name}: ${delta > 0 ? '+' : ''}${delta} ккал — ${reason}.` };
        a.notes.push(note);
        notes.push(note);
      }
    });
    Store.save();
    return notes;
  }

  return { inMaintenance, bmi, bmr, activity, targets, currentWeight, avgWeight, reviewAdjustments, STEP_GOAL };
})();
