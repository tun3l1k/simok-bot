// Проверка админ-меню без Telegram: подменяем сетевой слой grammY и гоняем обновления.
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openStore } from '../bot/store.js';
import { runBroadcast } from '../bot/broadcast.js';
import { registerAdmin } from '../bot/admin.js';

// ---- хранилище ----
let clock = 1_000_000_000_000;
const file = join(mkdtempSync(join(tmpdir(), 'simok-')), 'users.json');
const store = openStore(file, () => clock);
store.touch({ id: 1, first_name: 'Аня', username: 'anya' });
store.touch({ id: 2, first_name: 'Борис' }, '1');
store.touch({ id: 3, first_name: 'Вера' }, '1');
store.touch({ id: 4, first_name: 'Глеб' }, '4'); // сам себя пригласить нельзя
assert.equal(store.stats().total, 4);
assert.equal(store.stats().invited, 2, 'по приглашению пришли двое, самоприглашение не считается');
assert.equal(store.topInviters()[0].id, '1');
assert.equal(store.topInviters()[0].invited, 2);
store.touch({ id: 2, first_name: 'Борис' }, '3');
assert.equal(store.get(2).ref, '1', 'пригласивший запоминается только при первой записи');
clock += 2 * 86400e3;
store.touch({ id: 1, first_name: 'Аня' });
assert.equal(store.stats().active24h, 1);
assert.equal(store.stats().active7d, 4);
assert.equal(store.stats().new24h, 0);
store.markBlocked(3);
assert.equal(store.reachable().length, 3);
store.touch({ id: 3, first_name: 'Вера' });
assert.equal(store.reachable().length, 4, 'вернулась в бота — снова доступна');
store.flush();
assert.equal(openStore(file).all().length, 4, 'сохранилось в файл');

// ---- рассылка ----
{
  const users = [1, 2, 3, 4, 5, 6].map((id) => ({ id }));
  const log = []; const blocked = [];
  let retried = false;
  const res = await runBroadcast({
    users, sleep: async () => {}, onBlocked: (id) => blocked.push(id),
    send: async (id) => {
      log.push(id);
      if (id === 2) throw { error_code: 403 };
      if (id === 3) throw { error_code: 400 };
      if (id === 4 && !retried) { retried = true; throw { error_code: 429, parameters: { retry_after: 1 } }; }
    },
  });
  assert.deepEqual(res, { total: 6, sent: 4, blocked: 1, failed: 1 });
  assert.deepEqual(blocked, [2]);
  assert.equal(log.filter((x) => x === 4).length, 2, 'после 429 пробуем ещё раз');
}

// ---- админ-меню: подменяем grammY маленькой заглушкой ----
class Kb { constructor() { this.rows = [[]]; } text(t, d) { this.rows.at(-1).push({ t, d }); return this; } webApp(t, u) { this.rows.at(-1).push({ t, u }); return this; } row() { this.rows.push([]); return this; } }
const handlers = { command: {}, cb: [], on: {} };
const calls = [];
const api = {
  copyMessage: async (...a) => calls.push({ m: 'copy', a }),
  editMessageText: async (...a) => calls.push({ m: 'apiEdit', a }),
};
const bot = { api, command: (n, f) => (handlers.command[n] = f), callbackQuery: (re, f) => handlers.cb.push([re, f]), on: (e, f) => (handlers.on[e] = f) };
const s2 = openStore(join(mkdtempSync(join(tmpdir(), 'simok-')), 'u.json'));
[11, 12, 13].forEach((id) => s2.touch({ id, first_name: 'U' + id }));
registerAdmin(bot, s2, { adminIds: ['11'], webappUrl: 'https://example.com/' }, Kb);

const ctxOf = (from, extra = {}) => ({
  from: { id: from }, chat: { id: from },
  reply: async (text, o) => { calls.push({ m: 'reply', text, o }); return { chat: { id: from }, message_id: 500 + calls.length }; },
  editMessageText: async (text, o) => calls.push({ m: 'edit', text, o }),
  answerCallbackQuery: async (o) => calls.push({ m: 'answer', o }),
  ...extra,
});
const last = (m) => calls.filter((c) => c.m === m).at(-1);
const count = (m) => calls.filter((c) => c.m === m).length;
const press = (from, data) => handlers.cb[0][1](ctxOf(from, { callbackQuery: { data } }));
const write = (from, text) => handlers.on.message(ctxOf(from, { message: { text, message_id: 77 } }), async () => calls.push({ m: 'next' }));

await handlers.command.admin(ctxOf(12));
assert.equal(count('reply'), 0, 'чужому /admin не отвечает');
await press(12, 'adm:stats');
assert.ok(last('answer').o.show_alert, 'чужому кнопки не работают');
assert.equal(count('edit'), 0);

await handlers.command.admin(ctxOf(11));
assert.match(last('reply').text, /Админка SimOk/);
assert.match(last('reply').text, /Игроков: <b>3<\/b>/);
assert.ok(last('reply').o.reply_markup.rows.flat().some((b) => b.u === 'https://example.com/'), 'есть кнопка «Открыть игру»');
await press(11, 'adm:stats');
assert.match(last('edit').text, /Всего игроков: <b>3<\/b>/);
await press(11, 'adm:recent');
assert.match(last('edit').text, /Новые игроки/);
await press(11, 'adm:top');
assert.match(last('edit').text, /Приглашений пока нет/);

// рассылка: кнопка → сообщение → подтверждение → копии всем
await press(11, 'adm:bc');
assert.match(last('edit').text, /получат <b>3<\/b>/);
await write(12, 'это не админ');
assert.equal(count('next'), 1, 'сообщение чужого уходит дальше по цепочке, а не в рассылку');
assert.equal(count('reply'), 1);
await write(11, '/start');
assert.equal(count('next'), 2, 'команды не считаются текстом рассылки');
await write(11, 'Привет, обновление!');
assert.match(last('reply').text, /Отправить\?/);
await press(11, 'adm:bcsend');
assert.equal(count('copy'), 3, 'копия ушла всем троим');
assert.deepEqual(calls.filter((c) => c.m === 'copy')[0].a.slice(1), [11, 77], 'копируется именно сообщение админа');
assert.match(last('apiEdit').a[2], /Рассылка завершена\nДоставлено: 3/);
await press(11, 'adm:bcsend');
assert.equal(count('copy'), 3, 'повторное подтверждение ничего не шлёт');
console.log('Админ-меню: ок');
