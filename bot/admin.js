// Админ-меню бота: /admin. Доступно только пользователям из ADMIN_IDS (в .env, через запятую).
// InlineKeyboard приходит параметром, чтобы модуль проверялся тестом без установленного grammY.
import { displayName } from './store.js';
import { runBroadcast } from './broadcast.js';

const fmtDate = (t) => new Date(t).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

export function registerAdmin(bot, store, { adminIds, webappUrl }, InlineKeyboard) {
  const admins = new Set(adminIds.map(String));
  const isAdmin = (ctx) => !!ctx.from && admins.has(String(ctx.from.id));
  const waiting = new Map(); // adminId → { step: 'text' } | { step: 'confirm', chatId, messageId }
  let sending = false;

  const panelKb = () => new InlineKeyboard()
    .text('📊 Статистика', 'adm:stats').text('📢 Рассылка', 'adm:bc').row()
    .text('👥 Новые игроки', 'adm:recent').text('🏆 Топ приглашений', 'adm:top').row()
    .webApp('🎮 Открыть игру', webappUrl);
  const backKb = () => new InlineKeyboard().text('‹ В админку', 'adm:home');

  const panelText = () => {
    const s = store.stats();
    return `🛠 <b>Админка SimOk</b>\n\nИгроков: <b>${s.total}</b> · заходили за сутки: <b>${s.active24h}</b>\nНовых за сутки: <b>${s.new24h}</b>`;
  };

  bot.command('admin', async (ctx) => {
    if (!isAdmin(ctx)) return; // чужим не отвечаем вовсе
    waiting.delete(String(ctx.from.id));
    await ctx.reply(panelText(), { parse_mode: 'HTML', reply_markup: panelKb() });
  });

  bot.callbackQuery(/^adm:/, async (ctx) => {
    if (!isAdmin(ctx)) return ctx.answerCallbackQuery({ text: 'Нет доступа', show_alert: true });
    const [, action] = ctx.callbackQuery.data.split(':');
    const id = String(ctx.from.id);
    const edit = (text, kb) => ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: kb }).catch(() => {});
    await ctx.answerCallbackQuery();

    if (action === 'home') { waiting.delete(id); return edit(panelText(), panelKb()); }

    if (action === 'stats') {
      const s = store.stats();
      return edit(
        `📊 <b>Статистика</b>\n\nВсего игроков: <b>${s.total}</b>\nЗаходили за 24 часа: <b>${s.active24h}</b>\nЗаходили за 7 дней: <b>${s.active7d}</b>\n` +
        `Новых за 24 часа: <b>${s.new24h}</b>\nНовых за 7 дней: <b>${s.new7d}</b>\nПришли по приглашению: <b>${s.invited}</b>\nЗаблокировали бота: <b>${s.blocked}</b>\n\n` +
        '<i>Считаются заходы в бота (/start и сообщения). Прогресс игры хранится у игроков на телефоне.</i>',
        backKb());
    }

    if (action === 'recent') {
      const rows = store.recent(10).map((u) => `${fmtDate(u.joined)} · ${esc(displayName(u))}${u.ref ? ' · по приглашению' : ''}`);
      return edit(`👥 <b>Новые игроки</b>\n\n${rows.join('\n') || 'Пока никого'}`, backKb());
    }

    if (action === 'top') {
      const rows = store.topInviters(10).map((r, i) => `${i + 1}. ${esc(displayName(r.user ?? { id: r.id }))} — ${r.invited}`);
      return edit(`🏆 <b>Топ приглашений</b>\n\n${rows.join('\n') || 'Приглашений пока нет'}`, backKb());
    }

    if (action === 'bc') {
      waiting.set(id, { step: 'text' });
      return edit(`📢 <b>Рассылка</b>\n\nПришли сообщение, которое получат <b>${store.reachable().length}</b> игроков. Подойдёт текст, картинка с подписью или пост целиком.\nОтмена: кнопка ниже.`,
        new InlineKeyboard().text('Отмена', 'adm:home'));
    }

    if (action === 'bcsend') {
      const w = waiting.get(id);
      if (w?.step !== 'confirm') return;
      if (sending) return ctx.reply('Рассылка уже идёт, дождись окончания.');
      waiting.delete(id);
      sending = true;
      const users = store.reachable();
      const status = await ctx.reply(`📢 Отправляю… 0 из ${users.length}`);
      try {
        const res = await runBroadcast({
          users,
          send: (uid) => bot.api.copyMessage(uid, w.chatId, w.messageId),
          onBlocked: (uid) => store.markBlocked(uid),
          onProgress: (p) => bot.api.editMessageText(status.chat.id, status.message_id, `📢 Отправляю… ${p.done} из ${users.length}`).catch(() => {}),
        });
        store.flush();
        await bot.api.editMessageText(status.chat.id, status.message_id,
          `✅ Рассылка завершена\nДоставлено: ${res.sent}\nЗаблокировали бота: ${res.blocked}\nОшибок: ${res.failed}`, { reply_markup: backKb() });
      } finally { sending = false; }
    }
  });

  // Сообщение для рассылки: ждём его после кнопки «Рассылка», показываем предпросмотр и просим подтвердить
  bot.on('message', async (ctx, next) => {
    const id = String(ctx.from?.id);
    const w = waiting.get(id);
    if (!isAdmin(ctx) || w?.step !== 'text' || ctx.message.text?.startsWith('/')) return next();
    waiting.set(id, { step: 'confirm', chatId: ctx.chat.id, messageId: ctx.message.message_id });
    await ctx.reply('Так увидят игроки (сообщение выше). Отправить?', {
      reply_parameters: { message_id: ctx.message.message_id },
      reply_markup: new InlineKeyboard().text(`Отправить ${store.reachable().length} игрокам`, 'adm:bcsend').row().text('Отмена', 'adm:home'),
    });
  });
}
