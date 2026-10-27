// Зберігання: основні дані — localStorage, фото — IndexedDB (з запасним варіантом у localStorage).
const Store = (() => {
  const KEY = 'fitduo:v1';
  let state = null;

  function defaults() {
    return {
      version: 1,
      profiles: [],          // [{id, name, sex, age, height, weight, ...}]
      family: null,          // {exclude:[], meals, budget, batch}
      startDate: null,       // понеділок першого тижня, 'YYYY-MM-DD'
      active: 0,
      logs: { weights: {}, measures: {}, check: {}, meals: {}, workouts: {}, custom: {}, drinks: {} },
      customFoods: [],   // свої страви й продукти для калькулятора
      plans: {},             // {weekNo: {days:[[rid,...],...]}}
      shopping: {},          // {weekNo: {foodId:true}}
      adjust: {},            // {pid: {kcal, checks, notes:[]}}
      settings: { voice: true, sound: true },
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      state = raw ? deepMerge(defaults(), JSON.parse(raw)) : defaults();
    } catch (e) {
      console.error(e);
      state = defaults();
    }
    return state;
  }

  function deepMerge(base, obj) {
    for (const k in obj) {
      if (obj[k] && typeof obj[k] === 'object' && !Array.isArray(obj[k]) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) {
        base[k] = deepMerge(base[k], obj[k]);
      } else base[k] = obj[k];
    }
    return base;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      alert('Не вдалося зберегти дані: ' + e.message);
    }
  }

  function reset() {
    localStorage.removeItem(KEY);
    state = defaults();
  }

  return { load, save, reset, get state() { return state; }, set state(v) { state = v; }, defaults };
})();

const Photos = (() => {
  const DB = 'fitduo-photos', STORE = 'photos', LS = 'fitduo:photos';
  let dbp = null, useLS = false;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise((resolve) => {
      if (!window.indexedDB) { useLS = true; return resolve(null); }
      let req;
      try { req = indexedDB.open(DB, 1); } catch (e) { useLS = true; return resolve(null); }
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => { useLS = true; resolve(null); };
    });
    return dbp;
  }

  function lsAll() { try { return JSON.parse(localStorage.getItem(LS) || '[]'); } catch (e) { return []; } }
  function lsSave(arr) { localStorage.setItem(LS, JSON.stringify(arr)); }

  function tx(db, mode, fn) {
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const r = fn(t.objectStore(STORE));
      t.oncomplete = () => resolve(r && r.result);
      t.onerror = () => reject(t.error);
    });
  }

  // Якщо IndexedDB недоступна (буває для файлів, відкритих напряму), переходимо на localStorage
  async function run(mode, idbFn, lsFn) {
    const db = await open();
    if (!useLS && db) {
      try { return await tx(db, mode, idbFn); } catch (e) { console.warn('IndexedDB недоступна, використовуємо localStorage', e); useLS = true; }
    }
    return lsFn();
  }

  const all = () => run('readonly', s => s.getAll(), () => lsAll());
  const put = rec => run('readwrite', s => s.put(rec), () => {
    const a = lsAll().filter(x => x.id !== rec.id); a.push(rec);
    try { lsSave(a); } catch (e) { throw new Error('Не вистачає місця для фото. Збережіть резервну копію й видаліть старі фото.'); }
  });
  const remove = id => run('readwrite', s => s.delete(id), () => lsSave(lsAll().filter(x => x.id !== id)));
  const clear = () => run('readwrite', s => s.clear(), () => localStorage.removeItem(LS));

  // Стискаємо фото до 1000 px по довшій стороні
  function compress(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const max = 1000, sc = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Не вдалося прочитати фото')); };
      img.src = url;
    });
  }

  return { all, put, remove, clear, compress, get fallback() { return useLS; } };
})();
