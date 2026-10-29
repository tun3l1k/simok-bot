// Быстрая проверка логики игры без браузера: node scripts/smoke-test.js
import assert from 'node:assert/strict';
import { fresh } from '../webapp/js/state.js';
import * as game from '../webapp/js/game.js';

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
console.log('Все проверки пройдены');
