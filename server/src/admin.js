// Админ-меню бота: /admin. Доступно только Telegram id из ADMIN_IDS. Worker ничего не помнит между запросами,
// поэтому «жду текст рассылки» лежит в D1 (admin_state). InlineKeyboard приходит параметром, чтобы модуль проверялся тестом без grammY.
import { displayName } from './store.js';
import { processBroadcast } from './broadcast.js';

const fmtDate = (t) => new Date(t).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

export function registerAdmin(bot, store, { adminIds, webappUrl, chunk = 30, sleep }, InlineKeyboard) {
  const admins = new Set(adminIds.map(String));
  const isAdmin = (ctx) => !!ctx.from && admins.has(String(ctx.from.id));

  const panelKb = () => new InlineKeyboard()
    .text('📊 Статистика', 'adm:stats').text('📢 Рассылка', 'adm:bc').row()
    .text('👥 Новые игроки', 'adm:recent').text('🏆 Топ приглашений', 'adm:top').row()
    .webApp('🎮 Открыть игру', webappUrl);
  const backKb = () => new InlineKeyboard().text('‹ В админку', 'adm:home');

  const panelText = async () => {
    const s = await store.stats();
    return `🛠 <b>Админка SimOk</b>\n\nИгроков: <b>${s.total}</b> · заходили за сутки: <b>${s.active24h}</b>\nНовых за сутки: <b>${s.new24h}</b>`;
  };

  bot.command('admin', async (ctx) => {
    if (!isAdmin(ctx)) return; // чужим не отвечаем вовсе
    await store.clearWait(ctx.from.id);
    await ctx.reply(await panelText(), { parse_mode: 'HTML', reply_markup: panelKb() });
  });

  bot.callbackQuery(/^adm:/, async (ctx) => {
    if (!isAdmin(ctx)) return ctx.answerCallbackQuery({ text: 'Нет доступа', show_alert: true });
    const action = ctx.callbackQuery.data.split(':')[1];
    const id = ctx.from.id;
    const edit = (text, kb) => ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: kb }).catch(() => {});
    await ctx.answerCallbackQuery();

    if (action === 'home') { await store.clearWait(id); return edit(await panelText(), panelKb()); }

    if (action === 'stats') {
      const s = await store.stats();
      return edit(
        `📊 <b>Статистика</b>\n\nВсего игроков: <b>${s.total}</b>\nЗаходили за 24 часа: <b>${s.active24h}</b>\nЗаходили за 7 дней: <b>${s.active7d}</b>\n` +
        `Новых за 24 часа: <b>${s.new24h}</b>\nНовых за 7 дней: <b>${s.new7d}</b>\nПришли по приглашению: <b>${s.invited}</b>\nЗаблокировали бота: <b>${s.blocked}</b>\n\n` +
        '<i>Считаются все, кто открывал игру или писал боту. Рассылка идёт только тем, кто писал боту.</i>',
        backKb());
    }

    if (action === 'recent') {
      const rows = (await store.recent(10)).map((u) => `${fmtDate(u.joined)} · ${esc(displayName(u))}${u.ref ? ' · по приглашению' : ''}`);
      return edit(`👥 <b>Новые игроки</b>\n\n${rows.join('\n') || 'Пока никого'}`, backKb());
    }

    if (action === 'top') {
      const rows = (await store.topInviters(10)).map((r, i) => `${i + 1}. ${esc(displayName(r.user ?? { id: r.id }))} — ${r.invited}`);
      return edit(`🏆 <b>Топ приглашений</b>\n\n${rows.join('\n') || 'Приглашений пока нет'}`, backKb());
    }

    if (action === 'bc') {
      await store.setWait(id, 'text');
      return edit(`📢 <b>Рассылка</b>\n\nПришли сообщение, которое получат <b>${await store.reachableCount()}</b> игроков. Подойдёт текст, картинка с подписью или пост целиком.\nОтмена: кнопка ниже.`,
        new InlineKeyboard().text('Отмена', 'adm:home'));
    }

    if (action === 'bcsend') {
      const w = await store.getWait(id);
      if (w?.step !== 'confirm') return;
      if (await store.activeBroadcast()) return ctx.reply('Рассылка уже идёт, дождись окончания.');
      await store.clearWait(id);
      const total = await store.reachableCount();
      const status = await ctx.reply(`📢 Отправляю… 0 из ${total}`);
      const jobId = await store.createBroadcast({ chatId: w.chat_id, messageId: w.message_id, statusChat: status.chat.id, statusMsg: status.message_id, total });
      // первая порция уходит сразу, остальное доделает cron (см. scheduled в index.js)
      await processBroadcast({ store, api: bot.api, job: await store.getBroadcast(jobId), chunk, sleep });
    }
  });

  // Сообщение для рассылки: ждём его после кнопки «Рассылка», показываем предпросмотр и просим подтвердить
  bot.on('message', async (ctx, next) => {
    if (!isAdmin(ctx)) return next();
    const w = await store.getWait(ctx.from.id);
    if (w?.step !== 'text' || ctx.message.text?.startsWith('/')) return next();
    await store.setWait(ctx.from.id, 'confirm', ctx.chat.id, ctx.message.message_id);
    await ctx.reply('Так увидят игроки (сообщение выше). Отправить?', {
      reply_parameters: { message_id: ctx.message.message_id },
      reply_markup: new InlineKeyboard().text(`Отправить ${await store.reachableCount()} игрокам`, 'adm:bcsend').row().text('Отмена', 'adm:home'),
    });
  });
}
