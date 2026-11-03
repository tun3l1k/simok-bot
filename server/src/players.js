// Прогресс игрока в D1. Запись проходит, только если за это время никто другой не менял игрока (ver совпадает).
import { fresh, sanitize } from './shared/state.js';

export async function loadPlayer(db, id) {
  const r = await db.prepare('SELECT state, ver FROM players WHERE id = ?').bind(id).first();
  return r ? { state: sanitize(JSON.parse(r.state)), ver: r.ver } : null;
}

export async function savePlayer(db, id, state, ver, now) {
  const r = await db.prepare('UPDATE players SET state = ?, ver = ver + 1, updated = ? WHERE id = ? AND ver = ?')
    .bind(JSON.stringify(state), now, id, ver).run();
  return r.meta.changes === 1;
}

export async function loadOrCreate(db, id, now) {
  let rec = await loadPlayer(db, id);
  if (!rec) {
    await db.prepare('INSERT OR IGNORE INTO players (id, state, ver, updated) VALUES (?, ?, 0, ?)').bind(id, JSON.stringify(fresh()), now).run();
    rec = await loadPlayer(db, id);
  }
  return rec;
}

// Изменить игрока функцией fn(state) (так работает и админка). При гонке повторяет со свежими данными.
export async function editPlayer(db, id, fn, now = Date.now()) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const rec = await loadOrCreate(db, id, now);
    const out = fn(rec.state);
    if (await savePlayer(db, id, rec.state, rec.ver, now)) return { out, state: rec.state };
  }
  throw new Error('Игрок сейчас занят, повтори ещё раз');
}
