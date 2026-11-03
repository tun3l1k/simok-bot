// Проверка сервера без Cloudflare: D1 подменён SQLite из Node (node:sqlite), grammY — заглушкой.
// Запуск: node scripts/server-test.js (npm test делает это сам)
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

execFileSync('node', [new URL('./sync-shared.js', import.meta.url).pathname], { stdio: 'ignore' });
const { createStore } = await import('../server/src/store.js');
const { verifyInitData } = await import('../server/src/auth.js');
const { handleApi } = await import('../server/src/api.js');
const { registerAdmin } = await import('../server/src/admin.js');
const { runBroadcast, processBroadcast } = await import('../server/src/broadcast.js');
const { CONFIG, CRAFT } = await import('../server/src/shared/config.js');

// ---- D1 на SQLite ----
class Stmt {
  constructor(db, sql) { this.st = db.prepare(sql); this.args = []; }
  bind(...a) { this.args = a; return this; }
  async first() { return this.st.get(...this.args) ?? null; }
  async all() { return { results: this.st.all(...this.args) }; }
  async run() { const r = this.st.run(...this.args); return { success: true, meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; }
}
function newDb() {
  const raw = new DatabaseSync(':memory:');
  raw.exec(readFileSync(new URL('../server/migrations/0001_init.sql', import.meta.url), 'utf8'));
  return { prepare: (sql) => new Stmt(raw, sql) };
}

// ---- подпись Telegram ----
const TOKEN = '123456:TEST-TOKEN';
function initData(user, { authDate = Math.floor(Date.now() / 1000), token = TOKEN, tamper = false } = {}) {
  const p = new URLSearchParams({ auth_date: String(authDate), query_id: 'AAA', user: JSON.stringify(user) });
  const check = [...p.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(token).digest();
  p.set('hash', createHmac('sha256', secret).update(check).digest('hex'));
  if (tamper) p.set('user', JSON.stringify({ ...user, id: user.id + 1 }));
  return p.toString();
}
const U1 = { id: 1001, first_name: 'Аня', username: 'anya' };

assert.equal((await verifyInitData(initData(U1), TOKEN)).user.id, 1001, 'верная подпись принимается');
assert.equal(await verifyInitData(initData(U1, { tamper: true }), TOKEN), null, 'подмена данных отклоняется');
assert.equal(await verifyInitData(initData(U1), 'другой:токен'), null, 'чужой токен бота отклоняется');
assert.equal(await verifyInitData(initData(U1, { authDate: 1000 }), TOKEN), null, 'старые данные отклоняются');
assert.equal(await verifyInitData('', TOKEN), null);

// ---- API ----
const db = newDb();
let clock = Date.now();
const store = createStore(db, () => clock);
const env = { BOT_TOKEN: TOKEN, ALLOWED_ORIGIN: 'https://ok.example' };
const call = async (action, body = {}, { user = U1, auth } = {}) => {
  const headers = { 'Content-Type': 'application/json', Origin: 'https://ok.example' };
  if (auth !== null) headers.Authorization = `tma ${auth ?? initData(user)}`;
  const r = await handleApi(new Request(`https://w.example/api/${action}`, { method: 'POST', headers, body: JSON.stringify(body) }), env, { store, db });
  return { status: r.status, ...(await r.json()), headers: r.headers };
};

assert.equal((await call('state', {}, { auth: null })).status, 401, 'без подписи нельзя');
assert.equal((await call('state', {}, { auth: initData(U1, { tamper: true }) })).status, 401);
assert.equal((await call('nope')).status, 404);
const opt = await handleApi(new Request('https://w.example/api/spin', { method: 'OPTIONS', headers: { Origin: 'https://ok.example' } }), env, { store, db });
assert.equal(opt.status, 204);
assert.equal(opt.headers.get('Access-Control-Allow-Origin'), 'https://ok.example');

let r = await call('state', { ref: '555' });
assert.equal(r.state.balance, CONFIG.START_BALANCE, 'новый игрок получает стартовый баланс');
assert.equal((await store.get(1001)).ref, '555', 'пригласивший записан');
assert.equal((await store.get(1001)).started, 0, 'зашёл по игре, но боту не писал');

// крутка считается на сервере
r = await call('spin');
assert.ok(r.res.item && r.state.pending, 'после крутки есть номер');
assert.equal(r.state.balance, CONFIG.START_BALANCE - CONFIG.SPIN_COST, 'списана цена крутки');
const pendingId = r.state.pending.id;
assert.equal((await call('state')).state.pending.id, pendingId, 'состояние лежит в базе');

// подделка: чужие поля и неверные настройки не принимаются
r = await call('state', { balance: 1e9, collection: [1], settings: { bet: 999, multi: 1000, operator: 'evil', digit: 77, autoSell: 9, country: 'xx', balance: 5 } });
assert.equal(r.state.balance, CONFIG.START_BALANCE - CONFIG.SPIN_COST, 'баланс клиент не задаёт');
assert.equal(r.state.bet, 0); assert.equal(r.state.multi, 1); assert.equal(r.state.operator, null); assert.equal(r.state.digit, null);
assert.equal(r.state.collection.length, 0);
r = await call('state', { settings: { bet: 2, multi: 5, operator: 'yoga', digit: 7, autoSell: 1, country: 'ru' } });
assert.deepEqual([r.state.bet, r.state.multi, r.state.operator, r.state.digit, r.state.autoSell], [2, 5, 'yoga', 7, 1], 'нормальные настройки применяются');
r = await call('spin', { settings: { bet: 4 } });
assert.ok(r.error && r.state.balance < 96800 || r.error, 'дорогая ставка без денег не проходит');
assert.equal(r.state.pending.id, pendingId, 'неудачная крутка ничего не меняет');
await call('state', { settings: { bet: 0, multi: 1 } });

// продажа: цену берёт сервер
const before = (await call('state')).state;
r = await call('sell', { id: pendingId, price: 99999999 });
assert.equal(r.price, before.pending.price, 'цена продажи из базы, а не от клиента');
assert.equal(r.state.balance, before.balance + before.pending.price);
assert.equal(r.state.pending, null);
assert.ok((await call('sell', { id: pendingId })).error, 'повторно продать нельзя');
assert.ok((await call('sell', { id: 'чужой' })).error);
{
  const before = (await call('state')).state;
  const r2 = await call('sellall');
  const expect = before.collection.reduce((x, y) => x + y.price, 0);
  assert.equal(r2.state.collection.length, 0, 'продать все очищает коллекцию');
  assert.equal(r2.state.balance, before.balance + expect, 'продать все: сумма по ценам сервера');
  assert.ok((await call('sellall')).error, 'пустую коллекцию продать нельзя');
}

// бонус раз в сутки
r = await call('daily'); assert.ok(r.bonus && r.state.balance > before.balance);
assert.ok((await call('daily')).error, 'бонус раз в сутки');

// слияние: проверка входных данных
assert.ok((await call('craft', { ids: ['a'] })).error);
assert.ok((await call('craft', { ids: Array(CRAFT.COUNT).fill('a') })).error, 'одинаковые/чужие номера нельзя');

// две одновременные крутки не затирают друг друга
const U2 = { id: 1002, first_name: 'Борис' };
await call('state', {}, { user: U2 });
const both = await Promise.all([call('spin', {}, { user: U2 }), call('spin', {}, { user: U2 })]);
const fin = (await call('state', {}, { user: U2 })).state;
assert.equal(fin.stats.spins, both.filter((x) => !x.error).length, 'число круток совпадает с удачными ответами');
assert.equal(fin.stats.spins, 2, 'обе крутки учтены');

// игрок не видит чужой прогресс: у каждого свой
assert.equal((await call('state', {}, { user: { id: 1003, first_name: 'В' } })).state.stats.spins, 0);

// сброс
r = await call('reset'); assert.equal(r.state.balance, CONFIG.START_BALANCE); assert.equal(r.state.stats.spins, 0);

// ---- хранилище ----
const s3 = createStore(newDb(), () => clock);
await s3.touch({ id: 1, first_name: 'А', username: 'a' }, { started: true });
await s3.touch({ id: 2, first_name: 'Б' }, { ref: '1' });
await s3.touch({ id: 3, first_name: 'В' }, { ref: '1', started: true });
await s3.touch({ id: 4, first_name: 'Г' }, { ref: '4' });
let st = await s3.stats();
assert.deepEqual([st.total, st.invited, st.new24h, st.active24h, st.blocked], [4, 2, 4, 4, 0]);
const top = await s3.topInviters();
assert.equal(top[0].id, '1'); assert.equal(top[0].invited, 2); assert.equal(top[0].user.username, 'a');
await s3.touch({ id: 2, first_name: 'Б' }, { ref: '3' });
assert.equal((await s3.get(2)).ref, '1', 'пригласивший запоминается только при первой записи');
assert.equal(await s3.reachableCount(), 2, 'писать можно только тем, кто писал боту');
clock += 2 * 86400e3;
await s3.touch({ id: 1, first_name: 'А' }, { started: true });
st = await s3.stats();
assert.deepEqual([st.active24h, st.active7d, st.new24h], [1, 4, 0]);
await s3.markBlocked(3);
assert.equal(await s3.reachableCount(), 1);
await s3.touch({ id: 3, first_name: 'В' }, { started: true });
assert.equal(await s3.reachableCount(), 2, 'написал боту снова: блокировка снята');

// ---- рассылка порциями ----
{
  const users = [1, 2, 3, 4, 5, 6].map((id) => ({ id }));
  const blocked = []; let retried = false; const log = [];
  const res = await runBroadcast({ users, sleep: async () => {}, onBlocked: (id) => blocked.push(id), send: async (id) => {
    log.push(id);
    if (id === 2) throw { error_code: 403 };
    if (id === 3) throw { error_code: 400 };
    if (id === 4 && !retried) { retried = true; throw { error_code: 429, parameters: { retry_after: 1 } }; }
  } });
  assert.deepEqual(res, { total: 6, sent: 4, blocked: 1, failed: 1 });
  assert.deepEqual(blocked, [2]);
  assert.equal(log.filter((x) => x === 4).length, 2, 'после 429 пробуем ещё раз');
}
{
  const bdb = newDb(); const bs = createStore(bdb);
  for (let id = 1; id <= 7; id++) await bs.touch({ id, first_name: 'U' + id }, { started: true });
  const copies = []; const edits = [];
  const api = {
    copyMessage: async (to, from, mid) => { copies.push(to); if (to === 3) throw { error_code: 403 }; },
    editMessageText: async (chat, msg, text) => edits.push(text),
  };
  const id = await bs.createBroadcast({ chatId: 9, messageId: 8, statusChat: 9, statusMsg: 10, total: 7 });
  let job = await bs.getBroadcast(id), rounds = 0;
  while (job.status === 'running') { job = await processBroadcast({ store: bs, api, job, chunk: 3, sleep: async () => {} }); rounds++; }
  assert.equal(rounds, 3, 'семь человек по три за раз: три порции');
  assert.deepEqual(copies, [1, 2, 3, 4, 5, 6, 7], 'каждому ровно одно сообщение, никого не пропустили');
  assert.deepEqual([job.sent, job.blocked, job.failed], [6, 1, 0]);
  assert.match(edits.at(-1), /Рассылка завершена\nДоставлено: 6\nЗаблокировали бота: 1/);
  assert.equal(await bs.activeBroadcast(), null);
  assert.equal(await bs.reachableCount(), 6, 'заблокировавший отмечен');
}

// ---- админ-меню (grammY заменён заглушкой) ----
class Kb { constructor() { this.rows = [[]]; } text(t, d) { this.rows.at(-1).push({ t, d }); return this; } webApp(t, u) { this.rows.at(-1).push({ t, u }); return this; } row() { this.rows.push([]); return this; } }
{
  const adb = newDb(); const as = createStore(adb);
  [11, 12, 13].forEach((id) => as.touch({ id, first_name: 'U' + id }, { started: true }));
  await as.touch({ id: 14, first_name: 'без бота' });
  const handlers = { command: {}, cb: [], on: {} }; const calls = [];
  const api = { copyMessage: async (...a) => calls.push({ m: 'copy', a }), editMessageText: async (...a) => calls.push({ m: 'apiEdit', a }) };
  const bot = { api, command: (n, f) => (handlers.command[n] = f), callbackQuery: (re, f) => handlers.cb.push([re, f]), on: (e, f) => (handlers.on[e] = f) };
  registerAdmin(bot, as, { adminIds: ['11'], webappUrl: 'https://example.com/', chunk: 2, sleep: async () => {} }, Kb);
  const ctxOf = (from, extra = {}) => ({
    from: { id: from }, chat: { id: from },
    reply: async (text, o) => { calls.push({ m: 'reply', text, o }); return { chat: { id: from }, message_id: 500 + calls.length }; },
    editMessageText: async (text, o) => calls.push({ m: 'edit', text, o }),
    answerCallbackQuery: async (o) => calls.push({ m: 'answer', o }), ...extra });
  const last = (m) => calls.filter((c) => c.m === m).at(-1);
  const count = (m) => calls.filter((c) => c.m === m).length;
  const press = (from, data) => handlers.cb[0][1](ctxOf(from, { callbackQuery: { data } }));
  const write = (from, text) => handlers.on.message(ctxOf(from, { message: { text, message_id: 77 } }), async () => calls.push({ m: 'next' }));

  await handlers.command.admin(ctxOf(12));
  assert.equal(count('reply'), 0, 'чужому /admin не отвечает');
  await press(12, 'adm:stats');
  assert.ok(last('answer').o.show_alert, 'чужому кнопки не работают');
  await handlers.command.admin(ctxOf(11));
  assert.match(last('reply').text, /Игроков: <b>4<\/b>/);
  assert.ok(last('reply').o.reply_markup.rows.flat().some((b) => b.u === 'https://example.com/'));
  await press(11, 'adm:stats'); assert.match(last('edit').text, /Всего игроков: <b>4<\/b>/);
  await press(11, 'adm:recent'); assert.match(last('edit').text, /Новые игроки/);
  await press(11, 'adm:top'); assert.match(last('edit').text, /Приглашений пока нет/);

  await press(11, 'adm:bc');
  assert.match(last('edit').text, /получат <b>3<\/b>/, 'считаются только те, кто писал боту');
  await write(12, 'не админ'); assert.equal(count('next'), 1);
  await write(11, '/start'); assert.equal(count('next'), 2);
  await write(11, 'Привет, обновление!');
  assert.match(last('reply').text, /Отправить\?/);
  await press(11, 'adm:bcsend');
  assert.equal(count('copy'), 2, 'первая порция (chunk=2) ушла сразу');
  assert.equal((await as.activeBroadcast()).sent, 2);
  await press(11, 'adm:bcsend');
  assert.equal(count('copy'), 2, 'повторное подтверждение ничего не шлёт');
  // дальше работает cron
  let job = await as.activeBroadcast();
  while (job) { await processBroadcast({ store: as, api, job, chunk: 2, sleep: async () => {} }); job = await as.activeBroadcast(); }
  assert.deepEqual(calls.filter((c) => c.m === 'copy').map((c) => c.a[0]), [11, 12, 13]);
  assert.deepEqual(calls.filter((c) => c.m === 'copy')[0].a.slice(1), [11, 77], 'копируется сообщение админа');
}
console.log('Сервер: ок');
