// HTTP API игры: POST /api/<действие>. Каждый запрос подписан Telegram (initData), игру считает сервер:
// клиент присылает только «что хочу сделать» и свои настройки, а баланс, номера и цены берутся из базы.
import { verifyInitData } from './auth.js';
import * as game from './shared/game.js';
import { fresh, applySettings } from './shared/state.js';
import { loadOrCreate, savePlayer } from './players.js';
import { CRAFT } from './shared/config.js';

const MAX_BODY = 8 * 1024;

export function corsHeaders(env, request) {
  const allowed = (env.ALLOWED_ORIGIN || '*').split(',').map((s) => s.trim());
  const origin = request.headers.get('Origin');
  const allow = allowed.includes('*') ? '*' : allowed.includes(origin) ? origin : allowed[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

const reply = (data, status, cors) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors } });

const ACTIONS = {
  state: () => ({}),
  spin(s) {
    const bailout = game.bailout(s);
    const res = game.spin(s, s.multi);
    return res.error ? { error: res.error, noSave: !bailout } : { res, bailout };
  },
  sell(s, body) {
    const id = String(body.id ?? '');
    const price = s.pending?.id === id ? game.sellPending(s) : game.sellFromCollection(s, id);
    return price ? { price } : { error: 'Номер не найден', noSave: true };
  },
  sellall(s) {
    const r = game.sellAll(s);
    return r.count ? r : { error: 'Коллекция пуста', noSave: true };
  },
  craft(s, body) {
    const ids = body.ids;
    if (!Array.isArray(ids) || ids.length !== CRAFT.COUNT || ids.some((x) => typeof x !== 'string')) return { error: `Нужно ${CRAFT.COUNT} номеров`, noSave: true };
    const res = game.craft(s, ids);
    return res.error ? { error: res.error, noSave: true } : { res };
  },
  daily(s, _body, now) {
    const bonus = game.claimDaily(s, now);
    return bonus ? { bonus } : { error: 'Бонус уже получен. Загляни позже', noSave: true };
  },
  reset(s) {
    Object.assign(s, fresh());
    return {};
  },
};

// Читает игрока, применяет действие и пишет обратно. При гонке повторяет с свежими данными.
export async function runAction(db, userId, action, body, now = Date.now()) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const rec = await loadOrCreate(db, userId, now);
    const s = rec.state;
    applySettings(s, body.settings);
    const out = ACTIONS[action](s, body, now);
    const { noSave, ...result } = out;
    // действие не прошло (мало денег и т. п.): ничего не пишем, настройки игрока всё равно запомним
    if (noSave && result.error) {
      await savePlayer(db, userId, s, rec.ver, now);
      return { ...result, state: s };
    }
    if (await savePlayer(db, userId, s, rec.ver, now)) return { ...result, state: s };
  }
  return { error: 'Сервер занят, повтори ещё раз', busy: true };
}

export async function handleApi(request, env, { store, db, now = Date.now(), waitUntil }) {
  const started = Date.now();
  const cors = corsHeaders(env, request);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  const action = new URL(request.url).pathname.replace(/^\/api\//, '');
  if (request.method !== 'POST' || !Object.hasOwn(ACTIONS, action)) return reply({ error: 'Не найдено' }, 404, cors);

  const text = await request.text();
  if (text.length > MAX_BODY) return reply({ error: 'Слишком большой запрос' }, 413, cors);
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch { return reply({ error: 'Неверный запрос' }, 400, cors); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) body = {};

  // подпись Telegram: в заголовке или в теле (из браузера шлём в теле, чтобы не было предзапроса OPTIONS)
  const auth = request.headers.get('Authorization') ?? '';
  const initData = auth.startsWith('tma ') ? auth.slice(4) : typeof body.initData === 'string' ? body.initData : '';
  const who = initData ? await verifyInitData(initData, env.BOT_TOKEN, { now }) : null;
  if (!who) return reply({ error: 'Нет доступа: открой игру через Telegram' }, 401, cors);

  const ref = typeof body.ref === 'string' && /^\d{1,15}$/.test(body.ref) ? body.ref : null;
  // запись «был в игре» не задерживает ответ игроку
  const touching = store.touch(who.user, { ref });
  if (waitUntil) waitUntil(touching.catch(() => {}));
  const out = await runAction(db, who.user.id, action, body, now);
  if (!waitUntil) await touching;
  out.ms = Date.now() - started;
  return reply(out, out.busy ? 503 : 200, cors);
}
