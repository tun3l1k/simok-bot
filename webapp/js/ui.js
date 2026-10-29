import { CONFIG, TIERS, OPERATORS, AUTO_KEEP, BETS, COUNTRIES, SHOP_ITEMS, xpForLevel } from './config.js';
import { formatPhone, formatMoney, formatMult } from './generator.js';
import { collectionValue, currentBet, spinCost } from './game.js';

export const countryOf = (s) => COUNTRIES.find((c) => c.id === s.country) ?? COUNTRIES[0];

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
  $('countryBtn').innerHTML = `${countryOf(s).flag}<span>${countryOf(s).name}</span>`;
  const bet = currentBet(s);
  const betBtn = $('betBtn');
  betBtn.textContent = `Ставка: ${bet.name}`;
  betBtn.style.color = bet.tier ? TIERS[bet.tier].color : '';
  $('spinCost').textContent = formatMoney(spinCost(s));
}

export function renderBetSheet(s) {
  const funds = s.balance + (s.pending ? s.pending.price : 0);
  $('betList').innerHTML = BETS.map((b, i) => {
    const t = TIERS[b.tier];
    const sub = b.tier
      ? `${t.name} и выше · ≈ ${formatMoney(b.avg)}`
      : `любой номер · ≈ ${formatMoney(b.avg)}`;
    return `<li><button class="row${i === s.bet ? ' on' : ''}${b.cost * s.multi > funds ? ' poor' : ''}" data-bet="${i}" style="--tier:${b.tier ? t.color : '#fff'}">
      <span class="row-text"><b class="row-title">${b.name}</b><small>${sub}</small></span>
      <span class="row-price">${formatMoney(b.cost)}</span><i class="tick" aria-hidden="true"></i></button></li>`;
  }).join('');
  const cost = spinCost(s);
  const left = funds - cost;
  $('betFoot').innerHTML = (left >= 0
    ? `После крутки останется ${formatMoney(left)}`
    : `Не хватает ${formatMoney(-left)}`)
    + (s.multi > 1 ? ` (${s.multi}× по ${formatMoney(currentBet(s).cost)})` : '')
    + '<br>🍀 Удача работает только на «Эконом»';
}

export function renderCountrySheet(s) {
  $('countryGrid').innerHTML = COUNTRIES.map((c) =>
    `<button class="country${c.id === s.country ? ' on' : ''}${c.ready ? '' : ' soon'}" data-country="${c.id}">${c.flag}<span>${c.name}</span></button>`).join('');
  const sim = OPERATORS.map((o) => o.name).join(' · ');
  $('operList').innerHTML = `<li><button class="row on" style="--tier:#fff" data-oper="any">
    <span class="sim-mini" aria-hidden="true"></span>
    <span class="row-text"><b class="row-title">Любой оператор</b><small>${sim}</small></span><i class="tick" aria-hidden="true"></i></button></li>`;
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
    lines.push(`Код ${item.code} · ${item.city}${item.regionMult > 1 ? ` · <b>×${formatMult(item.regionMult)}</b>` : ''}`);
    if (item.series) lines.push(`Серия «${item.series.name}» <b>×${item.series.mult}</b>`);
    if (item.lucky) lines.push(`🍀 Удача: лучший из ${CONFIG.LUCK_BEST_OF} номеров`);
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
  $('autoBtn').textContent = `Автосохранение: ${AUTO_KEEP[s.autoKeep].label}`;
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
  $('dock').hidden = name !== 'play'; // ставка и «Крутить» нужны только на экране игры
  document.querySelectorAll('[data-view]').forEach((v) => { v.hidden = v.id !== `view-${name}`; });
  document.querySelectorAll('#nav button').forEach((b) => b.classList.toggle('on', b.dataset.go === name));
}
