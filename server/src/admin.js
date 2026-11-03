// Админ-меню бота: /admin. Доступно только Telegram id из ADMIN_IDS. Worker ничего не помнит между запросами,
// поэтому «жду текст рассылки» лежит в D1 (admin_state). InlineKeyboard приходит параметром, чтобы модуль проверялся тестом без grammY.
import { displayName } from './store.js';
import { processBroadcast } from './broadcast.js';
import { editPlayer, loadPlayer } from './players.js';
import { giveCoins, giveSim, giveLuck, operators, tiers } from './grant.js';
import { formatPhone, formatMoney } from './shared/generator.js';

const fmtDate = (t) => new Date(t).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

export function registerAdmin(bot, store, { adminIds, webappUrl, chunk = 30, sleep, db }, InlineKeyboard) {
  const admins = new Set(adminIds.map(String));
  const isAdmin = (ctx) => !!ctx.from && admins.has(String(ctx.from.id));

  const panelKb = () => new InlineKeyboard()
    .text('📊 Статистика', 'adm:stats').text('📢 Рассылка', 'adm:bc').row()
    .text('👥 Новые игроки', 'adm:recent').text('🏆 Топ приглашений', 'adm:top').row()
    .text('🎁 Выдать игроку', 'adm:give').row()
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


    // ---------- Выдача игроку ----------
    const parts = ctx.callbackQuery.data.split(':');
    const target = Number(parts[2]);
    const playerCard = async (uid) => {
      const u = await store.findUser(String(uid));
      const rec = db ? await loadPlayer(db, uid) : null;
      const st = rec?.state;
      const head = `🎁 <b>${esc(displayName(u ?? { id: uid }))}</b> · id <code>${uid}</code>`;
      const body = st
        ? `\nБаланс: <b>${formatMoney(st.balance)}</b> · уровень ${st.level}\nНомеров в коллекции: ${st.collection.length}\nУдача: x2 — ${st.luck} шт., x20 — ${st.luck20} шт.`
        : '\nИгрок ещё не открывал игру: прогресс создастся при первой выдаче.';
      return { text: `${head}${body}\n\nЧто выдать?`, kb: new InlineKeyboard()
        .text('💰 Валюта', `adm:coin:${uid}`).text('📱 SIM-карта', `adm:simt:${uid}`).row()
        .text('🍀 Удача', `adm:luck:${uid}`).row()
        .text('‹ В админку', 'adm:home') };
    };
    const done = async (uid, line) => {
      const kb = new InlineKeyboard().text('Ещё этому игроку', `adm:p:${uid}`).row().text('‹ В админку', 'adm:home');
      await edit(`✅ ${line}`, kb);
      const u = await store.findUser(String(uid));
      if (u?.started && !u.blocked) bot.api.sendMessage(uid, `🎁 Тебе выдали: ${line.replace(/<[^>]+>/g, '')}`).catch(() => {});
    };
    const guard = () => { if (!db) { edit('Выдача недоступна: нет базы', backKb()); return true; } return false; };

    if (action === 'give') {
      await store.setWait(id, 'who');
      return edit('🎁 <b>Выдать игроку</b>\n\nПришли id игрока или @username (он должен хоть раз открыть игру или написать боту).', new InlineKeyboard().text('Отмена', 'adm:home'));
    }
    if (action === 'p') { await store.clearWait(id); const c = await playerCard(target); return edit(c.text, c.kb); }

    if (action === 'coin') {
      if (guard()) return;
      await store.setWait(id, `coins:${target}`);
      const kb = new InlineKeyboard();
      [10000, 100000, 1000000].forEach((n) => kb.text(`+${n.toLocaleString('ru-RU')}`, `adm:cg:${target}:${n}`));
      kb.row().text('Своя сумма: напиши число', `adm:p:${target}`).row().text('‹ Назад', `adm:p:${target}`);
      return edit('💰 <b>Выдать валюту</b>\n\nВыбери сумму или напиши число сообщением (можно с минусом, чтобы списать).', kb);
    }
    if (action === 'cg') {
      if (guard()) return;
      try { const r = await editPlayer(db, target, (s) => giveCoins(s, parts[3])); return done(target, `Выдано ${r.out.text}`); }
      catch (e) { return edit(`⚠️ ${esc(e.message)}`, backKb()); }
    }

    if (action === 'simt') {
      const kb = new InlineKeyboard();
      tiers().forEach((t) => { kb.text(t.name, `adm:simo:${target}:${t.id}`); if (t.id % 2) kb.row(); });
      kb.row().text('‹ Назад', `adm:p:${target}`);
      return edit('📱 <b>SIM-карта</b>\n\nРедкость (номер будет не ниже выбранной):', kb);
    }
    if (action === 'simo') {
      const kb = new InlineKeyboard().text('🎲 Любой оператор', `adm:simg:${target}:${parts[3]}:x`).row();
      operators().forEach((o, i) => { kb.text(o.name, `adm:simg:${target}:${parts[3]}:${i}`); if (i % 2) kb.row(); });
      kb.row().text('‹ Назад', `adm:simt:${target}`);
      return edit('📱 <b>SIM-карта</b>\n\nОператор:', kb);
    }
    if (action === 'simg') {
      if (guard()) return;
      try {
        const op = parts[4] === 'x' ? null : operators()[Number(parts[4])]?.id ?? null;
        const r = await editPlayer(db, target, (s) => giveSim(s, Number(parts[3]), op));
        const it = r.out.item;
        const extra = r.out.sold.length ? `\n(коллекция была полна: продан самый дешёвый номер)` : '';
        return done(target, `Выдана SIM ${formatPhone(it)} за ${formatMoney(it.price)}${extra}`);
      } catch (e) { return edit(`⚠️ ${esc(e.message)}`, backKb()); }
    }

    if (action === 'luck') {
      return edit('🍀 <b>Удача</b>\n\nКакой заряд выдать?', new InlineKeyboard()
        .text('Удача x2', `adm:lg:${target}:x2`).text('Удача x20', `adm:lg:${target}:x20`).row().text('‹ Назад', `adm:p:${target}`));
    }
    if (action === 'lg') {
      if (guard()) return;
      const r = await editPlayer(db, target, (s) => giveLuck(s, parts[3]));
      return done(target, `Выдан ${r.out.text}`);
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

  // Текст от админа: сообщение для рассылки, поиск игрока для выдачи или своя сумма
  bot.on('message', async (ctx, next) => {
    if (!isAdmin(ctx)) return next();
    const w = await store.getWait(ctx.from.id);
    if (!w || ctx.message.text?.startsWith('/')) return next();

    if (w.step === 'who') {
      const u = await store.findUser(ctx.message.text);
      if (!u) return ctx.reply('Не нашёл такого игрока. Пришли числовой id или @username того, кто уже открывал игру.');
      await store.clearWait(ctx.from.id);
      const rec = db ? await loadPlayer(db, u.id) : null;
      const st = rec?.state;
      await ctx.reply(`🎁 <b>${esc(displayName(u))}</b> · id <code>${u.id}</code>\n${st ? `Баланс: <b>${formatMoney(st.balance)}</b> · уровень ${st.level} · номеров ${st.collection.length}` : 'Прогресса в игре ещё нет'}\n\nЧто выдать?`, {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard().text('💰 Валюта', `adm:coin:${u.id}`).text('📱 SIM-карта', `adm:simt:${u.id}`).row().text('🍀 Удача', `adm:luck:${u.id}`).row().text('‹ В админку', 'adm:home'),
      });
      return;
    }

    if (w.step.startsWith('coins:')) {
      if (!db) return next();
      const uid = Number(w.step.split(':')[1]);
      const n = Number(String(ctx.message.text ?? '').replace(/[\s_]/g, '').replace(',', '.'));
      try {
        const r = await editPlayer(db, uid, (s) => giveCoins(s, n));
        await store.clearWait(ctx.from.id);
        await ctx.reply(`✅ Выдано ${r.out.text}`, { reply_markup: new InlineKeyboard().text('Ещё этому игроку', `adm:p:${uid}`).row().text('‹ В админку', 'adm:home') });
        const u = await store.findUser(String(uid));
        if (u?.started && !u.blocked) bot.api.sendMessage(uid, `🎁 Тебе выдали: ${r.out.text}`).catch(() => {});
      } catch (e) { await ctx.reply(`⚠️ ${e.message}. Пришли число ещё раз.`); }
      return;
    }

    if (w.step !== 'text') return next();
    await store.setWait(ctx.from.id, 'confirm', ctx.chat.id, ctx.message.message_id);
    await ctx.reply('Так увидят игроки (сообщение выше). Отправить?', {
      reply_parameters: { message_id: ctx.message.message_id },
      reply_markup: new InlineKeyboard().text(`Отправить ${await store.reachableCount()} игрокам`, 'adm:bcsend').row().text('Отмена', 'adm:home'),
    });
  });
}
