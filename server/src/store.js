// Хранилище в D1: игроки, прогресс, рассылки, состояние админа. D1 — SQLite в облаке Cloudflare.
const DAY = 86400e3;

export function createStore(db, now = () => Date.now()) {
  const q = (sql, ...args) => db.prepare(sql).bind(...args);
  return {
    // Записывает или обновляет игрока. ref запоминается только при первой записи, сам себя пригласить нельзя.
    // started: человек написал боту, значит, ему можно слать сообщения.
    async touch(from, { ref = null, started = false } = {}) {
      const t = now();
      const r = ref && String(ref) !== String(from.id) ? String(ref) : null;
      await q(
        `INSERT INTO users (id, name, username, joined, seen, ref, started, blocked) VALUES (?1, ?2, ?3, ?4, ?4, ?5, ?6, 0)
         ON CONFLICT(id) DO UPDATE SET seen = ?4, name = ?2, username = ?3,
           started = MAX(started, ?6), blocked = CASE WHEN ?6 = 1 THEN 0 ELSE blocked END`,
        from.id, from.first_name ?? '', from.username ?? '', t, r, started ? 1 : 0,
      ).run();
    },
    async markBlocked(id, blocked = true) {
      await q('UPDATE users SET blocked = ? WHERE id = ?', blocked ? 1 : 0, id).run();
    },
    async get(id) { return q('SELECT * FROM users WHERE id = ?', id).first(); },
    // игрок по числовому id или @username
    async findUser(text) {
      const t = String(text ?? '').trim().replace(/^@/, '');
      if (/^\d{1,15}$/.test(t)) return q('SELECT * FROM users WHERE id = ?', Number(t)).first();
      if (!/^[A-Za-z0-9_]{3,32}$/.test(t)) return null;
      return q('SELECT * FROM users WHERE lower(username) = lower(?)', t).first();
    },
    async stats() {
      const t = now();
      const r = await q(
        `SELECT COUNT(*) AS total, SUM(blocked) AS blocked, SUM(seen > ?1) AS active24h, SUM(seen > ?2) AS active7d,
                SUM(joined > ?1) AS new24h, SUM(joined > ?2) AS new7d, SUM(ref IS NOT NULL) AS invited
         FROM users`, t - DAY, t - 7 * DAY).first();
      return Object.fromEntries(Object.entries(r ?? {}).map(([k, v]) => [k, v ?? 0]));
    },
    async recent(n = 10) {
      return (await q('SELECT * FROM users ORDER BY joined DESC LIMIT ?', n).all()).results;
    },
    async topInviters(n = 10) {
      const rows = (await q(
        `SELECT u.ref AS id, COUNT(*) AS invited, p.name AS name, p.username AS username
         FROM users u LEFT JOIN users p ON p.id = CAST(u.ref AS INTEGER)
         WHERE u.ref IS NOT NULL GROUP BY u.ref ORDER BY invited DESC LIMIT ?`, n).all()).results;
      return rows.map((r) => ({ id: r.id, invited: r.invited, user: r.name !== null ? { id: r.id, name: r.name, username: r.username } : null }));
    },
    async reachableCount() {
      return (await q('SELECT COUNT(*) AS n FROM users WHERE started = 1 AND blocked = 0').first()).n;
    },
    async reachablePage(after, limit) {
      return (await q('SELECT id FROM users WHERE started = 1 AND blocked = 0 AND id > ? ORDER BY id LIMIT ?', after, limit).all()).results;
    },

    // --- что админ делает сейчас ---
    async setWait(adminId, step, chatId = null, messageId = null) {
      await q('INSERT OR REPLACE INTO admin_state (admin_id, step, chat_id, message_id) VALUES (?, ?, ?, ?)', adminId, step, chatId, messageId).run();
    },
    async getWait(adminId) { return q('SELECT * FROM admin_state WHERE admin_id = ?', adminId).first(); },
    async clearWait(adminId) { await q('DELETE FROM admin_state WHERE admin_id = ?', adminId).run(); },

    // --- рассылки ---
    async createBroadcast({ chatId, messageId, statusChat, statusMsg, total }) {
      const r = await q(
        'INSERT INTO broadcasts (chat_id, message_id, status_chat, status_msg, total, created) VALUES (?, ?, ?, ?, ?, ?)',
        chatId, messageId, statusChat, statusMsg, total, now()).run();
      return r.meta.last_row_id;
    },
    async activeBroadcast() { return q("SELECT * FROM broadcasts WHERE status = 'running' ORDER BY id LIMIT 1").first(); },
    async getBroadcast(id) { return q('SELECT * FROM broadcasts WHERE id = ?', id).first(); },
    async updateBroadcast(id, p) {
      await q('UPDATE broadcasts SET cursor = ?, sent = ?, blocked = ?, failed = ?, status = ? WHERE id = ?',
        p.cursor, p.sent, p.blocked, p.failed, p.status, id).run();
    },
  };
}

export const displayName = (u) => (u?.username ? `@${u.username}` : u?.name || `id ${u?.id ?? '?'}`);
