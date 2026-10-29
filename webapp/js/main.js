import { CONFIG, AUTO_KEEP, SHOP_ITEMS } from './config.js';
import { formatPhone, formatMoney } from './generator.js';
import { load, save, fresh } from './state.js';
import * as game from './game.js';
import * as ui from './ui.js';
import { $ } from './ui.js';
import { initTelegram, haptic, hapticDone, shareText, inviteLink } from './telegram.js';

initTelegram();
let state = load();
let view = { item: state.pending, kept: false };
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
  view = { item: res.item, kept: res.kept };
  renderAll();
  if (res.item.tier >= 2) hapticDone();

  const notes = [];
  if (state.multi > 1) notes.push(`Лучший из ${state.multi}. Остальные проданы за ${formatMoney(res.autoSold)}`);
  if (res.kept) notes.push('Номер сразу ушёл в коллекцию');
  res.levelUps.forEach((l) => notes.push(`Уровень ${l.level}: +${formatMoney(l.balance)} и +${l.luck} Удачи`));
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
$('filterBtn').onclick = () => { state.autoKeep = (state.autoKeep + 1) % AUTO_KEEP.length; renderAll(); };
$('countryBtn').onclick = () => ui.toast('Другие страны скоро');
$('tariffsBtn').onclick = () => ui.toast('Тарифы скоро');

$('keepBtn').onclick = () => {
  if (game.keepPending(state)) { view = { ...view, kept: true }; haptic(); renderAll(); }
};
$('shareBtn').onclick = () => {
  if (!view.item) return;
  shareText(`Мне выпал номер ${formatPhone(view.item)} за ${formatMoney(view.item.price)}`, inviteLink(CONFIG.BOT_USERNAME));
};

$('collectionList').onclick = (e) => {
  const id = e.target.dataset?.sell;
  if (!id) return;
  const price = game.sellFromCollection(state, id);
  if (price) { ui.toast(`Продано за ${formatMoney(price)}`); haptic(); renderAll(); }
};

$('nav').onclick = (e) => {
  const go = e.target.closest('button')?.dataset.go;
  if (go) ui.showView(go);
};

$('inviteBtn').onclick = () => shareText('Крути SIM-карты и собирай красивые номера', inviteLink(CONFIG.BOT_USERNAME));

$('dailyBtn').onclick = () => {
  const d = game.claimDaily(state);
  if (d) { ui.toast(`Бонус: +${formatMoney(d.balance)} и +${d.luck} Удачи`); hapticDone(); renderAll(); }
  else ui.toast('Бонус уже получен. Загляни позже');
};
$('resetBtn').onclick = () => {
  if (!confirm('Сбросить весь прогресс?')) return;
  state = fresh(); view = { item: null, kept: false }; renderAll(); ui.showView('play');
};

// Магазин: пока заглушка
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
if (daily) ui.toast(`Ежедневный бонус: +${formatMoney(daily.balance)} и +${daily.luck} Удачи`);
