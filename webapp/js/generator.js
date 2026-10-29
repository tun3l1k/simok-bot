import { CONFIG, TIERS, CODES, OPERATORS } from './config.js';

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
  triple: () => {
    const d = digits(7).split('');
    const pos = Math.floor(Math.random() * 5);
    d[pos] = d[pos + 1] = d[pos + 2] = String(dig());
    return d.join('');
  },
};

// «Серии»: берётся самая дорогая из подходящих. b — 7 цифр номера без кода.
// p — примерная частота при чистой случайности (нужна ставкам с гарантией редкости), make — конструктор номера.
export const SERIES = [
  { name: 'Идеал', mult: 500, p: 1 / 60000, test: (b) => same(b), make: () => String(dig()).repeat(7) },
  { name: 'Зеркало', mult: 60, p: 1 / 1000, test: (b) => isPal(b), make: mk.mirror },
  { name: 'Нулевой хвост', mult: 40, p: 1 / 1000, test: (b) => b.endsWith('0000'), make: mk.tail(4, 0) },
  { name: 'Четвёрка', mult: 25, p: 1 / 140, test: (b) => same(b.slice(-4)), make: mk.tail(4) },
  { name: 'Лесенка', mult: 25, p: 1 / 130, test: (b) => isRun(b.slice(-4)), make: mk.ladder },
  { name: 'Три нуля', mult: 15, p: 1 / 470, test: (b) => b.endsWith('000'), make: mk.tail(3, 0) },
  { name: 'Пара-пара', mult: 12, p: 1 / 66, test: (b) => { const t = b.slice(-4); return t[0] === t[2] && t[1] === t[3] && t[0] !== t[1]; }, make: mk.abab },
  { name: 'Полузеркало', mult: 12, p: 1 / 1000, test: (b) => isPal(b.slice(1)), make: mk.halfMirror },
  { name: 'Дубль-дубль', mult: 8, p: 1 / 63, test: (b) => { const t = b.slice(-4); return t[0] === t[1] && t[2] === t[3] && t[0] !== t[2]; }, make: mk.aabb },
  { name: 'Тройка', mult: 8, p: 1 / 75, test: (b) => same(b.slice(-3)), make: mk.tail(3) },
  { name: 'Круглый', mult: 5, p: 1 / 75, test: (b) => b.endsWith('00'), make: mk.tail(2, 0) },
  { name: 'Три подряд', mult: 3, p: 1 / 30, test: (b) => /(\d)\1\1/.test(b), make: mk.triple },
];

export function detectSeries(body) {
  let best = null;
  for (const s of SERIES) if (s.test(body) && (!best || s.mult > best.mult)) best = s;
  return best && { name: best.name, mult: best.mult };
}

// Намеренно красивые хвосты, чтобы редкие номера выпадали чаще, чем при чистой случайности
const BUILDERS = [mk.abab, mk.aabb, mk.tail(3), () => digits(5) + '00', mk.tail(4), mk.ladder];

export const tierOf = (price) => {
  let t = 0;
  TIERS.forEach((x, i) => { if (price >= x.min) t = i; });
  return t;
};

const priceOf = (base, region, series) =>
  Math.max(5, Math.round((base * region.mult * (series ? series.mult : 1)) / 5) * 5);

function makeItem(region, body, base) {
  const series = detectSeries(body);
  const price = priceOf(base, region, series);
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    op: pick(OPERATORS).id, code: region.code, city: region.city, body,
    base, regionMult: region.mult, series, price, tier: tierOf(price), lucky: false,
  };
}

const rollBase = () => Math.round(rand(CONFIG.BASE_MIN, CONFIG.BASE_MAX));

export function roll() {
  const region = pickWeighted(CODES);
  const body = Math.random() < CONFIG.PATTERN_BOOST ? pick(BUILDERS)() : digits(7);
  return makeItem(region, body, rollBase());
}

// Вес каждой серии среди номеров нужной редкости: частота серии × шанс, что база и код региона
// вообще дотянут до цены. Так распределение совпадает с честным «крутить, пока не выпадет», но быстро.
const tierWeights = {};
function seriesWeights(minTier) {
  if (tierWeights[minTier]) return tierWeights[minTier];
  const need = TIERS[minTier].min;
  const span = CONFIG.BASE_MAX - CONFIG.BASE_MIN + 1;
  const totalW = CODES.reduce((s, r) => s + r.w, 0);
  return (tierWeights[minTier] = SERIES.map((s) => {
    let reach = 0;
    for (const r of CODES) {
      let n = 0;
      for (let b = CONFIG.BASE_MIN; b <= CONFIG.BASE_MAX; b++) if (b * r.mult * s.mult >= need) n++;
      reach += (r.w / totalW) * (n / span);
    }
    return { s, w: s.p * reach };
  }).filter((x) => x.w > 0));
}

// Ставка с гарантией: номер не ниже редкости minTier.
export function rollMin(minTier) {
  if (!minTier) return roll();
  const need = TIERS[minTier].min;
  const { s } = pickWeighted(seriesWeights(minTier));
  for (let i = 0; i < 5000; i++) {
    const region = pickWeighted(CODES);
    const base = rollBase();
    if (base * region.mult * s.mult < need) continue;
    const item = makeItem(region, s.make(), base);
    if (item.price >= need) return item;
  }
  throw new Error(`Не удалось собрать номер редкости ${minTier}`);
}

export const formatPhone = (it) => `+7 ${it.code} ${it.body.slice(0, 3)}-${it.body.slice(3, 5)}-${it.body.slice(5)}`;
export const formatMoney = (n) => `${Math.round(n).toLocaleString('ru-RU')}\u00A0₽`;
export const formatMult = (m) => String(m).replace('.', ',');
