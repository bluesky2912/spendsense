/* ============================================================
   utils.js — SpendSense Premium AI
   Pure helpers: formatting, date math, aggregations,
   auto-detect, anomaly, XSS safety.
   ============================================================ */

/* ── Formatting ── */
function fmt(n) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

function fmtShort(n) {
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
  if (n >= 1000)   return '₹' + (n / 1000).toFixed(1) + 'k';
  return fmt(n);
}

/* ── Dates ── */
function parseDate(dateStr) {
  return new Date(dateStr + 'T12:00:00');
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(mk) {
  const [y, m] = mk.split('-');
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

/* ── Aggregations ── */
function getMonthlyTotal(arr, date) {
  const d = date || new Date();
  const y = d.getFullYear(), m = d.getMonth();
  return arr
    .filter(e => { const dd = parseDate(e.date); return dd.getFullYear() === y && dd.getMonth() === m; })
    .reduce((s, e) => s + e.amount, 0);
}

function getWeeklyTotal(arr) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 6);
  cutoff.setHours(0, 0, 0, 0);
  return arr.filter(e => parseDate(e.date) >= cutoff).reduce((s, e) => s + e.amount, 0);
}

function getTodayTotal(arr) {
  return arr.filter(e => e.date === todayStr()).reduce((s, e) => s + e.amount, 0);
}

function getTopCategory(arr) {
  if (!arr.length) return null;
  const cats = {};
  arr.forEach(e => { cats[e.category] = (cats[e.category] || 0) + e.amount; });
  return Object.entries(cats).sort((a, b) => b[1] - a[1])[0] || null;
}

function getCategoryBreakdown(arr) {
  const cats = {};
  arr.forEach(e => { cats[e.category] = (cats[e.category] || 0) + e.amount; });
  return cats;
}

function getDailyLast7(arr) {
  const daily = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    daily[dateKey(d)] = 0;
  }
  arr.forEach(e => { if (e.date in daily) daily[e.date] += e.amount; });
  return Object.entries(daily).map(([date, total]) => ({
    label: parseDate(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
    total,
    date,
  }));
}

function getLast30Days(arr) {
  const daily = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    daily[dateKey(d)] = 0;
  }
  arr.forEach(e => { if (e.date in daily) daily[e.date] += e.amount; });
  return Object.entries(daily).map(([date, total]) => ({ date, total }));
}

function getWeekendVsWeekday(arr) {
  let wendTotal = 0, wendCount = 0, wdayTotal = 0, wdayCount = 0;
  arr.forEach(e => {
    const dow = parseDate(e.date).getDay();
    if (dow === 0 || dow === 6) { wendTotal += e.amount; wendCount++; }
    else                        { wdayTotal += e.amount; wdayCount++; }
  });
  return {
    wendAvg:    wendCount ? wendTotal / wendCount : 0,
    wdayAvg:    wdayCount ? wdayTotal / wdayCount : 0,
    hasWeekend: wendCount > 0,
    hasWeekday: wdayCount > 0,
  };
}

function getSpendingStreak(arr) {
  if (!arr.length) return 0;
  const dates = new Set(arr.map(e => e.date));
  let streak = 0;
  const cur = new Date();
  for (let i = 0; i < 365; i++) {
    const key = dateKey(cur);
    if (dates.has(key)) { streak++; }
    else if (i === 0)   { break; }
    else                { break; }
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}

function getNoSpendStreak(arr) {
  const dates = new Set(arr.map(e => e.date));
  let streak = 0;
  const cur = new Date();
  for (let i = 0; i < 30; i++) {
    const k = dateKey(cur);
    if (!dates.has(k)) {
      if (i === 0) { cur.setDate(cur.getDate() - 1); continue; } // skip today if no data yet
      streak++;
    } else if (streak > 0) {
      break;
    }
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}

function getMaxExpense(arr) {
  return arr.reduce((max, e) => (!max || e.amount > max.amount) ? e : max, null);
}

function getAvgDailySpend(arr) {
  if (!arr.length) return 0;
  const dates = new Set(arr.map(e => e.date));
  return arr.reduce((s, e) => s + e.amount, 0) / dates.size;
}

/* ── Anomaly detection ── */
function getAnomalyExpense(arr) {
  if (arr.length < 5) return null;
  const avg = arr.reduce((s, e) => s + e.amount, 0) / arr.length;
  const std = Math.sqrt(arr.reduce((s, e) => s + (e.amount - avg) ** 2, 0) / arr.length);
  const recent = arr[arr.length - 1];
  if (recent && recent.amount > avg + 2.5 * std) {
    return { expense: recent, avg, multiplier: Math.round(recent.amount / avg) };
  }
  return null;
}

/* ── Smart category auto-detect ── */
function detectCategory(name) {
  const n = name.toLowerCase();
  for (const [cat, kws] of Object.entries(CAT_KEYWORDS)) {
    if (kws.some(k => n.includes(k))) return cat;
  }
  return null;
}

/* ── XSS safety ── */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#039;');
}
