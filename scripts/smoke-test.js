// Быстрая проверка логики игры без браузера: node scripts/smoke-test.js
import assert from 'node:assert/strict';
import { fresh } from '../webapp/js/state.js';
import * as game from '../webapp/js/game.js';
import { CONFIG, BETS, TIERS, OPERATORS, CRAFT } from '../webapp/js/config.js';
import { SERIES, detectSeries, roll, rollMin, digitBonus, oddsOf } from '../webapp/js/generator.js';

const s = fresh();
const start = s.balance;
let r = game.spin(s, 1);
assert.ok(r.item && s.pending, 'после крутки есть номер');
assert.ok(s.balance === start - 500 || r.levelUps.length, 'деньги списались');
r = game.spin(s, 1);
assert.ok(s.collection.length === 1 || r.soldNow, 'прошлый номер ушёл в коллекцию сам');
const id = s.collection[0]?.id;
if (s.collection.length) assert.ok(game.sellFromCollection(s, id) > 0 && s.collection.length === 0, 'номер продался');
r = game.spin(s, 10);
assert.ok(r.item, 'мульти-крутка работает');
s.balance = 0; s.pending = null; s.collection = [];
assert.ok(game.bailout(s) && s.balance > 0, 'пособие при нуле');
assert.ok(game.claimDaily(s) !== null && game.claimDaily(s) === null, 'ежедневный бонус раз в сутки');

// ставки с гарантией редкости
BETS.forEach((b, i) => {
  if (!b.tier) return;
  const t = fresh();
  t.bet = i; t.balance = b.cost * 2; t.luck = 5;
  const r2 = game.spin(t, 1);
  assert.ok(!r2.error, `ставка ${i}: хватает денег`);
  assert.ok(r2.item.tier >= b.tier, `ставка ${TIERS[b.tier].name}+ даёт номер не ниже редкости`);
  assert.equal(t.balance, b.cost, `ставка ${i}: списана цена ставки`);
  assert.equal(t.luck, 5, 'Удача на ставке не тратится');
  const poor = fresh(); poor.bet = i; poor.balance = b.cost - 1;
  assert.ok(game.spin(poor, 1).error, `ставка ${i}: без денег крутить нельзя`);
});
SERIES.forEach((x) => assert.ok((detectSeries(x.make())?.mult ?? 0) >= x.mult, `конструктор серии «${x.name}»`));

// операторы: у каждого свои коды, «любой» даёт все
OPERATORS.forEach((o) => {
  const own = new Set(o.codes.map((c) => c.code));
  for (let i = 0; i < 2000; i++) {
    const it = roll({ op: o.id });
    assert.equal(it.op, o.id, `оператор ${o.id} попадает на SIM`);
    assert.ok(own.has(it.code), `код ${it.code} принадлежит ${o.id}`);
  }
  for (let i = 0; i < 200; i++) assert.ok(own.has(rollMin(2, { op: o.id }).code), `ставка: код ${o.id}`);
});
{
  // один код может покрывать несколько городов своего макрорегиона, но у двух операторов общих кодов быть не должно
  const owner = {};
  for (const o of OPERATORS) for (const c of o.codes) {
    assert.ok(!owner[c.code] || owner[c.code] === o.id, `код ${c.code} принадлежит двум операторам`);
    owner[c.code] = o.id;
  }
  const seen = new Set();
  for (let i = 0; i < 6000; i++) seen.add(roll().op);
  assert.equal(seen.size, OPERATORS.length, 'без выбора выпадают все операторы');
}

// любимая цифра: бонус растёт с числом цифр и попадает в цену
assert.equal(digitBonus('1234568', 7), null, 'нет цифр — нет бонуса');
assert.equal(digitBonus('7771234', 7).mult, 1.5);
assert.equal(digitBonus('7777123', 7).mult, 2);
assert.equal(digitBonus('7777712', 7).mult, 3);
assert.equal(digitBonus('7777712', null), null, 'цифра не выбрана');
for (let i = 0; i < 500; i++) {
  const it = roll({ digit: 7 });
  const d = digitBonus(it.body, 7);
  assert.equal(!!it.digit, !!d, 'бонус в номере совпадает с подсчётом');
}
assert.equal(oddsOf({ name: 'Пара-пара' }) > 10, true, '«1 из N» считается для серии');
assert.equal(oddsOf(null), null);

