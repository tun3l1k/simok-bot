// Рынок между игроками: номера выставляются на сервере, покупка идёт через захват лота (UPDATE … WHERE status='open'),
// поэтому один лот не купят дважды. Комиссия берётся с продавца.
import { CONFIG } from './shared/config.js';
import * as game from './shared/game.js';
import { editPlayer, loadOrCreate } from './players.js';

class Refuse extends Error {}
const M = CONFIG.MARKET;
const fee = (price) => Math.ceil(price * M.FEE);

const stateOf = async (db, id, now) => (await loadOrCreate(db, id, now)).state;
const refuse = async (db, id, msg, now) => ({ error: msg, state: await stateOf(db, id, now) });
const dto = (r, me) => ({ id: r.id, price: r.price, tier: r.tier, item: JSON.parse(r.item), seller: r.sname || r.susername || 'Игрок', mine: r.seller === me, created: r.created });

export async function browse(db, userId, body) {
  const tier = Number.isInteger(body.tier) ? body.tier : null;
  const sort = body.sort === 'new' ? 'l.created DESC' : 'l.price ASC';
  const rows = (await db.prepare(
    `SELECT l.*, u.name AS sname, u.username AS susername FROM listings l LEFT JOIN users u ON u.id = l.seller
     WHERE l.status = 'open' AND (?1 IS NULL OR l.tier = ?1) ORDER BY ${sort} LIMIT ?2`).bind(tier, M.PAGE).all()).results;
  const mine = (await db.prepare(
    `SELECT l.*, u.name AS sname, u.username AS susername FROM listings l LEFT JOIN users u ON u.id = l.seller
     WHERE l.status = 'open' AND l.seller = ? ORDER BY l.created DESC`).bind(userId).all()).results;
  return { listings: rows.map((r) => dto(r, userId)), mine: mine.map((r) => dto(r, userId)), fee: M.FEE };
}

export async function list(db, userId, body, now) {
  const id = String(body.id ?? '');
  const price = Math.trunc(Number(body.price));
  const open = await db.prepare("SELECT COUNT(*) AS n FROM listings WHERE seller = ? AND status = 'open'").bind(userId).first();
  if (open.n >= M.MAX_LISTINGS) return refuse(db, userId, `Можно выставить не больше ${M.MAX_LISTINGS} лотов`, now);
  let item;
  try {
    const r = await editPlayer(db, userId, (s) => {
      const it = s.collection.find((x) => x.id === id);
      if (!it) throw new Refuse('Номер не найден в коллекции');
      if (!Number.isFinite(price) || price < it.price * M.MIN_MULT || price > it.price * M.MAX_MULT) {
        throw new Refuse(`Цена от ${Math.ceil(it.price * M.MIN_MULT)} до ${Math.floor(it.price * M.MAX_MULT)} ₽`);
      }
      s.collection = s.collection.filter((x) => x !== it);
      item = it;
    }, now);
    try {
      await db.prepare('INSERT INTO listings (seller, item, price, tier, created) VALUES (?, ?, ?, ?, ?)').bind(userId, JSON.stringify(item), price, item.tier, now).run();
    } catch (e) { // не вышло записать лот: возвращаем номер
      await editPlayer(db, userId, (s) => { s.collection.unshift(item); }, now);
      throw e;
    }
    return { state: r.state, listed: { price, fee: fee(price) } };
  } catch (e) {
    if (e instanceof Refuse) return refuse(db, userId, e.message, now);
    throw e;
  }
}

export async function cancel(db, userId, body, now) {
  const id = Number(body.id);
  const row = await db.prepare("SELECT * FROM listings WHERE id = ? AND seller = ? AND status = 'open'").bind(id, userId).first();
  if (!row) return refuse(db, userId, 'Лот уже продан или снят', now);
  const claimed = await db.prepare("UPDATE listings SET status = 'cancelled', closed = ? WHERE id = ? AND status = 'open'").bind(now, id).run();
  if (claimed.meta.changes !== 1) return refuse(db, userId, 'Лот уже продан', now);
  const item = JSON.parse(row.item);
  const r = await editPlayer(db, userId, (s) => { game.addToCollection(s, item); }, now);
  return { state: r.state };
}

// notify(sellerId, text) необязателен: сообщает продавцу в бота
export async function buy(db, userId, body, now, notify) {
  const id = Number(body.id);
  const row = await db.prepare("SELECT * FROM listings WHERE id = ? AND status = 'open'").bind(id).first();
  if (!row) return refuse(db, userId, 'Лот уже куплен или снят', now);
  if (row.seller === userId) return refuse(db, userId, 'Это твой лот: можно только снять', now);
  const me = await stateOf(db, userId, now);
  if (me.balance < row.price) return refuse(db, userId, 'Не хватает денег', now);
  if (me.collection.length >= CONFIG.COLLECTION_MAX) return refuse(db, userId, `Коллекция полна (${CONFIG.COLLECTION_MAX}): продай или слей номера`, now);

  const claimed = await db.prepare("UPDATE listings SET status = 'sold', buyer = ?, closed = ? WHERE id = ? AND status = 'open'").bind(userId, now, id).run();
  if (claimed.meta.changes !== 1) return refuse(db, userId, 'Лот только что купил другой игрок', now);
  const item = JSON.parse(row.item);
  let r;
  try {
    r = await editPlayer(db, userId, (s) => {
      if (s.balance < row.price) throw new Refuse('Не хватает денег');
      if (s.collection.length >= CONFIG.COLLECTION_MAX) throw new Refuse('Коллекция полна');
      s.balance -= row.price;
      s.collection.unshift(item);
    }, now);
  } catch (e) { // покупка не прошла: лот возвращается в продажу
    await db.prepare("UPDATE listings SET status = 'open', buyer = NULL, closed = NULL WHERE id = ?").bind(id).run();
    if (e instanceof Refuse) return refuse(db, userId, e.message, now);
    throw e;
  }
  const proceeds = row.price - fee(row.price);
  await editPlayer(db, row.seller, (s) => { s.balance += proceeds; }, now);
  if (notify) notify(row.seller, `💰 Твой номер куплен за ${row.price.toLocaleString('ru-RU')} ₽. На счёт: +${proceeds.toLocaleString('ru-RU')} ₽ (комиссия ${Math.round(M.FEE * 100)}%)`);
  return { state: r.state, bought: { price: row.price, item } };
}
