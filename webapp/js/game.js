import { CONFIG, AUTO_SELL, BETS, OPERATORS, CRAFT, xpForLevel, levelReward } from './config.js?v=mvx1y7yd';
import { roll, rollMin } from './generator.js?v=mvx1y7yd';

export const currentBet = (s) => BETS[s.bet] ?? BETS[0];
export const spinCost = (s, count = s.multi) => currentBet(s).cost * count;

export const operatorOf = (s) => OPERATORS.find((o) => o.id === s.operator) ?? null;
export const luckBestOf = () => CONFIG.LUCK_BEST_OF;
// Сколько круток осталось до следующего заряда Удачи
export const luckLeft = (s) => CONFIG.LUCK_EVERY - (s.luckSpins % CONFIG.LUCK_EVERY);
// Параметры генерации номера из настроек игрока: оператор тарифа и любимая цифра
export const rollOpts = (s) => ({ op: s.operator ?? undefined, digit: s.digit ?? undefined });

export const collectionValue = (s) => s.collection.reduce((a, x) => a + x.price, 0);

export function claimDaily(s, now = Date.now()) {
  const d = CONFIG.DAILY_BONUS;
  if (now - s.lastDaily < d.cooldownH * 3600e3) return null;
  s.lastDaily = now;
  s.balance += d.balance;
  return d;
}

// Положить номер в коллекцию. Если она переполнена (CONFIG.COLLECTION_MAX), самый дешёвый номер продаётся сам.
export function addToCollection(s, item) {
  s.collection.unshift(item);
  const sold = [];
  while (s.collection.length > CONFIG.COLLECTION_MAX) {
    let k = 0;
    s.collection.forEach((x, i) => { if (x.price < s.collection[k].price) k = i; });
    const [it] = s.collection.splice(k, 1);
    s.balance += it.price;
    sold.push(it);
  }
  return sold;
}

// Если денег нет, а продавать нечего, игра не должна встать
export function bailout(s) {
  if (s.balance >= CONFIG.SPIN_COST || s.collection.length || s.pending) return false;
  s.balance += CONFIG.BAILOUT;
  return true;
}

// Удача работает только на обычной крутке, ставка с гарантией её не тратит
function rollOne(s) {
  const bet = currentBet(s);
  return bet.tier ? rollMin(bet.tier, rollOpts(s)) : rollWithLuck(s);
}

function rollWithLuck(s) {
  if (s.luck <= 0) return roll(rollOpts(s));
  s.luck--;
  let best = null;
  for (let i = 0; i < luckBestOf(s); i++) {
    const it = roll(rollOpts(s));
    if (!best || it.price > best.price) best = it;
  }
  best.lucky = true;
  return best;
}

export function spin(s, count) {
  const cost = spinCost(s, count);
  if (s.balance < cost) {
    return { error: s.bet ? 'Не хватает денег на эту ставку. Выбери ставку дешевле или продай номер.' : 'Не хватает денег. Продай что-нибудь из коллекции.' };
  }

  s.balance -= cost;
  // прошлый номер, который игрок не продал, уходит в коллекцию сам
  const moved = s.pending;
  const overflow = moved ? addToCollection(s, moved) : [];
  s.pending = null;

  let best = null, autoSold = 0, luckUsed = 0;
  for (let i = 0; i < count; i++) {
    const it = rollOne(s);
    if (it.lucky) luckUsed++;
    if (!best) { best = it; continue; }
    const [keep, drop] = it.price > best.price ? [it, best] : [best, it];
    best = keep;
    autoSold += drop.price;
    s.balance += drop.price;
  }

  const soldNow = best.tier <= AUTO_SELL[s.autoSell].maxTier;
  if (soldNow) s.balance += best.price; else s.pending = best;

  s.stats.spins += count;
  s.luckSpins += count;
  let luckEarned = 0;
  while (s.luckSpins >= CONFIG.LUCK_EVERY) { s.luckSpins -= CONFIG.LUCK_EVERY; s.luck++; luckEarned++; }
  s.xp += CONFIG.XP_PER_SPIN * count;
  const levelUps = [];
  while (s.xp >= xpForLevel(s.level)) {
    s.xp -= xpForLevel(s.level);
    s.level++;
    const r = levelReward(s.level);
    s.balance += r.balance;
    levelUps.push({ level: s.level, ...r });
  }
  return { item: best, soldNow, autoSold, moved, overflow, luckUsed, luckEarned, levelUps };
}

// Продать только что выпавший номер сразу
export function sellPending(s) {
  if (!s.pending) return 0;
  const price = s.pending.price;
  s.balance += price;
  s.pending = null;
  return price;
}

export function sellFromCollection(s, id) {
  const i = s.collection.findIndex((x) => x.id === id);
  if (i < 0) return 0;
  const [it] = s.collection.splice(i, 1);
  s.balance += it.price;
  return it.price;
}

// ---------- Слияние: 3 номера одной редкости → 1 номер редкостью выше ----------
// Итоговая ценность = сумма номеров минус комиссия: если средняя цена нужного класса выше, игрок доплачивает.
export function craftQuote(items) {
  if (items.length !== CRAFT.COUNT) return { error: `Нужно ${CRAFT.COUNT} номера` };
  const tier = items[0].tier;
  if (items.some((x) => x.tier !== tier)) return { error: 'Номера должны быть одной редкости' };
  const target = BETS[tier + 1];
  if (!target) return { error: 'Выше этой редкости слиять нельзя' };
  const sum = items.reduce((a, x) => a + x.price, 0);
  const fee = Math.max(0, Math.ceil((target.avg - sum * (1 - CRAFT.FEE)) / CRAFT.ROUND) * CRAFT.ROUND);
  return { tier, targetTier: tier + 1, target, sum, fee };
}

export function craft(s, ids) {
  if (new Set(ids).size !== ids.length) return { error: 'Выбери разные номера' };
  const items = ids.map((id) => s.collection.find((x) => x.id === id));
  if (items.some((x) => !x)) return { error: 'Номер не найден в коллекции' };
  const q = craftQuote(items);
  if (q.error) return q;
  if (s.balance < q.fee) return { error: `Не хватает ${q.fee - s.balance} ₽ на доплату` };
  s.balance -= q.fee;
  s.collection = s.collection.filter((x) => !ids.includes(x.id));
  const item = rollMin(q.targetTier, rollOpts(s));
  s.collection.unshift(item);
  s.stats.crafts++;
  return { item, ...q };
}