// слияние: 10 номеров одной редкости → номер редкостью выше
{
  const N = CRAFT.COUNT;
  const t = fresh(); t.balance = 1e6;
  const mk = (tier) => { let it; do { it = roll(); } while (it.tier !== tier); return it; };
  const many = (tier, n = N) => Array.from({ length: n }, () => mk(tier));
  const group = many(1);
  t.collection = [...group, mk(0)];
  const ids = group.map((x) => x.id);
  const q = game.craftQuote(group);
  assert.ok(q.targetTier >= 2, 'цель — не ниже следующей редкости');
  assert.ok(q.fee >= 0 && q.fee % CRAFT.ROUND === 0, 'доплата кратна шагу');
  assert.ok(q.fee === 0 || q.targetTier === 2, 'доплата только когда цель — ближайшая редкость');
  assert.ok(q.upChance >= 0 && q.upChance < 1, 'шанс на редкость выше от 0 до 1');
  const before = t.balance;
  const r = game.craft(t, ids);
  assert.ok(!r.error, 'слияние прошло');
  assert.ok(r.item.tier >= q.targetTier, 'результат не ниже обещанной редкости');
  assert.equal(t.collection.length, 2, `${N} номеров ушли, 1 пришёл`);
  assert.equal(t.balance, before - q.fee, 'списана доплата');
  assert.equal(t.stats.crafts, 1);
  // много денег в сумме поднимают цель выше
  const rich = Array.from({ length: N }, () => ({ ...mk(1), price: 3000 }));
  { const rq = game.craftQuote(rich); assert.ok(rq.targetTier >= 3 || rq.upTier >= 3, 'дорогие номера дают шанс на редкость выше следующей'); }
  // ошибки
  const dup = [...ids]; dup[1] = dup[0];
  assert.ok(game.craft(t, dup).error, 'одинаковые номера нельзя');
  assert.ok(game.craftQuote([...many(1, N - 1), mk(2)]).error, 'разные редкости нельзя');
  assert.ok(game.craftQuote(many(4)).error, 'выше легендарного слить нельзя');
  assert.ok(game.craftQuote([mk(1)]).error, `нужно ${N} номеров`);
  const poor = fresh(); poor.balance = 0; poor.collection = many(0);
  const pq = game.craftQuote(poor.collection);
  if (pq.fee > 0) assert.ok(game.craft(poor, poor.collection.map((x) => x.id)).error, 'без денег на доплату нельзя');
  // автовыбор берёт самые дешёвые из первой редкости, где хватает номеров
  const auto = fresh(); auto.collection = [...many(0, N + 2), ...many(1, 3)];
  const pick = game.craftAutoPick(auto);
  assert.equal(pick.length, N);
  const left = auto.collection.filter((x) => !pick.includes(x.id) && x.tier === 0).map((x) => x.price);
  assert.ok(Math.max(...pick.map((id) => auto.collection.find((x) => x.id === id).price)) <= Math.min(...left), 'взяты самые дешёвые');
}

// ставка и операторы вместе
{
  const t = fresh(); t.bet = 2; t.operator = 'yoga'; t.balance = 1e5;
  const r3 = game.spin(t, 1);
  assert.ok(!r3.error && r3.item.tier >= 2 && r3.item.op === 'yoga', 'ставка + оператор');
}
console.log('Все проверки пройдены');

