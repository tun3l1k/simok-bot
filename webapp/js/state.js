import { CONFIG } from './config.js';

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
  stats: { spins: 0 },
  lastDaily: 0,
  ref: null,
});

// Пока всё хранится в localStorage. Для денег и рынка нужен бэкенд (см. README).
export function load() {
  try {
    const raw = localStorage.getItem(CONFIG.SAVE_KEY);
    if (raw) return { ...fresh(), ...JSON.parse(raw) };
  } catch { /* повреждённое сохранение: начинаем заново */ }
  return fresh();
}

export function save(s) {
  try { localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(s)); } catch { /* хранилище недоступно */ }
}
