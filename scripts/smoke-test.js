// Быстрая проверка логики игры без браузера: node scripts/smoke-test.js
import assert from 'node:assert/strict';
import { fresh } from '../webapp/js/state.js';
import * as game from '../webapp/js/game.js';
import { BETS, TIERS } from '../webapp/js/config.js';
import { SERIES, detectSeries } from '../webapp/js/generator.js';

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
console.log('Все проверки пройдены');
