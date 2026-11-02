// Хранилище игроков бота: простой JSON-файл (для сотен и тысяч пользователей хватает).
// Хранится, кто нажимал /start, когда заходил в бота, кто кого пригласил и кто заблокировал бота.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const DAY = 86400e3;

export function openStore(file, now = () => Date.now()) {
  let users = {};
  try { if (existsSync(file)) users = JSON.parse(readFileSync(file, 'utf8')).users ?? {}; } catch { users = {}; }

  let timer = null;
  const flush = () => {
    timer = null;
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(`${file}.tmp`, JSON.stringify({ users }));
    renameSync(`${file}.tmp`, file); // запись целиком, чтобы файл не побился при сбое
  };
  const save = () => { if (!timer) { timer = setTimeout(flush, 500); timer.unref?.(); } };

  return {
    flush,
    // Записывает/обновляет игрока. ref — id пригласившего, учитывается только при первой записи.
    touch(from, ref = null) {
      const id = String(from.id);
      const t = now();
      const u = users[id];
      if (!u) {
        users[id] = { id: from.id, name: from.first_name ?? '', username: from.username ?? '', joined: t, seen: t, ref: ref && ref !== id ? ref : null, blocked: false };
      } else {
        u.seen = t; u.blocked = false;
        u.name = from.first_name ?? u.name; u.username = from.username ?? u.username;
      }
      save();
      return users[id];
    },
    markBlocked(id, blocked = true) {
      const u = users[String(id)];
      if (u && u.blocked !== blocked) { u.blocked = blocked; save(); }
    },
    get: (id) => users[String(id)],
    all: () => Object.values(users),
    // Кому можно писать: тем, кто не заблокировал бота
    reachable: () => Object.values(users).filter((u) => !u.blocked),
    stats() {
      const t = now();
      const list = Object.values(users);
      const since = (ms) => list.filter((u) => t - u.seen < ms).length;
      return {
        total: list.length,
        blocked: list.filter((u) => u.blocked).length,
        active24h: since(DAY),
        active7d: since(7 * DAY),
        new24h: list.filter((u) => t - u.joined < DAY).length,
        new7d: list.filter((u) => t - u.joined < 7 * DAY).length,
        invited: list.filter((u) => u.ref).length,
      };
    },
    recent: (n = 10) => Object.values(users).sort((a, b) => b.joined - a.joined).slice(0, n),
    topInviters(n = 10) {
      const count = {};
      for (const u of Object.values(users)) if (u.ref) count[u.ref] = (count[u.ref] ?? 0) + 1;
      return Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, n)
        .map(([id, invited]) => ({ id, invited, user: users[id] ?? null }));
    },
  };
}

export const displayName = (u) => (u?.username ? `@${u.username}` : u?.name || `id ${u?.id ?? '?'}`);
