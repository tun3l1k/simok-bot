import { CONFIG, TIERS, OPERATORS, AUTO_KEEP, BETS, COUNTRIES, SHOP_ITEMS, DIGIT_BONUS, xpForLevel } from './config.js';
import { formatPhone, formatMoney, formatMult } from './generator.js';
import { collectionValue, currentBet, spinCost, operatorOf, luckBestOf, craftQuote } from './game.js';

export const countryOf = (s) => COUNTRIES.find((c) => c.id === s.country) ?? COUNTRIES[0];

export const $ = (id) => document.getElementById(id);

export function renderHud(s) {
  $('lvl').textContent = `Ур. ${s.level}`;
  $('xpbar').style.width = `${Math.min(100, (s.xp / xpForLevel(s.level)) * 100)}%`;
  $('luck').textContent = s.luck;
  $('luckChip').textContent = `x${luckBestOf(s)}`;
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
    const title = b.tier ? `${t.name} и выше` : 'Обычная крутка';
    const sub = b.tier
      ? `гарантия редкости · ≈ ${formatMoney(b.avg)}`
      : `любой номер · ≈ ${formatMoney(b.avg)}`;
    return `<li><button class="row${i === s.bet ? ' on' : ''}${b.cost * s.multi > funds ? ' poor' : ''}" data-bet="${i}" style="--tier:${b.tier ? t.color : '#fff'}">
      <span class="row-text"><b class="row-title">${title}</b><small>${sub}</small></span>
      <span class="row-price">${formatMoney(b.cost)}</span><i class="tick" aria-hidden="true"></i></button></li>`;
  }).join('');
  const cost = spinCost(s);
  const left = funds - cost;
  $('betFoot').innerHTML = (left >= 0
    ? `После крутки останется ${formatMoney(left)}`
    : `Не хватает ${formatMoney(-left)}`)
    + (s.multi > 1 ? ` (${s.multi}× по ${formatMoney(currentBet(s).cost)})` : '')
    + '<br>🍀 Удача работает только на обычной крутке';
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
  const op = OPERATORS.find((o) => o.id === item?.op) ?? operatorOf(s) ?? OPERATORS[0];

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
    if (item.series) lines.push(`Серия «${item.series.name}» <b>×${item.series.mult}</b>${item.odds ? ` · 1 из ${item.odds.toLocaleString('ru-RU')}` : ''}`);
    if (item.digit) lines.push(`Любимая цифра ${item.digit.digit}: ${item.digit.count} шт. <b>×${formatMult(item.digit.mult)}</b>`);
    if (item.lucky) lines.push(`🍀 Удача: лучший из ${luckBestOf(s)} номеров`);
  }
  $('info').innerHTML = lines.map((l) => `<div>${l}</div>`).join('')
    + (item ? '<button class="link" id="detailLink">Разбор номера ›</button>' : '');

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
        return `<li class="item" data-detail="${it.id}" style="--tier:${t.color}">
          <div><div class="num">${formatPhone(it)}</div>
          <div class="meta">${t.name}${it.series ? ` · «${it.series.name}»` : ''}${it.digit ? ` · цифра ${it.digit.digit}` : ''}</div></div>
          <div class="right"><b>${formatMoney(it.price)}</b><button class="sell" data-sell="${it.id}">Продать</button></div>
        </li>`;
      }).join('')
    : '<li class="empty">Пока пусто. Нажми «В коллекцию» на понравившемся номере.</li>';
}

export function renderMore(s) {
  $('statsLine').textContent = `Круток: ${s.stats.spins} · Номеров в коллекции: ${s.collection.length}`;
  $('autoBtn').textContent = `Автосохранение: ${AUTO_KEEP[s.autoKeep].label}`;
  renderDigits(s);
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
  document.querySelectorAll('#seg button').forEach((b) => b.classList.toggle('on', b.dataset.go === name));
}

const plural = (n, a, b, c) => (n % 10 === 1 && n % 100 !== 11 ? a : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? b : c);

// ---------- Любимая цифра (настройки) ----------
export function renderDigits(s) {
  const chips = [{ v: null, label: '—' }, ...Array.from({ length: 10 }, (_, i) => ({ v: i, label: String(i) }))];
  $('digitList').innerHTML = chips.map((c) =>
    `<button class="${s.digit === c.v ? 'on' : ''}" data-digit="${c.v ?? ''}" aria-pressed="${s.digit === c.v}">${c.label}</button>`).join('');
  $('digitHint').textContent = s.digit === null ? 'не выбрана' : `цифра ${s.digit}`;
  $('digitNote').textContent = 'В номере из 7 цифр: ' + [...DIGIT_BONUS].reverse().map((b) => `от ${b.min} ×${formatMult(b.mult)}`).join(', ') + '. Действует на новые номера.';
}