// Удача: каждые 100 круток — один заряд, заряд делает одну крутку «лучший из 2»
{
  const t = fresh(); t.balance = 1e9;
  for (let i = 0; i < CONFIG.LUCK_EVERY - 1; i++) game.spin(t, 1);
  assert.equal(t.luck, 0, 'до 100-й крутки заряда нет');
  assert.equal(game.luckLeft(t), 1, 'осталась одна крутка до заряда');
  const r = game.spin(t, 1);
  assert.equal(r.luckEarned, 1, '100-я крутка даёт заряд');
  assert.equal(t.luck, 1);
  assert.equal(game.luckLeft(t), CONFIG.LUCK_EVERY, 'счётчик начался заново');
  const u = game.spin(t, 1);
  assert.equal(u.luckUsed, 1, 'заряд потрачен на следующую крутку');
  assert.equal(t.luck, 0);
}
// Продажа выпавшего номера
{
  const t = fresh(); const b0 = t.balance;
  const r = game.spin(t, 1); const after = t.balance;
  if (!r.soldNow) {
    assert.equal(game.sellPending(t), r.item.price, 'продали по цене номера');
    assert.equal(t.balance, after + r.item.price);
    assert.equal(t.pending, null);
    assert.equal(game.sellPending(t), 0, 'второй раз продать нечего');
  }
}
console.log('Удача и продажа: ок');

// Коллекция до 50: лишнее продаётся, остаются самые дорогие
{
  const t = fresh(); t.balance = 1e9;
  const items = Array.from({ length: CONFIG.COLLECTION_MAX }, (_, i) => ({ ...roll(), id: 'x' + i, price: 1000 + i * 10 }));
  t.collection = items; const b0 = t.balance;
  const sold = game.addToCollection(t, { ...roll(), id: 'new', price: 5 });
  assert.equal(t.collection.length, CONFIG.COLLECTION_MAX, 'коллекция не больше лимита');
  assert.equal(sold.length, 1); assert.equal(sold[0].id, 'new', 'самый дешёвый (новый) продан');
  assert.equal(t.balance, b0 + 5);
  const sold2 = game.addToCollection(t, { ...roll(), id: 'rich', price: 99999 });
  assert.equal(sold2[0].id, 'x0', 'при переполнении продан самый дешёвый из коллекции');
  assert.ok(t.collection.some((x) => x.id === 'rich'));
}
// Автопродажа и уход номера в коллекцию
{
  const t = fresh(); t.balance = 1e9; t.autoSell = 3; // до Редких
  const r = game.spin(t, 1);
  if (r.item.tier <= 2) { assert.ok(r.soldNow && !t.pending, 'автопродажа продала сразу'); }
  const u = fresh(); u.balance = 1e9;
  const a = game.spin(u, 1); const had = u.pending?.id;
  game.spin(u, 1);
  assert.ok(u.collection.some((x) => x.id === had) || a.soldNow, 'непроданный номер ушёл в коллекцию');
}
console.log('Коллекция 50 и автопродажа: ок');

// Удача x20: каждые 500 круток, тратится первой
{
  const t = fresh(); t.balance = 1e9;
  for (let i = 0; i < CONFIG.LUCK20_EVERY - 1; i++) game.spin(t, 1);
  assert.equal(t.luck20, 0); assert.equal(game.luck20Left(t), 1);
  const r = game.spin(t, 1);
  assert.equal(r.luck20Earned, 1, '500-я крутка даёт большой заряд');
  assert.equal(t.luck20, 1);
  const u = game.spin(t, 1);
  assert.equal(u.item.lucky, CONFIG.LUCK20_BEST_OF, 'первым тратится большой заряд');
  assert.equal(t.luck20, 0);
}
// Альбом городов: первый город даёт отметку, полный набор — награду
{
  const t = fresh(); t.balance = 1e9;
  const op = OPERATORS[0];
  const size = game.albumSize(op.id);
  assert.ok(size > 7, 'у оператора много городов');
  t.operator = op.id;
  let seen = 0, bonusGot = 0;
  for (let i = 0; i < 20000 && !bonusGot; i++) {
    const before = t.balance;
    const r = game.spin(t, 1);
    if (r.found) { seen++; if (r.found.done) bonusGot = r.found.bonus; }
  }
  assert.equal(game.albumFound(t, op.id), size, 'все города оператора открыты');
  assert.equal(seen, size);
  assert.equal(bonusGot, CONFIG.ALBUM_BONUS, 'награда за полный альбом');
}
console.log('Удача x20 и альбом: ок');
