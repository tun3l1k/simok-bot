import { CONFIG, CRAFT, AUTO_SELL, BETS, COUNTRIES, OPERATORS, SHOP_ITEMS, TIERS } from './config.js?v=mw153tx1';
import { formatPhone, formatMoney, formatMult } from './generator.js?v=mw153tx1';
import { load, save, fresh, sanitize } from './state.js?v=mw153tx1';
import * as game from './game.js?v=mw153tx1';
import * as ui from './ui.js?v=mw153tx1';
import { $ } from './ui.js?v=mw153tx1';
import { api, isRemote, net } from './remote.js?v=mw153tx1';
import { initTelegram, haptic, hapticDone, shareText, inviteLink } from './telegram.js?v=mw153tx1';

initTelegram();
// Режим сервера: игру считает Cloudflare Worker, здесь только показ. Без API_URL или вне Telegram играем локально.
const remote = isRemote();
let state = remote ? fresh() : load();
let view = { item: state.pending };
let busy = false;

if (!remote) {
  const ref = new URLSearchParams(location.search).get('ref');
  if (ref && !state.ref) state.ref = ref;
}

// Быстрые действия (продажа) показываем сразу, а серверу отправляем фоном по очереди
let chain = Promise.resolve();
let inflight = 0;
function sync(action, body) {
  if (!remote) return;
  inflight++;
  chain = chain.then(async () => {
    const out = await api(action, state, body);
    inflight--;
    if (out.error && !out.state) { ui.toast(out.error); return; }
    if (out.error) ui.toast(out.error);
    if (inflight === 0 && out.state) {
      state = out.state;
      if (view.item && state.pending?.id !== view.item.id && !state.collection.some((x) => x.id === view.item.id)) view = { item: state.pending };
      renderAll();
    }
  });
}

// Одно действие: на сервере или локально. Ответ сервера сразу становится нашим состоянием.
async function act(action, body, local) {
  if (!remote) return local();
  const out = await api(action, state, body);
  if (out.state) state = out.state;
  return out;
}

function renderAll() {
  ui.renderHud(state);
  ui.renderControls(state);
  ui.renderPlay(state, view);
  ui.renderCollection(state);
  ui.renderMore(state);
  if (!remote) save(state);
  else try { localStorage.setItem('simok_cache', JSON.stringify(state)); } catch { /* нет места */ }
}

async function onSpin() {
  if (busy) return;
  busy = true;
  // анимация идёт сразу, пока сервер считает
  const anim = ui.animateNumber();
  await chain; // сначала дожидаемся фоновых продаж
  const out = await act('spin', {}, () => {
    const bailout = game.bailout(state);
    const r = game.spin(state, state.multi);
    return r.error ? { error: r.error } : { res: r, bailout };
  });
  if (out.error) {
    if (out.state) renderAll();
    ui.toast(out.error);
    busy = false;
    return;
  }
  const res = out.res;
  if (out.bailout) ui.toast(`Пособие ${formatMoney(CONFIG.BAILOUT)}: крути дальше`);
  haptic('medium');
  await anim;
  view = { item: res.item };
  renderAll();
  if (res.item.tier >= 2) hapticDone();

  const notes = [];
  if (state.multi > 1) notes.push(`Лучший из ${state.multi}. Остальные проданы за ${formatMoney(res.autoSold)}`);
  if (res.soldNow) notes.push(`Автопродажа: +${formatMoney(res.item.price)}`);
  res.overflow.forEach((o) => notes.push(`Коллекция полна (${CONFIG.COLLECTION_MAX}): продан самый дешёвый номер ${formatPhone(o)} за ${formatMoney(o.price)}`));
  res.levelUps.forEach((l) => notes.push(`Уровень ${l.level}: +${formatMoney(l.balance)}`));
  if (res.luck20Earned) notes.push(`🍀 Удача x${CONFIG.LUCK20_BEST_OF} готова: следующая крутка выберет лучший из ${CONFIG.LUCK20_BEST_OF}`);
  else if (res.luckEarned) notes.push('🍀 Удача x2 готова: следующая крутка выберет лучший из двух');
  if (res.found) notes.push(res.found.done ? `🗺️ Альбом ${OPERATORS.find((o) => o.id === res.found.op).name} собран: +${formatMoney(res.found.bonus)}` : `🗺️ Новый город: ${res.found.city}`);
  if (notes.length) ui.toast(notes.join('\n'));
  busy = false;
}

$('spinBtn').onclick = onSpin;
$('multiBtn').onclick = () => {
  const o = CONFIG.MULTI_OPTIONS;
  state.multi = o[(o.indexOf(state.multi) + 1) % o.length];
  renderAll();
};
$('digitInfo').onclick = () => {
  const n = $('digitNote'); n.hidden = !n.hidden;
  $('digitInfo').setAttribute('aria-expanded', String(!n.hidden));
};
$('autoBtn').onclick = () => { state.autoSell = (state.autoSell + 1) % AUTO_SELL.length; renderAll(); };

