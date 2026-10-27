// Простий лінійний графік на SVG
const Chart = (() => {
  function line(series, opts = {}) {
    // series: [{points:[{date, v}], cls}] ; opts: {goal, unit}
    const all = series.flatMap(s => s.points);
    if (all.length < 1) return '<div class="empty">Ще немає даних. Додайте перший запис.</div>';
    const W = 640, H = opts.height || 220, pl = 44, pr = 16, pt = 14, pb = 28;
    const dates = all.map(p => p.date).sort();
    let d0 = dates[0], d1 = dates[dates.length - 1];
    if (d0 === d1) { d0 = D.add(d0, -3); d1 = D.add(d1, 3); }
    const vals = all.map(p => p.v).concat(opts.goal ? [opts.goal] : []);
    let lo = Math.min(...vals), hi = Math.max(...vals);
    const padv = Math.max(0.5, (hi - lo) * 0.12);
    lo -= padv; hi += padv;
    const span = D.diff(d1, d0) || 1;
    const x = d => pl + (D.diff(d, d0) / span) * (W - pl - pr);
    const y = v => pt + (1 - (v - lo) / (hi - lo)) * (H - pt - pb);
    let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">`;
    // сітка
    for (let i = 0; i <= 4; i++) {
      const v = lo + (hi - lo) * i / 4, yy = y(v);
      s += `<line x1="${pl}" x2="${W - pr}" y1="${yy}" y2="${yy}" class="grid"/><text x="${pl - 6}" y="${yy + 4}" class="axis" text-anchor="end">${v.toFixed(hi - lo < 6 ? 1 : 0)}</text>`;
    }
    const ticks = Math.min(6, span + 1);
    for (let i = 0; i < ticks; i++) {
      const d = D.add(d0, Math.round(span * i / Math.max(1, ticks - 1)));
      s += `<text x="${x(d)}" y="${H - 8}" class="axis" text-anchor="middle">${D.fmt(d, { day: 'numeric', month: 'short' })}</text>`;
    }
    if (opts.goal) s += `<line x1="${pl}" x2="${W - pr}" y1="${y(opts.goal)}" y2="${y(opts.goal)}" class="goal"/><text x="${W - pr}" y="${y(opts.goal) - 5}" class="axis goal-t" text-anchor="end">ціль${opts.goalLabel ? " (" + opts.goalLabel + ")" : ""} ${opts.goal}</text>`;
    series.forEach(sr => {
      const pts = sr.points.slice().sort((a, b) => a.date.localeCompare(b.date));
      if (pts.length > 1) s += `<polyline points="${pts.map(p => `${x(p.date)},${y(p.v)}`).join(' ')}" class="ln ${sr.cls || ''}"/>`;
      if (sr.dots !== false) pts.forEach(p => s += `<circle cx="${x(p.date)}" cy="${y(p.v)}" r="3.5" class="dot ${sr.cls || ''}"><title>${D.fmt(p.date)}: ${p.v} ${opts.unit || ''}</title></circle>`);
    });
    return s + '</svg>';
  }

  // Ковзне середнє за 7 днів
  function rolling(points) {
    const pts = points.slice().sort((a, b) => a.date.localeCompare(b.date));
    return pts.map(p => {
      const win = pts.filter(q => q.date <= p.date && D.diff(p.date, q.date) < 7);
      return { date: p.date, v: Math.round(win.reduce((s, q) => s + q.v, 0) / win.length * 10) / 10 };
    });
  }

  return { line, rolling };
})();
