import { CONFIG, TIERS, DIGIT_BONUS, codesOf } from './config.js?v=mvzrxy89';

const rand = (a, b) => a + Math.random() * (b - a);
const dig = () => Math.floor(Math.random() * 10);
const digits = (n) => Array.from({ length: n }, dig).join('');
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const other = (a) => (a + 1 + Math.floor(Math.random() * 9)) % 10;
const rev = (s) => s.split('').reverse().join('');

function pickWeighted(list, w = (x) => x.w) {
  let r = Math.random() * list.reduce((s, x) => s + w(x), 0);
  for (const x of list) if ((r -= w(x)) < 0) return x;
  return list[list.length - 1];
}

// Выбор по весам с кешем накопленных сумм: в пуле оператора тысячи записей, а круток миллионы
const cumCache = new WeakMap();
function pickPool(list) {
  let c = cumCache.get(list);
  if (!c) { c = []; let t = 0; for (const x of list) { t += x.w; c.push(t); } cumCache.set(list, c); }
  return list[bisect(c, Math.random() * c[c.length - 1])];
}
function bisect(c, r) {
  let lo = 0, hi = c.length - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (c[mid] > r) hi = mid; else lo = mid + 1; }
  return lo;
}

const same = (s) => s.split('').every((c) => c === s[0]);
const isPal = (s) => s === rev(s);
const isRun = (s) => {
  const d = s.split('').map(Number);
  const step = d[1] - d[0];
  return Math.abs(step) === 1 && d.every((x, i) => i === 0 || x - d[i - 1] === step);
};

// Конструкторы 7-значного номера (без кода) под конкретную серию
const mk = {
  ladder: () => {
    const up = Math.random() < 0.5;
    const start = up ? Math.floor(Math.random() * 7) : 3 + Math.floor(Math.random() * 7);
    return digits(3) + [0, 1, 2, 3].map((i) => start + (up ? i : -i)).join('');
  },
  abab: () => { const a = dig(), b = other(a); return digits(3) + `${a}${b}${a}${b}`; },
  aabb: () => { const a = dig(), b = other(a); return digits(3) + `${a}${a}${b}${b}`; },
  tail: (n, c) => () => { const a = c ?? dig(); return digits(7 - n) + String(a).repeat(n); },
  mirror: () => { const h = digits(3); return h + dig() + rev(h); },
  halfMirror: () => { const h = digits(3); return dig() + h + rev(h); },
  triple: (c) => () => {
    const d = digits(7).split('');
    const pos = Math.floor(Math.random() * 5);
    d[pos] = d[pos + 1] = d[pos + 2] = String(c ?? dig());
    return d.join('');
  },
  ladder5: () => {
    const up = Math.random() < 0.5;
    const start = up ? Math.floor(Math.random() * 6) : 4 + Math.floor(Math.random() * 6);
    return digits(2) + [0, 1, 2, 3, 4].map((i) => start + (up ? i : -i)).join('');
  },
};

// «Серии»: берётся самая дорогая из подходящих. b — 7 цифр номера без кода.
// p — частота серии среди обычных круток (измерена в npm run sim; нужна для «1 из N» и ставок с гарантией), make — конструктор номера.
export const SERIES = [
  { name: 'Длинная лесенка', mult: 80, p: 1 / 1430, test: (b) => isRun(b.slice(-5)), make: mk.ladder5 },
  { name: 'Идеал', mult: 500, p: 1 / 130000, test: (b) => same(b), make: () => String(dig()).repeat(7) },
  { name: 'Зеркало', mult: 60, p: 1 / 1030, test: (b) => isPal(b), make: mk.mirror },
  { name: 'Нулевой хвост', mult: 40, p: 1 / 1080, test: (b) => b.endsWith('0000'), make: mk.tail(4, 0) },
  { name: 'Четвёрка', mult: 25, p: 1 / 135, test: (b) => same(b.slice(-4)), make: mk.tail(4) },
  { name: 'Лесенка', mult: 25, p: 1 / 137, test: (b) => isRun(b.slice(-4)), make: mk.ladder },
  { name: 'Три нуля', mult: 15, p: 1 / 487, test: (b) => b.endsWith('000'), make: mk.tail(3, 0) },
  { name: 'Пара-пара', mult: 12, p: 1 / 66, test: (b) => { const t = b.slice(-4); return t[0] === t[2] && t[1] === t[3] && t[0] !== t[1]; }, make: mk.abab },
  { name: 'Полузеркало', mult: 12, p: 1 / 990, test: (b) => isPal(b.slice(1)), make: mk.halfMirror },
  { name: 'Дубль-дубль', mult: 8, p: 1 / 65, test: (b) => { const t = b.slice(-4); return t[0] === t[1] && t[2] === t[3] && t[0] !== t[2]; }, make: mk.aabb },
  { name: 'Тройка', mult: 8, p: 1 / 85, test: (b) => same(b.slice(-3)), make: mk.tail(3) },
  { name: 'Круглый', mult: 5, p: 1 / 76, test: (b) => b.endsWith('00'), make: mk.tail(2, 0) },
  { name: 'Три семёрки', mult: 20, p: 1 / 201, test: (b) => b.includes('777'), make: mk.triple(7) },
  { name: 'Три подряд', mult: 3, p: 1 / 34, test: (b) => /(\d)\1\1/.test(b), make: mk.triple() },
];