// Шторки: закрываются тапом по затемнению
document.querySelectorAll('dialog.sheet').forEach((d) => d.addEventListener('click', (e) => {
  if (e.target !== d) return;
  const r = d.getBoundingClientRect();
  if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close();
}));

$('countryBtn').onclick = () => { ui.renderCountrySheet(state); $('countrySheet').showModal(); };
$('countryGrid').onclick = (e) => {
  const c = COUNTRIES.find((x) => x.id === e.target.closest('[data-country]')?.dataset.country);
  if (!c) return;
  if (!c.ready) { ui.toast(`${c.name}: скоро`); return; }
  state.country = c.id;
  haptic();
  renderAll();
  $('countrySheet').close();
};
$('operList').onclick = (e) => {
  const row = e.target.closest('[data-oper-id]');
  if (!row) return;
  state.operator = row.dataset.operId || null;
  haptic();
  renderAll();
  $('countrySheet').close();
};
$('tariffsBtn').onclick = () => ui.toast('Тарифы скоро');

$('betBtn').onclick = () => { ui.renderBetSheet(state); $('betSheet').showModal(); };
$('betList').onclick = (e) => {
  const i = Number(e.target.closest('[data-bet]')?.dataset.bet);
  if (!BETS[i]) return;
  state.bet = i;
  haptic();
  renderAll();
  $('betSheet').close();
};

function sellItem(id) {
  if (busy) return;
  const price = state.pending?.id === id ? game.sellPending(state) : game.sellFromCollection(state, id);
  if (!price) { ui.toast('Номер не найден'); return; }
  ui.toast(`Продано за ${formatMoney(price)}`);
  haptic();
  if (view.item?.id === id) view = { item: state.pending };
  renderAll();
  sync('sell', { id });
}
$('sellAllBtn').onclick = () => {
  if (busy || !state.collection.length) { if (!state.collection.length) ui.toast('Коллекция пуста'); return; }
  const n = state.collection.length;
  const sum = state.collection.reduce((a, x) => a + x.price, 0);
  if (!confirm(`Продать все ${n} номеров за ${formatMoney(sum)}?`)) return;
  game.sellAll(state);
  ui.toast(`Продано ${n} шт. за ${formatMoney(sum)}`);
  hapticDone();
  renderAll();
  sync('sellall', {});
};
$('sellBtn').onclick = () => { if (view.item) sellItem(view.item.id); };
const openLuck = () => { ui.renderLuckSheet(state); $('luckSheet').showModal(); };
$('luckPill').onclick = openLuck;
$('luckCard').onclick = openLuck;
$('luckClose').onclick = () => $('luckSheet').close();
// «Показать друзьям»: красивое сообщение с карточкой номера, редкостью и серией
const TIER_DOT = ['⚪', '🟢', '🔵', '🟣', '🟠', '🔴'];
function bragText(it) {
  const op = OPERATORS.find((o) => o.id === it.op);
  const t = TIERS[it.tier];
  return [
    `📱 ${op ? op.name : 'SIM'} · ${formatPhone(it)}`,
    `${TIER_DOT[it.tier]} ${t.name} · ${formatMoney(it.price)}`,
    it.series ? `✨ «${it.series.name}» ×${it.series.mult}${it.odds ? ` · шанс 1 из ${it.odds.toLocaleString('ru-RU')}` : ''}` : '',
    it.digit ? `🎯 Любимая цифра ${it.digit.digit} ×${formatMult(it.digit.mult)}` : '',
    'Выбей номер круче 👇',
  ].filter(Boolean).join('\n');
}
$('shareBtn').onclick = () => {
  if (!view.item) return;
  shareText(bragText(view.item), inviteLink(CONFIG.BOT_USERNAME));
};


function openDetail(item, title) {
  if (!item) return;
  ui.renderDetail(item, title);
  $('detailSheet').showModal();
}
$('detailClose').onclick = () => $('detailSheet').close();
$('info').onclick = (e) => { if (e.target.closest('#detailLink')) openDetail(view.item); };

$('collectionList').onclick = (e) => {
  const id = e.target.dataset?.sell;
  if (id) { sellItem(id); return; }
  const did = e.target.closest('[data-detail]')?.dataset.detail;
  if (did) openDetail(state.collection.find((x) => x.id === did));
};

const goView = (e) => {
  const go = e.target.closest('button')?.dataset.go;
  if (go) ui.showView(go);
};
$('nav').onclick = goView;
$('seg').onclick = goView;

// Любимая цифра
$('digitList').onclick = (e) => {
  const b = e.target.closest('[data-digit]');
  if (!b) return;
  state.digit = b.dataset.digit === '' ? null : Number(b.dataset.digit);
  haptic();
  renderAll();
};

