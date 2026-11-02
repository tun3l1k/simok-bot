// Рассылка: шлёт сообщение каждому, кто не заблокировал бота, с паузой (лимит Telegram ≈ 30 сообщений в секунду).
// send(userId) отправляет одно сообщение и бросает ошибку, если не вышло. Ошибка с кодом 403 значит «пользователь заблокировал бота».
export async function runBroadcast({ users, send, onBlocked = () => {}, onProgress = () => {}, pauseMs = 40, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const res = { total: users.length, sent: 0, blocked: 0, failed: 0 };
  for (const [i, u] of users.entries()) {
    try {
      await send(u.id);
      res.sent++;
    } catch (e) {
      const code = e?.error_code ?? e?.error?.error_code;
      if (code === 403) { res.blocked++; onBlocked(u.id); }
      else if (code === 429) {
        // Telegram просит подождать: ждём и пробуем ещё раз
        const wait = (e?.parameters?.retry_after ?? e?.error?.parameters?.retry_after ?? 3) * 1000;
        await sleep(wait);
        try { await send(u.id); res.sent++; } catch { res.failed++; }
      } else res.failed++;
    }
    if ((i + 1) % 25 === 0) onProgress({ ...res, done: i + 1 });
    await sleep(pauseMs);
  }
  return res;
}
