// Cloudflare Worker: API игры (/api/*), Telegram-бот через webhook (/bot) и cron для рассылок.
import { Bot, InlineKeyboard, webhookCallback } from 'grammy';
import { createStore } from './store.js';
import { handleApi } from './api.js';
import { registerAdmin } from './admin.js';
import { processBroadcast } from './broadcast.js';

const adminIdsOf = (env) => (env.ADMIN_IDS || '').split(',').map((x) => x.trim()).filter(Boolean);
const text = (body, status = 200) => new Response(body, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

let cache = null; // бот живёт, пока живёт запущенный экземпляр Worker, и не пересоздаётся на каждый запрос
function getBot(env) {
  if (cache?.token === env.BOT_TOKEN) return cache;
  const store = createStore(env.DB);
  const bot = new Bot(env.BOT_TOKEN);
  const gameUrl = (ref) => (ref ? `${env.WEBAPP_URL}?ref=${encodeURIComponent(ref)}` : env.WEBAPP_URL);

  // Запоминаем каждого, кто пишет боту; /start ref_ID учитывает, кто пригласил
  bot.use(async (ctx, next) => {
    if (ctx.from && !ctx.from.is_bot && ctx.chat?.type === 'private') {
      const m = ctx.message?.text?.match(/^\/start\s+ref_(\d+)/);
      await store.touch(ctx.from, { ref: m ? m[1] : null, started: true });
    }
    await next();
  });
  bot.on('my_chat_member', async (ctx) => {
    if (ctx.chat.type !== 'private') return;
    const st = ctx.myChatMember.new_chat_member.status;
    if (st === 'kicked') await store.markBlocked(ctx.chat.id, true);
    else if (st === 'member') await store.markBlocked(ctx.chat.id, false);
  });
  registerAdmin(bot, store, { adminIds: adminIdsOf(env), webappUrl: env.WEBAPP_URL, chunk: 25 }, InlineKeyboard);

  bot.command('start', (ctx) => {
    const payload = (ctx.match || '').trim();
    const ref = payload.startsWith('ref_') ? payload.slice(4) : null;
    return ctx.reply('Крути SIM-карты, собирай красивые номера и продавай их.\nЖми «Играть».',
      { reply_markup: new InlineKeyboard().webApp('Играть', gameUrl(ref)) });
  });
  bot.command('help', (ctx) => ctx.reply('Выпадает случайная SIM-карта. Чем красивее номер, тем она дороже. Следующая крутка отправит её в коллекцию, а можно продать сразу.'));
  bot.catch((err) => console.error('Ошибка бота:', err.error ?? err));

  cache = { token: env.BOT_TOKEN, bot, store, handle: webhookCallback(bot, 'cloudflare-mod', { secretToken: env.WEBHOOK_SECRET }) };
  return cache;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return handleApi(request, env, { store: createStore(env.DB), db: env.DB, waitUntil: (p) => ctx.waitUntil(p) });

    if (url.pathname === '/bot' && request.method === 'POST') return getBot(env).handle(request);

    // Разовая настройка после деплоя: открой в браузере https://<worker>/setup/<WEBHOOK_SECRET>
    if (env.WEBHOOK_SECRET && url.pathname === `/setup/${env.WEBHOOK_SECRET}`) {
      const { bot } = getBot(env);
      const base = [{ command: 'start', description: 'Открыть игру' }, { command: 'help', description: 'Как играть' }];
      await bot.api.setWebhook(`${url.origin}/bot`, { secret_token: env.WEBHOOK_SECRET, allowed_updates: ['message', 'callback_query', 'my_chat_member'] });
      await bot.api.setMyCommands(base);
      await bot.api.setChatMenuButton({ menu_button: { type: 'web_app', text: 'Играть', web_app: { url: env.WEBAPP_URL } } });
      for (const id of adminIdsOf(env)) {
        await bot.api.setMyCommands([...base, { command: 'admin', description: 'Админка' }], { scope: { type: 'chat', chat_id: Number(id) } }).catch(() => {});
      }
      return text(`Готово. Webhook: ${url.origin}/bot\nАдмины: ${adminIdsOf(env).join(', ') || 'не заданы (ADMIN_IDS)'}`);
    }
    return text('SimOk server');
  },

  // Раз в минуту продолжает рассылку, если она не уместилась в один запуск
  async scheduled(_event, env) {
    const { bot, store } = getBot(env);
    const job = await store.activeBroadcast();
    if (job) await processBroadcast({ store, api: bot.api, job, chunk: Number(env.BROADCAST_CHUNK) || 40 });
  },
};
