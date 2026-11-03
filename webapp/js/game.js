import { CONFIG, AUTO_SELL, BETS, OPERATORS, CRAFT, DISTRICTS, ATLAS, CITY_BY_NAME, xpForLevel, levelReward } from './config.js?v=mw15a2uk';
import { roll, rollMin } from './generator.js?v=mw15a2uk';

export const currentBet = (s) => BETS[s.bet] ?? BETS[0];
export const spinCost = (s, count = s.multi) => currentBet(s).cost * count;

export const operatorOf = (s) => OPERATORS.find((o) => o.id === s.operator) ?? null;
export const luckBestOf = () => CONFIG.LUCK_BEST_OF;
// Сколько круток осталось до следующего заряда Удачи
export const luckLeft = (s) => CONFIG.LUCK_EVERY - (s.luckSpins % CONFIG.LUCK_EVERY);
export const luck20Left = (s) => CONFIG.LUCK20_EVERY - (s.luck20Spins % CONFIG.LUCK20_EVERY);

// Альбом городов: у каждого оператора свой набор, за полный набор есть награда
export const albumSize = (opId) => new Set(OPERATORS.find((o) => o.id === opId).codes.map((c) => c.city)).size;
export const albumFound = (s, opId) => (s.found?.[opId] ?? []).length;
export const citiesOpened = (s) => new Set(Object.values(s.found ?? {}).flat());
export const districtProgress = (s, d, opened = citiesOpened(s)) => ({ count: d.cities.filter((c) => opened.has(c)).length, total: d.cities.length });

// Новый штамп оператора в городе. Если город открыт впервые, платят награду за город, за округ и за всю Россию.
export function discover(s, item) {
  const list = (s.found[item.op] ??= []);
  if (list.includes(item.city)) return null;
  const wasOpen = citiesOpened(s).has(item.city);
  list.push(item.city);
  const res = { city: item.city, op: item.op, done: false, bonus: 0, isNewCity: !wasOpen, cityBonus: 0, district: null, all: null };
  if (list.length === albumSize(item.op)) { res.done = true; res.bonus = CONFIG.ALBUM_BONUS; s.balance += CONFIG.ALBUM_BONUS; }
  if (!wasOpen) {
    const city = CITY_BY_NAME[item.city];
    res.cityBonus = city.bonus;
    s.balance += city.bonus;
    const d = DISTRICTS.find((x) => x.id === city.district);
    const opened = citiesOpened(s);
    const { count, total } = districtProgress(s, d, opened);
    s.atlas ??= { claimed: [] };
    res.district = { id: d.id, name: d.name, short: d.short, count, total, done: false, bonus: 0, luck: 0 };
    if (count === total && !s.atlas.claimed.includes(d.id)) {
      s.atlas.claimed.push(d.id);
      s.balance += ATLAS.DISTRICT_REWARD.balance;
      s.luck += ATLAS.DISTRICT_REWARD.luck;
      Object.assign(res.district, { done: true, bonus: ATLAS.DISTRICT_REWARD.balance, luck: ATLAS.DISTRICT_REWARD.luck });
      if (DISTRICTS.every((x) => s.atlas.claimed.includes(x.id)) && !s.atlas.claimed.includes('all')) {
        s.atlas.claimed.push('all');
        s.balance += ATLAS.ALL_REWARD.balance;
        s.luck20 += ATLAS.ALL_REWARD.luck20;
        res.all = { bonus: ATLAS.ALL_REWARD.balance, luck20: ATLAS.ALL_REWARD.luck20 };
      }
    }
  }
  return res;
}
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
  // сначала тратится большой заряд (лучший из 20), потом обычный (лучший из 2)
  let n = 1;
  if (s.luck20 > 0) { s.luck20--; n = CONFIG.LUCK20_BEST_OF; }
  else if (s.luck > 0) { s.luck--; n = luckBestOf(s); }
  if (n === 1) return roll(rollOpts(s));
  let best = null;
  for (let i = 0; i < n; i++) {
    const it = roll(rollOpts(s));
    if (!best || it.price > best.price) best = it;
  }
  best.lucky = n;
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
  s.luck20Spins += count;
  let luck20Earned = 0;
  while (s.luck20Spins >= CONFIG.LUCK20_EVERY) { s.luck20Spins -= CONFIG.LUCK20_EVERY; s.luck20++; luck20Earned++; }
  const found = discover(s, best);
  s.xp += CONFIG.XP_PER_SPIN * count;
  const levelUps = [];
  while (s.xp >= xpForLevel(s.level)) {
    s.xp -= xpForLevel(s.level);
    s.level++;
    const r = levelReward(s.level);
    s.balance += r.balance;
    levelUps.push({ level: s.level, ...r });
  }
  return { item: best, soldNow, autoSold, moved, overflow, luckUsed, luckEarned, luck20Earned, found, levelUps };
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

// Продать всю коллекцию разом (выпавший номер на экране остаётся)
export function sellAll(s) {
  const count = s.collection.length;
  const total = s.collection.reduce((a, x) => a + x.price, 0);
  s.collection = [];
  s.balance += total;
  return { count, total };
}

// ---------- Слияние: 10 номеров одной редкости → 1 номер редкостью выше ----------
// Ценность на выходе почти равна сумме номеров минус комиссия. Гарантируется самая высокая редкость, чья средняя цена
// не больше суммы (но не ниже следующей), а разницу до редкости ещё выше выдаёт шанс. Если сумма не дотягивает даже
// до следующей редкости, игрок доплачивает разницу.
export function craftQuote(items) {
  if (items.length !== CRAFT.COUNT) return { error: `Нужно ${CRAFT.COUNT} номеров` };
  const tier = items[0].tier;
  if (items.some((x) => x.tier !== tier)) return { error: 'Номера должны быть одной редкости' };
  if (!BETS[tier + 1]) return { error: 'Выше этой редкости слить нельзя' };
  const sum = items.reduce((a, x) => a + x.price, 0);
  const net = sum * (1 - CRAFT.FEE);
  let targetTier = tier + 1;
  for (let t = tier + 2; t < BETS.length; t++) if (BETS[t].avg <= net) targetTier = t;
  const target = BETS[targetTier];
  const fee = Math.max(0, Math.ceil((target.avg - net) / CRAFT.ROUND) * CRAFT.ROUND);
  const up = BETS[targetTier + 1];
  const upChance = up && net > target.avg ? Math.min(0.95, (net - target.avg) / (up.avg - target.avg)) : 0;
  const lossy = !up && net > target.avg * 1.1;
  return { tier, targetTier, target, lossy, upTier: upChance ? targetTier + 1 : null, upChance, sum, fee };
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
  const upgraded = q.upTier !== null && Math.random() < q.upChance;
  const item = rollMin(upgraded ? q.upTier : q.targetTier, rollOpts(s));
  s.collection.unshift(item);
  s.stats.crafts++;
  return { item, upgraded, found: discover(s, item), ...q };
}

// Самые дешёвые CRAFT.COUNT номеров из самой низкой редкости, где их хватает
export function craftAutoPick(s, onlyTier = null) {
  for (let t = onlyTier ?? 0; t < (onlyTier === null ? BETS.length - 1 : onlyTier + 1); t++) {
    const pool = s.collection.filter((x) => x.tier === t).sort((a, b) => a.price - b.price);
    if (pool.length >= CRAFT.COUNT) return pool.slice(0, CRAFT.COUNT).map((x) => x.id);
  }
  return [];
}
