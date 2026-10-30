import { CONFIG, BETS, COUNTRIES, OPERATORS } from './config.js';

export const fresh = () => ({
  v: 1,
  balance: CONFIG.START_BALANCE,
  luck: CONFIG.START_LUCK,
  level: 1,
  xp: 0,
  collection: [],
  pending: null, // выпавший, но ещё не сохранённый номер (продастся при следующей крутке)
  multi: 1,
  autoKeep: 0,
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
      delete s.uiScale; // раньше был выбор размера интерфейса, теперь размер один
      s.stats = { ...fresh().stats, ...s.stats };
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
