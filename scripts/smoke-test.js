// Быстрая проверка логики игры без браузера: node scripts/smoke-test.js
import assert from 'node:assert/strict';
import { fresh } from '../webapp/js/state.js';
import * as game from '../webapp/js/game.js';
import { BETS, TIERS, OPERATORS, CRAFT } from '../webapp/js/config.js';
import { SERIES, detectSeries, roll, rollMin, digitBonus, oddsOf } from '../webapp/js/generator.js';

const s = fresh();
const start = s.balance;
let r = game.spin(s, 1);
assert.ok(r.item && s.pending, 'после крутки есть номер');
assert.ok(s.balance === start - 500 || r.levelUps.length, 'деньги списались');
assert.ok(game.keepPending(s) && s.collection.length === 1, 'номер сохранился');
const id = s.collection[0].id;
assert.ok(game.sellFromCollection(s, id) > 0 && s.collection.length === 0, 'номер продался');
r = game.spin(s, 10);
assert.ok(r.item, 'мульти-крутка работает');
s.balance = 0; s.pending = null; s.collection = [];
assert.ok(game.bailout(s) && s.balance > 0, 'пособие при нуле');
assert.ok(game.claimDaily(s) !== null && game.claimDaily(s) === null, 'ежедневный бонус раз в сутки');

// ставки с гарантией редкости
BETS.forEach((b, i) => {
  if (!b.tier) return;
  const t = fresh();
  t.bet = i; t.balance = b.cost * 2;
  const r2 = game.spin(t, 1);
  assert.ok(!r2.error, `ставка ${i}: хватает денег`);
  assert.ok(r2.item.tier >= b.tier, `ставка ${TIERS[b.tier].name}+ даёт номер не ниже редкости`);
  assert.equal(t.balance, b.cost, `ставка ${i}: списана цена ставки`);
  assert.equal(t.luck, fresh().luck, 'Удача на ставке не тратится');
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
  const all = new Set(OPERATORS.flatMap((o) => o.codes.map((c) => c.code)));
  assert.equal(all.size, OPERATORS.reduce((n, o) => n + o.codes.length, 0), 'коды у операторов не повторяются');
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

// слияние: 3 номера одной редкости → номер редкостью выше
{
  const t = fresh(); t.balance = 1e6;
  const mk = (tier) => { let it; do { it = roll(); } while (it.tier !== tier); return it; };
  const trio = [mk(1), mk(1), mk(1)];
  t.collection = [...trio, mk(0)];
  const ids = trio.map((x) => x.id);
  const q = game.craftQuote(trio);
  assert.equal(q.targetTier, 2, 'цель — следующая редкость');
  assert.ok(q.fee >= 0 && q.fee % CRAFT.ROUND === 0, 'доплата кратна шагу');
  const before = t.balance;
  const r = game.craft(t, ids);
  assert.ok(!r.error, 'слияние прошло');
  assert.ok(r.item.tier >= 2, 'результат не ниже редкости выше');
  assert.equal(t.collection.length, 2, '3 номера ушли, 1 пришёл');
  assert.equal(t.balance, before - q.fee, 'списана доплата');
  assert.equal(t.stats.crafts, 1);
  // ошибки
  assert.ok(game.craft(t, [t.collection[0].id, t.collection[0].id, t.collection[1].id]).error, 'одинаковые номера нельзя');
  assert.ok(game.craftQuote([mk(1), mk(2), mk(1)]).error, 'разные редкости нельзя');
  assert.ok(game.craftQuote([mk(4), mk(4), mk(4)]).error, 'выше легендарного слиять нельзя');
  assert.ok(game.craftQuote([mk(1)]).error, 'нужно три номера');
  const poor = fresh(); poor.balance = 0; poor.collection = [mk(1), mk(1), mk(1)];
  const pq = game.craftQuote(poor.collection);
  if (pq.fee > 0) assert.ok(game.craft(poor, poor.collection.map((x) => x.id)).error, 'без денег на доплату нельзя');
}

// ставка и операторы вместе
{
  const t = fresh(); t.bet = 2; t.operator = 'yoga'; t.balance = 1e5;
  const r3 = game.spin(t, 1);
  assert.ok(!r3.error && r3.item.tier >= 2 && r3.item.op === 'yoga', 'ставка + оператор');
}
console.log('Все проверки пройдены');
