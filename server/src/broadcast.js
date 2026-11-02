// Рассылка. У Worker есть лимит запросов на один запуск, поэтому сообщения уходят порциями (chunk),
// а продолжает рассылку cron раз в минуту. Telegram разрешает около 30 сообщений в секунду.
export async function runBroadcast({ users, send, onBlocked = () => {}, pauseMs = 40, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const res = { total: users.length, sent: 0, blocked: 0, failed: 0 };
  for (const u of users) {
    try {
      await send(u.id);
      res.sent++;
    } catch (e) {
      const code = e?.error_code ?? e?.error?.error_code;
      if (code === 403) { res.blocked++; onBlocked(u.id); }
      else if (code === 429) {
        // Telegram просит подождать (но не больше пары секунд, иначе оставим на следующий запуск): пробуем ещё раз
        const wait = Math.min((e?.parameters?.retry_after ?? 3), 5) * 1000;
        await sleep(wait);
        try { await send(u.id); res.sent++; } catch { res.failed++; }
      } else res.failed++;
    }
    await sleep(pauseMs);
  }
  return res;
}

// Обрабатывает одну порцию активной рассылки и обновляет сообщение с прогрессом
export async function processBroadcast({ store, api, job, chunk = 30, pauseMs = 40, sleep }) {
  const users = await store.reachablePage(job.cursor, chunk);
  const blockedIds = [];
  const res = await runBroadcast({
    users, pauseMs, sleep,
    send: (id) => api.copyMessage(id, job.chat_id, job.message_id),
    onBlocked: (id) => blockedIds.push(id),
  });
  for (const id of blockedIds) await store.markBlocked(id);
  const done = users.length < chunk;
  const next = {
    cursor: users.length ? users[users.length - 1].id : job.cursor,
    sent: job.sent + res.sent, blocked: job.blocked + res.blocked, failed: job.failed + res.failed,
    status: done ? 'done' : 'running',
  };
  await store.updateBroadcast(job.id, next);
  if (job.status_chat) {
    const text = done
      ? `✅ Рассылка завершена\nДоставлено: ${next.sent}\nЗаблокировали бота: ${next.blocked}\nОшибок: ${next.failed}`
      : `📢 Отправляю… ${next.sent + next.blocked + next.failed} из ${job.total}`;
    await api.editMessageText(job.status_chat, job.status_msg, text).catch(() => {});
  }
  return { ...job, ...next };
}
