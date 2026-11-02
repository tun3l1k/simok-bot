import { Bot, InlineKeyboard } from 'grammy';
import { openStore } from './store.js';
import { registerAdmin } from './admin.js';

const { BOT_TOKEN, WEBAPP_URL } = process.env;
if (!BOT_TOKEN || !WEBAPP_URL) {
  console.error('Заполни BOT_TOKEN и WEBAPP_URL в файле .env (см. .env.example)');
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);
const store = openStore(process.env.DATA_FILE || new URL('../data/users.json', import.meta.url).pathname);
const adminIds = (process.env.ADMIN_IDS || '').split(',').map((x) => x.trim()).filter(Boolean);
if (!adminIds.length) console.warn('ADMIN_IDS пуст: админ-меню (/admin) никому не доступно. Впиши свой Telegram id в .env');

// Запоминаем каждого, кто пишет боту; /start ref_ID учитывает, кто пригласил
bot.use(async (ctx, next) => {
  if (ctx.from && !ctx.from.is_bot && ctx.chat?.type === 'private') {
    const m = ctx.message?.text?.match(/^\/start\s+ref_(\d+)/);
    store.touch(ctx.from, m ? m[1] : null);
  }
  await next();
});
// Игрок заблокировал или вернул бота
bot.on('my_chat_member', (ctx) => {
  if (ctx.chat.type !== 'private') return;
  const st = ctx.myChatMember.new_chat_member.status;
  if (st === 'kicked') store.markBlocked(ctx.chat.id, true);
  else if (st === 'member') store.markBlocked(ctx.chat.id, false);
});
registerAdmin(bot, store, { adminIds, webappUrl: WEBAPP_URL }, InlineKeyboard);
const gameUrl = (ref) => (ref ? `${WEBAPP_URL}?ref=${encodeURIComponent(ref)}` : WEBAPP_URL);

bot.command('start', async (ctx) => {
  const payload = (ctx.match || '').trim();
  const ref = payload.startsWith('ref_') ? payload.slice(4) : null;
  await ctx.reply(
    'Крути SIM-карты, собирай красивые номера и продавай их.\nЖми «Играть».',
    { reply_markup: new InlineKeyboard().webApp('Играть', gameUrl(ref)) },
  );
});

bot.command('help', (ctx) =>
  ctx.reply('Выпадает случайная SIM-карта. Чем красивее номер, тем она дороже. Оставь её в коллекции или продай и крути дальше.'),
);

await bot.api.setMyCommands([
  { command: 'start', description: 'Открыть игру' },
  { command: 'help', description: 'Как играть' },
]);
// Команда /admin видна только админам
for (const id of adminIds) {
  await bot.api.setMyCommands(
    [{ command: 'start', description: 'Открыть игру' }, { command: 'help', description: 'Как играть' }, { command: 'admin', description: 'Админка' }],
    { scope: { type: 'chat', chat_id: Number(id) } },
  ).catch(() => {});
}
await bot.api.setChatMenuButton({
  menu_button: { type: 'web_app', text: 'Играть', web_app: { url: WEBAPP_URL } },
});

bot.catch((err) => console.error('Ошибка бота:', err.error ?? err));
process.on('SIGINT', () => { store.flush(); process.exit(0); });
process.on('SIGTERM', () => { store.flush(); process.exit(0); });
bot.start({ onStart: (me) => console.log(`Бот @${me.username} запущен`) });
