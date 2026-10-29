import { CONFIG, TIERS, CODES, OPERATORS } from './config.js';

const rand = (a, b) => a + Math.random() * (b - a);
const dig = () => Math.floor(Math.random() * 10);
const digits = (n) => Array.from({ length: n }, dig).join('');
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const other = (a) => (a + 1 + Math.floor(Math.random() * 9)) % 10;

function pickWeighted(list) {
  let r = Math.random() * list.reduce((s, x) => s + x.w, 0);
  for (const x of list) if ((r -= x.w) < 0) return x;
  return list[list.length - 1];
}

const same = (s) => s.split('').every((c) => c === s[0]);
const isPal = (s) => s === s.split('').reverse().join('');
const isRun = (s) => {
  const d = s.split('').map(Number);
  const step = d[1] - d[0];
  return Math.abs(step) === 1 && d.every((x, i) => i === 0 || x - d[i - 1] === step);
};

// «Серии»: берётся самая дорогая из подходящих. b — 7 цифр номера без кода.
export const SERIES = [
  { name: 'Идеал', mult: 500, test: (b) => same(b) },
  { name: 'Зеркало', mult: 60, test: (b) => isPal(b) },
  { name: 'Нулевой хвост', mult: 40, test: (b) => b.endsWith('0000') },
  { name: 'Четвёрка', mult: 25, test: (b) => same(b.slice(-4)) },
  { name: 'Лесенка', mult: 25, test: (b) => isRun(b.slice(-4)) },
  { name: 'Три нуля', mult: 15, test: (b) => b.endsWith('000') },
  { name: 'Пара-пара', mult: 12, test: (b) => { const t = b.slice(-4); return t[0] === t[2] && t[1] === t[3] && t[0] !== t[1]; } },
  { name: 'Полузеркало', mult: 12, test: (b) => isPal(b.slice(1)) },
  { name: 'Дубль-дубль', mult: 8, test: (b) => { const t = b.slice(-4); return t[0] === t[1] && t[2] === t[3] && t[0] !== t[2]; } },
  { name: 'Тройка', mult: 8, test: (b) => same(b.slice(-3)) },
  { name: 'Круглый', mult: 5, test: (b) => b.endsWith('00') },
  { name: 'Три подряд', mult: 3, test: (b) => /(\d)\1\1/.test(b) },
];

export function detectSeries(body) {
  let best = null;
  for (const s of SERIES) if (s.test(body) && (!best || s.mult > best.mult)) best = s;
  return best && { name: best.name, mult: best.mult };
}

// Намеренно красивые хвосты, чтобы редкие номера выпадали чаще, чем при чистой случайности
const BUILDERS = [
  () => { const a = dig(), b = other(a); return digits(3) + `${a}${b}${a}${b}`; },
  () => { const a = dig(), b = other(a); return digits(3) + `${a}${a}${b}${b}`; },
  () => { const a = dig(); return digits(4) + `${a}${a}${a}`; },
  () => digits(5) + '00',
  () => { const a = dig(); return digits(3) + `${a}${a}${a}${a}`; },
  () => {
    const up = Math.random() < 0.5;
    const start = up ? Math.floor(Math.random() * 7) : 3 + Math.floor(Math.random() * 7);
    return digits(3) + [0, 1, 2, 3].map((i) => start + (up ? i : -i)).join('');
  },
];

export const tierOf = (price) => {
  let t = 0;
  TIERS.forEach((x, i) => { if (price >= x.min) t = i; });
  return t;
};

export function roll() {
  const region = pickWeighted(CODES);
  const op = pick(OPERATORS);
  const body = Math.random() < CONFIG.PATTERN_BOOST ? pick(BUILDERS)() : digits(7);
  const series = detectSeries(body);
  const base = Math.round(rand(CONFIG.BASE_MIN, CONFIG.BASE_MAX));
  const price = Math.max(5, Math.round((base * region.mult * (series ? series.mult : 1)) / 5) * 5);
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    op: op.id, code: region.code, city: region.city, body,
    base, regionMult: region.mult, series, price, tier: tierOf(price), lucky: false,
  };
}

export const formatPhone = (it) => `+7 ${it.code} ${it.body.slice(0, 3)}-${it.body.slice(3, 5)}-${it.body.slice(5)}`;
export const formatMoney = (n) => `${Math.round(n).toLocaleString('ru-RU')} ₽`;
export const formatMult = (m) => String(m).replace('.', ',');
