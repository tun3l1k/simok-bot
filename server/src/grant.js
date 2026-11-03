// Что админ может выдать игроку. Все изменения идут тем же кодом игры, что и у самих игроков.
import * as game from './shared/game.js';
import { rollMin } from './shared/generator.js';
import { OPERATORS, TIERS } from './shared/config.js';

export const MAX_COINS = 1_000_000_000;
export const operators = () => OPERATORS.map((o) => ({ id: o.id, name: o.name }));
export const tiers = () => TIERS.map((t, i) => ({ id: i, name: t.name }));

export function giveCoins(s, amount) {
  const n = Math.trunc(Number(amount));
  if (!Number.isFinite(n) || n === 0 || Math.abs(n) > MAX_COINS) throw new Error('Сумма должна быть числом, не больше миллиарда');
  s.balance = Math.max(0, s.balance + n);
  return { text: `${n > 0 ? '+' : '−'}${Math.abs(n).toLocaleString('ru-RU')} ₽` };
}

// SIM не ниже заданной редкости, у нужного оператора (или любого). Если коллекция полна, самый дешёвый номер продастся сам.
export function giveSim(s, tier, opId) {
  if (!TIERS[tier]) throw new Error('Нет такой редкости');
  if (opId && !OPERATORS.some((o) => o.id === opId)) throw new Error('Нет такого оператора');
  const item = rollMin(tier, { op: opId || undefined });
  const sold = game.addToCollection(s, item);
  return { item, sold };
}

export function giveLuck(s, kind) {
  if (kind === 'x20') { s.luck20++; return { text: 'заряд Удачи x20' }; }
  s.luck++;
  return { text: 'заряд Удачи x2' };
}
