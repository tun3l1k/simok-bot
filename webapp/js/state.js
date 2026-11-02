import { CONFIG, AUTO_SELL, BETS, COUNTRIES, OPERATORS } from './config.js?v=mvz1tfmy';

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

// Пока всё хранится в localStorage. Для денег и рынка нужен бэкенд (см. README).
export function load() {
  try {
    const raw = localStorage.getItem(CONFIG.SAVE_KEY);
    if (raw) {
      const s = { ...fresh(), ...JSON.parse(raw) };
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
      if (!COUNTRIES.some((c) => c.id === s.country && c.ready)) s.country = 'ru';
      return s;
    }
  } catch { /* повреждённое сохранение: начинаем заново */ }
  return fresh();
}

export function save(s) {
  try { localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(s)); } catch { /* хранилище недоступно */ }
}
