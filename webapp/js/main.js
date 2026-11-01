import { CONFIG, CRAFT, AUTO_SELL, BETS, COUNTRIES, OPERATORS, SHOP_ITEMS, TIERS } from './config.js?v=mvyd36jy';
import { formatPhone, formatMoney, formatMult } from './generator.js?v=mvyd36jy';
import { load, save, fresh } from './state.js?v=mvyd36jy';
import * as game from './game.js?v=mvyd36jy';
import * as ui from './ui.js?v=mvyd36jy';
import { $ } from './ui.js?v=mvyd36jy';
import { initTelegram, haptic, hapticDone, shareText, inviteLink } from './telegram.js?v=mvyd36jy';

initTelegram();
let state = load();
let view = { item: state.pending };
let busy = false;

const ref = new URLSearchParams(location.search).get('ref');
if (ref && !state.ref) state.ref = ref;

function renderAll() {
  ui.renderHud(state);
  ui.renderControls(state);
  ui.renderPlay(state, view);
  ui.renderCollection(state);
  ui.renderMore(state);
  save(state);
}

async function onSpin() {
  if (busy) return;
  if (game.bailout(state)) ui.toast(`Пособие ${formatMoney(CONFIG.BAILOUT)}: крути дальше`);
  busy = true;
  $('spinBtn').disabled = true;
  const res = game.spin(state, state.multi);
  if (res.error) {
    ui.toast(res.error);
    busy = false; $('spinBtn').disabled = false;
    return;
  }
  haptic('medium');
  await ui.animateNumber();
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
  $('spinBtn').disabled = false;
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
$('craftAuto').onclick = () => { craftSel = game.craftAutoPick(state); if (!craftSel.length) ui.toast(`Нужно ${CRAFT.COUNT} номеров одной редкости`); haptic(); craftOpen(); };
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

$('sellBtn').onclick = () => {
  const item = view.item;
  if (!item) return;
  const price = state.pending?.id === item.id ? game.sellPending(state) : game.sellFromCollection(state, item.id);
  if (price) { ui.toast(`Продано за ${formatMoney(price)}`); haptic(); renderAll(); }
};
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
  if (id) {
    const price = game.sellFromCollection(state, id);
    if (price) { ui.toast(`Продано за ${formatMoney(price)}`); haptic(); renderAll(); }
    return;
  }
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
$('craftList').onclick = (e) => {
  const id = e.target.closest('[data-craft]')?.dataset.craft;
  const it = state.collection.find((x) => x.id === id);
  if (!it) return;
  const first = state.collection.find((x) => x.id === craftSel[0]);
  if (craftSel.includes(id)) craftSel = craftSel.filter((x) => x !== id);
  else if (first && first.tier === it.tier && craftSel.length < CRAFT.COUNT) craftSel = [...craftSel, id];
  else craftSel = [id];
  haptic();
  craftOpen();
};
$('craftGo').onclick = () => {
  const res = game.craft(state, craftSel);
  if (res.error) { ui.toast(res.error); return; }
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

$('dailyBtn').onclick = () => {
  const d = game.claimDaily(state);
  if (d) { ui.toast(`Бонус: +${formatMoney(d.balance)}`); hapticDone(); renderAll(); }
  else ui.toast('Бонус уже получен. Загляни позже');
};
$('resetBtn').onclick = () => {
  if (!confirm('Сбросить весь прогресс?')) return;
  state = fresh(); view = { item: null }; renderAll(); ui.showView('play');
};

// Магазин: пока заглушка
$('settingsBtn').onclick = () => $('settingsSheet').showModal();
$('settingsClose').onclick = () => $('settingsSheet').close();
ui.renderShop();
$('shopBtn').onclick = () => $('shop').showModal();
$('shopClose').onclick = () => $('shop').close();
$('shopList').onclick = (e) => {
  if (e.target.dataset?.buy !== undefined) {
    ui.toast(`«${SHOP_ITEMS[e.target.dataset.buy].title}»: оплата Stars подключается с бэкендом`);
  }
};

const daily = game.claimDaily(state);
renderAll();
if (daily) ui.toast(`Ежедневный бонус: +${formatMoney(daily.balance)}`);