export function detectSeries(body) {
  let best = null;
  for (const s of SERIES) if (s.test(body) && (!best || s.mult > best.mult)) best = s;
  return best && { name: best.name, mult: best.mult };
}

// Намеренно красивые хвосты, чтобы редкие номера выпадали чаще, чем при чистой случайности
const BUILDERS = [mk.abab, mk.aabb, mk.tail(3), () => digits(5) + '00', mk.tail(4), mk.ladder];

// «1 из N» для серии: берём частоту из таблицы SERIES
export const oddsOf = (series) => {
  const s = series && SERIES.find((x) => x.name === series.name);
  return s ? Math.round(1 / s.p) : null;
};

// Бонус любимой цифры: считаем её вхождения в 7 цифр номера
export function digitBonus(body, digit) {
  if (digit === null || digit === undefined) return null;
  const count = body.split('').filter((c) => c === String(digit)).length;
  const b = DIGIT_BONUS.find((x) => count >= x.min);
  return b ? { digit, count, mult: b.mult } : null;
}

export const tierOf = (price) => {
  let t = 0;
  TIERS.forEach((x, i) => { if (price >= x.min) t = i; });
  return t;
};

const priceOf = (base, region, series, dig) =>
  Math.max(5, Math.round((base * region.mult * (series ? series.mult : 1) * (dig ? dig.mult : 1)) / 5) * 5);

// opts: { op, digit } — оператор тарифа и любимая цифра игрока
function makeItem(region, body, base, opts = {}) {
  const series = detectSeries(body);
  const dig = digitBonus(body, opts.digit);
  const price = priceOf(base, region, series, dig);
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    op: region.op, code: region.code, city: region.city, body,
    base, regionMult: region.mult, series, odds: oddsOf(series), digit: dig,
    price, tier: tierOf(price), lucky: false,
  };
}

const rollBase = () => Math.round(rand(CONFIG.BASE_MIN, CONFIG.BASE_MAX));
export function roll(opts = {}) {
  const region = pickPool(codesOf(opts.op));
  const body = Math.random() < CONFIG.PATTERN_BOOST ? pick(BUILDERS)() : digits(7);
  return makeItem(region, body, rollBase(), opts);
}

// Вес каждой серии среди номеров нужной редкости: частота серии × шанс, что база и код региона
// вообще дотянут до цены. Так распределение совпадает с честным «крутить, пока не выпадет», но быстро.
const tierWeights = {};
const rollCache = new Map();
function seriesWeights(minTier, codes, key) {
  const k = `${minTier}:${key}`;
  if (tierWeights[k]) return tierWeights[k];
  const need = TIERS[minTier].min;
  const span = CONFIG.BASE_MAX - CONFIG.BASE_MIN + 1;
  const totalW = codes.reduce((s, r) => s + r.w, 0);
  return (tierWeights[k] = SERIES.map((s) => {
    let reach = 0;
    for (const r of codes) {
      const lo = Math.max(CONFIG.BASE_MIN, Math.ceil(need / (r.mult * s.mult) - 1e-9));
      const n = Math.max(0, CONFIG.BASE_MAX - lo + 1);
      reach += (r.w / totalW) * (n / span);
    }
    return { s, w: s.p * reach };
  }).filter((x) => x.w > 0));
}

// Ставка с гарантией: номер не ниже редкости minTier.
export function rollMin(minTier, opts = {}) {
  if (!minTier) return roll(opts);
  const need = TIERS[minTier].min;
  const pool = codesOf(opts.op);
  const { s } = pickWeighted(seriesWeights(minTier, pool, opts.op ?? 'any'));
  // Только регионы, которым хватает множителя, с весом «шанс региона × доля баз, которые дотягивают»
  const span = CONFIG.BASE_MAX - CONFIG.BASE_MIN + 1;
  const minBase = (r) => Math.max(CONFIG.BASE_MIN, Math.ceil(need / (r.mult * s.mult)) - 1);
  const ck = `${minTier}:${opts.op ?? 'any'}:${s.name}`;
  let cand = rollCache.get(ck);
  if (!cand) {
    const ok = pool.filter((r) => CONFIG.BASE_MAX * r.mult * s.mult >= need)
      .map((r) => ({ ...r, w: r.w * ((CONFIG.BASE_MAX - minBase(r) + 1) / span) }));
    rollCache.set(ck, cand = ok);
  }
  for (let i = 0; i < 50 && cand.length; i++) {
    const region = pickPool(cand);
    const lo = minBase(region);
    const base = lo + Math.floor(Math.random() * (CONFIG.BASE_MAX - lo + 1));
    const item = makeItem(region, s.make(), base, opts);
    if (item.price >= need) return item;
  }
  throw new Error(`Не удалось собрать номер редкости ${minTier}`);
}

export const formatPhone = (it) => `+7 ${it.code} ${it.body.slice(0, 3)}-${it.body.slice(3, 5)}-${it.body.slice(5)}`;
export const formatMoney = (n) => `${Math.round(n).toLocaleString('ru-RU')}\u00A0₽`;
export const formatMult = (m) => String(m).replace('.', ',');