// ---------- Тарифы ----------
export function renderTariffs(s) {
  const rows = [
    { id: null, name: 'Любой оператор', tag: '', perk: 'Случайный оператор, без бонусов', c: ['#f4f1ff', '#cfc6f0', '#a99be0'] },
    ...OPERATORS.map((o) => ({ id: o.id, name: o.name, tag: o.tag, perk: o.perk, c: o.c })),
  ];
  $('tariffList').innerHTML = rows.map((r) =>
    `<li><button class="row${(s.operator ?? null) === r.id ? ' on' : ''}" data-oper-id="${r.id ?? ''}" style="--tier:#fff">
      <span class="sim-mini" style="background:linear-gradient(135deg,${r.c[0]},${r.c[1]} 55%,${r.c[2]})" aria-hidden="true"></span>
      <span class="row-text"><b class="row-title">${r.name}${r.tag ? `<span class="tag">${r.tag}</span>` : ''}</b><small>${r.perk}</small></span>
      <i class="tick" aria-hidden="true"></i></button></li>`).join('');
}

// ---------- Разбор номера ----------
export function renderDetail(it, title) {
  const t = TIERS[it.tier];
  $('detailNum').textContent = formatPhone(it);
  $('detailTier').textContent = `${title ? `${title} · ` : ''}${t.name} · ${formatMoney(it.price)}`;
  $('detailTier').style.setProperty('--tier', t.color);
  const rows = [
    ['База номера', 'случайная основа цены', formatMoney(it.base)],
    [`Код ${it.code}`, it.city, `×${formatMult(it.regionMult)}`],
    it.series
      ? [`Серия «${it.series.name}»`, it.odds ? `выпадает примерно 1 из ${it.odds.toLocaleString('ru-RU')} круток` : '', `×${it.series.mult}`]
      : ['Серии нет', 'у номера нет красивого хвоста', '×1'],
  ];
  if (it.digit) {
    const n = it.digit.count;
    rows.push([`Любимая цифра ${it.digit.digit}`, `${n} ${plural(n, 'цифра', 'цифры', 'цифр')} в номере`, `×${formatMult(it.digit.mult)}`]);
  }
  $('detailRows').innerHTML = rows.map(([a, b, v]) =>
    `<li class="brow"><span>${a}${b ? `<small>${b}</small>` : ''}</span><b>${v}</b></li>`).join('')
    + `<li class="brow total"><span>Цена</span><b>${formatMoney(it.price)}</b></li>`;
  $('detailFoot').textContent = 'Цена = база × код × серия × цифра, округляется до 5 ₽';
}

// ---------- Слияние ----------
export function renderCraft(s, sel) {
  const items = [...s.collection].sort((a, b) => b.price - a.price);
  const picked = sel.map((id) => s.collection.find((x) => x.id === id)).filter(Boolean);
  const firstTier = picked.length ? picked[0].tier : null;
  $('craftList').innerHTML = items.length
    ? items.map((it) => {
        const t = TIERS[it.tier];
        const can = !!BETS[it.tier + 1];
        const dim = !can || (firstTier !== null && it.tier !== firstTier);
        return `<li><button class="row${sel.includes(it.id) ? ' on sel' : ''}${dim ? ' dim' : ''}" data-craft="${it.id}" style="--tier:${t.color}">
          <span class="row-text"><b class="row-title" style="font-size:16px">${formatPhone(it)}</b><small>${t.name}${it.series ? ` · «${it.series.name}»` : ''}</small></span>
          <span class="row-price">${formatMoney(it.price)}</span><i class="tick" aria-hidden="true"></i></button></li>`;
      }).join('')
    : '<li class="empty" style="padding:14px 16px">В коллекции пусто. Сохрани несколько номеров, чтобы слить их.</li>';

  const go = $('craftGo');
  go.disabled = true;
  go.textContent = 'Слить';
  if (picked.length < 3) {
    $('craftQuote').textContent = `Выбрано ${picked.length} из 3. Номера должны быть одной редкости.`;
    return;
  }
  const q = craftQuote(picked);
  if (q.error) { $('craftQuote').textContent = q.error; return; }
  const enough = s.balance >= q.fee;
  $('craftQuote').innerHTML = `Получишь номер «${TIERS[q.targetTier].name}» или выше (в среднем ≈ ${formatMoney(q.target.avg)}).<br>`
    + `Сумма номеров ${formatMoney(q.sum)} · доплата ${q.fee ? formatMoney(q.fee) : 'не нужна'}${enough ? '' : ' · не хватает денег'}`;
  go.disabled = !enough;
  go.textContent = q.fee ? `Слить · доплата ${formatMoney(q.fee)}` : 'Слить';
}
