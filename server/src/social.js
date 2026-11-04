// Друзья (приглашения) и рейтинг. Всё читается из D1, игровое состояние не меняется.
import { CONFIG } from './shared/config.js';
import { editPlayer } from './players.js';

export async function friends(db, userId) {
  const rows = (await db.prepare(
    `SELECT u.name, u.username, u.joined, json_extract(p.state, '$.refPaid') AS paid
     FROM users u LEFT JOIN players p ON p.id = u.id WHERE u.ref = ? ORDER BY u.joined DESC LIMIT 30`).bind(String(userId)).all()).results;
  return { friends: rows.map((r) => ({ name: r.name || r.username || 'Игрок', joined: r.joined, paid: !!r.paid })) };
}

const WEALTH = `(json_extract(p.state, '$.balance') + COALESCE((SELECT SUM(json_extract(j.value, '$.price')) FROM json_each(p.state, '$.collection') j), 0))`;
const BOARDS = {
  wealth: { score: WEALTH, label: 'Богатство' },
  level: { score: `(json_extract(p.state, '$.level') * 1000000 + json_extract(p.state, '$.xp'))`, label: 'Уровень' },
};

export async function top(db, userId, board = 'wealth') {
  const b = BOARDS[board] ?? BOARDS.wealth;
  const rows = (await db.prepare(
    `SELECT p.id AS id, u.name AS name, u.username AS username, ${b.score} AS score, json_extract(p.state, '$.level') AS level
     FROM players p JOIN users u ON u.id = p.id ORDER BY score DESC, p.id LIMIT 20`).all()).results;
  const mine = await db.prepare(`SELECT ${b.score} AS score FROM players p WHERE p.id = ?`).bind(userId).first();
  let rank = null;
  if (mine) rank = ((await db.prepare(`SELECT COUNT(*) AS n FROM players p WHERE ${b.score} > ?`).bind(mine.score).first()).n) + 1;
  return {
    board: BOARDS[board] ? board : 'wealth',
    top: rows.map((r, i) => ({ place: i + 1, name: r.name || r.username || 'Игрок', level: r.level, score: board === 'level' ? null : r.score, me: r.id === userId })),
    me: mine ? { rank, score: board === 'level' ? null : mine.score } : null,
  };
}

// Награда за приглашение: когда друг прокрутил REF.SPINS раз, деньги получают оба. Возвращает {bonus, state} или null.
export async function payReferral(db, store, userId, now) {
  const u = await store.get(userId);
  const refId = u?.ref ? Number(u.ref) : null;
  const inviter = refId && refId !== userId ? await store.get(refId) : null;
  const R = CONFIG.REF;
  const r = await editPlayer(db, userId, (s) => {
    if (s.refPaid) return null;
    s.refPaid = true;
    if (inviter) s.balance += R.INVITEE;
    return { paid: !!inviter };
  }, now);
  if (!r.out) return null;
  if (!r.out.paid) return { bonus: 0, state: r.state };
  await editPlayer(db, inviter.id, (s) => { s.balance += R.INVITER; s.luck += R.LUCK; s.refCount++; s.refEarned += R.INVITER; }, now);
  return { bonus: R.INVITEE, state: r.state, inviter };
}
