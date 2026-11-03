import { CONFIG, AUTO_SELL, BETS, COUNTRIES, OPERATORS } from './config.js?v=mw0ptf7h';

export const fresh = () => ({
  v: 1,
  balance: CONFIG.START_BALANCE,
  luck: CONFIG.START_LUCK, // готовые заряды Удачи (каждый делает одну крутку x2)
  luckSpins: 0,            // крутки до следующего заряда x2 (0–99)
  luck20: 0,               // готовые большие заряды (одна крутка «лучший из 20»)
  luck20Spins: 0,          // крутки до большого заряда (0–499)
  found: {},               // открытые города по операторам: { mgs: ['Москва', …] }
  level: 1,
  xp: 0,
  collection: [],
  pending: null, // выпавший номер: уйдёт в коллекцию при следующей крутке, пока его не продали
  multi: 1,
  autoSell: 0,   // индекс в AUTO_SELL
  bet: 0,        // индекс в BETS: 0 — обычная крутка
  country: 'ru',
  operator: null, // id оператора из OPERATORS или null — «любой» (случайный, без бонуса)
  digit: null,    // любимая цифра 0–9 или null
  stats: { spins: 0, crafts: 0 },
  lastDaily: 0,
  ref: null,
});

// Приводит сохранение к рабочему виду: недостающие поля, неверные значения. Нужна и клиенту, и серверу.
export function sanitize(raw) {
  const s = { ...fresh(), ...raw };
  if (!BETS[s.bet]) s.bet = 0;
  delete s.autoKeep;
  if (!AUTO_SELL[s.autoSell]) s.autoSell = 0;
  delete s.uiScale; // раньше был выбор размера интерфейса, теперь размер один
  s.stats = { ...fresh().stats, ...s.stats };
  if (!Number.isInteger(s.luck) || s.luck < 0) s.luck = 0;
  if (!Number.isInteger(s.luckSpins) || s.luckSpins < 0) s.luckSpins = 0;
  for (const k of ['luck20', 'luck20Spins']) if (!Number.isInteger(s[k]) || s[k] < 0) s[k] = 0;
  if (!s.found || typeof s.found !== 'object' || Array.isArray(s.found)) s.found = {};
  if (s.operator && !OPERATORS.some((o) => o.id === s.operator)) s.operator = null;
  if (!Number.isInteger(s.digit) || s.digit < 0 || s.digit > 9) s.digit = null;
  if (!CONFIG.MULTI_OPTIONS.includes(s.multi)) s.multi = 1;
  if (!COUNTRIES.some((c) => c.id === s.country && c.ready)) s.country = 'ru';
  return s;
}

// Настройки, которые игрок меняет сам. Сервер принимает только их и только после проверки.
export const SETTING_KEYS = ['multi', 'bet', 'operator', 'digit', 'autoSell', 'country'];
export const pickSettings = (s) => Object.fromEntries(SETTING_KEYS.map((k) => [k, s[k]]));
export function applySettings(s, incoming) {
  if (!incoming || typeof incoming !== 'object') return s;
  const merged = sanitize({ ...s, ...Object.fromEntries(SETTING_KEYS.filter((k) => k in incoming).map((k) => [k, incoming[k]])) });
  for (const k of SETTING_KEYS) s[k] = merged[k];
  return s;
}

// Без сервера всё хранится в localStorage (локальный режим для разработки).
export function load() {
  try {
    const raw = localStorage.getItem(CONFIG.SAVE_KEY);
    if (raw) return sanitize(JSON.parse(raw));
  } catch { /* повреждённое сохранение: начинаем заново */ }
  return fresh();
}

export function save(s) {
  try { localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(s)); } catch { /* хранилище недоступно */ }
}
