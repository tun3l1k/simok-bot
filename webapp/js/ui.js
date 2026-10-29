import { CONFIG, TIERS, OPERATORS, AUTO_KEEP, SHOP_ITEMS, xpForLevel } from './config.js';
import { formatPhone, formatMoney, formatMult } from './generator.js';
import { collectionValue } from './game.js';

export const $ = (id) => document.getElementById(id);

export function renderHud(s) {
  $('lvl').textContent = `Ур. ${s.level}`;
  $('xpbar').style.width = `${Math.min(100, (s.xp / xpForLevel(s.level)) * 100)}%`;
  $('luck').textContent = s.luck;
  $('luckChip').textContent = `x${CONFIG.LUCK_BEST_OF}`;
  $('balance').textContent = formatMoney(s.balance);
}

export function renderControls(s) {
  $('multiBtn').textContent = `${s.multi}×`;
  $('filterBtn').textContent = `Автосохр.: ${AUTO_KEEP[s.autoKeep].label}`;
  $('spinCost').textContent = formatMoney(CONFIG.SPIN_COST * s.multi);
}

// view = { item, kept } | { item: null }
export function renderPlay(s, view) {
  const { item, kept } = view;
  const tier = TIERS[item ? item.tier : 0];
  const op = OPERATORS.find((o) => o.id === item?.op) ?? OPERATORS[0];

  const play = $('view-play');
  play.style.setProperty('--tier', tier.color);
  const sim = $('sim');
  ['--c1', '--c2', '--c3'].forEach((v, i) => sim.style.setProperty(v, op.c[i]));

  $('simOp').textContent = op.name;
  $('simCity').textContent = item ? `4G · ${item.city}` : '4G';
  $('simNumber').textContent = item ? formatPhone(item) : '+7 ··· ···-··-··';
  $('tierName').textContent = item ? tier.name : '—';
  $('tierPrice').textContent = item ? formatMoney(item.price) : '';
  [...$('tierBars').children].forEach((b, i) => b.classList.toggle('on', !!item && i <= item.tier));

  const lines = [];
  if (!item) {
    lines.push('Нажми «Крутить», чтобы выпала первая SIM');
  } else {
    lines.push(`Код ${item.code} · ${item.city}`);
    if (item.lucky) lines.push(`Удача: лучший из ${CONFIG.LUCK_BEST_OF} номеров`);
    if (item.regionMult > 1) lines.push(`Код региона <b>×${formatMult(item.regionMult)}</b>`);
    if (item.series) lines.push(`Серия «${item.series.name}» <b>×${item.series.mult}</b>`);
  }
  $('info').innerHTML = lines.map((l) => `<div>${l}</div>`).join('');

  const canKeep = !!s.pending && s.pending.id === item?.id;
  $('keepBtn').disabled = !canKeep;
  $('keepBtn').textContent = kept ? 'Сохранено' : 'В коллекцию';
  $('shareBtn').disabled = !item;
  $('sellLine').textContent = canKeep ? `Этот номер продастся за ${formatMoney(item.price)}` : kept ? 'Номер в коллекции' : '';
  $('spinLabel').textContent = item ? 'Крутить ещё' : 'Крутить';
}

export function renderCollection(s) {
  const items = [...s.collection].sort((a, b) => b.price - a.price);
  $('collectionTotal').textContent = items.length
    ? `${items.length} шт. на ${formatMoney(collectionValue(s))}`
    : '';
  $('collectionList').innerHTML = items.length
    ? items.map((it) => {
        const t = TIERS[it.tier];
        return `<li class="item" style="--tier:${t.color}">
          <div><div class="num">${formatPhone(it)}</div>
          <div class="meta">${t.name}${it.series ? ` · «${it.series.name}»` : ''}</div></div>
          <div class="right"><b>${formatMoney(it.price)}</b><button class="sell" data-sell="${it.id}">Продать</button></div>
        </li>`;
      }).join('')
    : '<li class="empty">Пока пусто. Нажми «В коллекцию» на понравившемся номере.</li>';
}

export function renderMore(s) {
  $('statsLine').textContent = `Круток: ${s.stats.spins} · Номеров в коллекции: ${s.collection.length}`;
}

export function renderShop() {
  $('shopList').innerHTML = SHOP_ITEMS.map((p, i) =>
    `<li class="item" style="--tier:#f5c518"><div><div class="num">${p.title}</div><div class="meta">${p.desc}</div></div>
     <button class="sell" data-buy="${i}">${p.stars} ★</button></li>`).join('');
}

export function animateNumber(ms = 650) {
  const el = $('simNumber'), sim = $('sim');
  const r = () => Math.floor(Math.random() * 10);
  sim.classList.add('rolling');
  return new Promise((done) => {
    const t0 = performance.now();
    const id = setInterval(() => {
      el.textContent = `+7 ${r()}${r()}${r()} ${r()}${r()}${r()}-${r()}${r()}-${r()}${r()}`;
      if (performance.now() - t0 >= ms) { clearInterval(id); sim.classList.remove('rolling'); done(); }
    }, 55);
  });
}

let toastTimer;
export function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

export function showView(name) {
  document.querySelectorAll('[data-view]').forEach((v) => { v.hidden = v.id !== `view-${name}`; });
  document.querySelectorAll('#nav button').forEach((b) => b.classList.toggle('on', b.dataset.go === name));
}
