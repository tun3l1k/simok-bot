import { Bot, InlineKeyboard } from 'grammy';

const { BOT_TOKEN, WEBAPP_URL } = process.env;
if (!BOT_TOKEN || !WEBAPP_URL) {
  console.error('Заполни BOT_TOKEN и WEBAPP_URL в файле .env (см. .env.example)');
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);
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
await bot.api.setChatMenuButton({
  menu_button: { type: 'web_app', text: 'Играть', web_app: { url: WEBAPP_URL } },
});

bot.catch((err) => console.error('Ошибка бота:', err.error ?? err));
bot.start({ onStart: (me) => console.log(`Бот @${me.username} запущен`) });