// Слияние: выбираем три номера одной редкости
let craftSel = [];
const craftOpen = () => { ui.renderCraft(state, craftSel); };
$('craftBtn').onclick = () => { craftSel = []; craftOpen(); $('craftSheet').showModal(); };
$('craftQuick').onclick = (e) => {
  const t = e.target.closest('[data-quick]')?.dataset.quick;
  if (t === undefined) return;
  craftSel = game.craftAutoPick(state, Number(t));
  haptic();
  craftOpen();
  // показываем выбранные номера: прокрутка к первому из них
  $('craftList').querySelector('.row.on')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
};
$('craftClear').onclick = () => { craftSel = []; haptic(); craftOpen(); };
$('craftList').onclick = (e) => {
  const id = e.target.closest('[data-craft]')?.dataset.craft;
  const it = state.collection.find((x) => x.id === id);
  if (!it) return;
  const first = state.collection.find((x) => x.id === craftSel[0]);
  if (craftSel.includes(id)) craftSel = craftSel.filter((x) => x !== id);
  else if (first && first.tier === it.tier) {
    // 11-й номер не сбрасывает выбор: просто не добавляется
    if (craftSel.length >= CRAFT.COUNT) { ui.toast(`Уже выбрано ${CRAFT.COUNT}. Сними один номер, чтобы выбрать другой`); return; }
    craftSel = [...craftSel, id];
    if (craftSel.length === CRAFT.COUNT) ui.toast(`✅ Выбрано ${CRAFT.COUNT} номеров: можно сливать`);
  } else craftSel = [id];
  haptic();
  craftOpen();
};
$('craftGo').onclick = async () => {
  const out = await act('craft', { ids: craftSel }, () => {
    const r = game.craft(state, craftSel);
    return r.error ? { error: r.error } : { res: r };
  });
  if (out.error) { ui.toast(out.error); return; }
  const res = out.res;
  craftSel = [];
  hapticDone();
  renderAll();
  $('craftSheet').close();
  if (res.upgraded) ui.toast(`🎉 Повезло: выпала редкость «${TIERS[res.item.tier].name}»`);
  openDetail(res.item, 'Слияние');
};

const invite = () => shareText('Крути SIM-карты и собирай красивые номера', inviteLink(CONFIG.BOT_USERNAME));
$('inviteBtn').onclick = invite;
$('inviteBtn2').onclick = invite;

$('dailyBtn').onclick = async () => {
  const out = await act('daily', {}, () => {
    const d = game.claimDaily(state);
    return d ? { bonus: d } : { error: 'Бонус уже получен. Загляни позже' };
  });
  if (out.error) { ui.toast(out.error); return; }
  ui.toast(`Бонус: +${formatMoney(out.bonus.balance)}`); hapticDone(); renderAll();
};
$('resetBtn').onclick = async () => {
  if (!confirm('Сбросить весь прогресс?')) return;
  const out = await act('reset', {}, () => { state = fresh(); return {}; });
  if (out.error) { ui.toast(out.error); return; }
  view = { item: null }; renderAll(); ui.showView('play');
};

// Магазин: пока заглушка
$('settingsBtn').onclick = () => {
  $('netInfo').textContent = remote ? (net.rtt === null ? 'Связь с сервером: ещё не было запросов' : `Связь с сервером: ${net.rtt} мс (сервер считал ${net.server ?? '?'} мс)`) : 'Играешь без сервера';
  $('settingsSheet').showModal();
};
$('settingsClose').onclick = () => $('settingsSheet').close();
ui.renderShop();
$('shopBtn').onclick = () => $('shop').showModal();
$('shopClose').onclick = () => $('shop').close();
$('shopList').onclick = (e) => {
  if (e.target.dataset?.buy !== undefined) {
    ui.toast(`«${SHOP_ITEMS[e.target.dataset.buy].title}»: оплата Stars подключается с бэкендом`);
  }
};

if (remote) {
  // состояние берём с сервера; пока ответа нет, кнопка крутки выключена
  // одним запросом: берём состояние и сразу пробуем забрать ежедневный бонус
  busy = true;
  try { const c = JSON.parse(localStorage.getItem('simok_cache')); if (c?.balance !== undefined) { state = sanitize(c); view = { item: state.pending }; } } catch { /* кэша нет */ }
  renderAll();
  const first = await api('daily', state);
  if (first.state) {
    state = first.state;
    view = { item: state.pending };
    busy = false;
  } else ui.toast(first.error || 'Сервер недоступен');
  renderAll();
  if (first.bonus) ui.toast(`Ежедневный бонус: +${formatMoney(first.bonus.balance)}`);
} else {
  const daily = game.claimDaily(state);
  renderAll();
  if (daily) ui.toast(`Ежедневный бонус: +${formatMoney(daily.balance)}`);
}
