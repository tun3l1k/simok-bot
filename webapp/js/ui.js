import { skinOf } from './skins.js?v=mw15a2uk';
import { CONFIG, CRAFT, TIERS, OPERATORS, AUTO_SELL, BETS, COUNTRIES, SHOP_ITEMS, DIGIT_BONUS, DISTRICTS, CITIES, CITY_BY_NAME, ATLAS, rankOf, xpForLevel } from './config.js?v=mw15a2uk';
import { formatPhone, formatMoney, formatMult } from './generator.js?v=mw15a2uk';
import { collectionValue, currentBet, spinCost, operatorOf, luckBestOf, luckLeft, luck20Left, albumSize, albumFound, craftQuote, citiesOpened, districtProgress } from './game.js?v=mw15a2uk';

export const countryOf = (s) => COUNTRIES.find((c) => c.id === s.country) ?? COUNTRIES[0];

export const $ = (id) => document.getElementById(id);

export function renderHud(s) {
  $('lvl').textContent = `Ур. ${s.level}`;
  $('xpbar').style.width = `${Math.min(100, (s.xp / xpForLevel(s.level)) * 100)}%`;
  // Клевер: сколько круток до Удачи x2; когда заряд готов, плашка загорается
  $('luck').textContent = luckLeft(s);
  const big = s.luck20 > 0;
  const n = big ? s.luck20 : s.luck;
  $('luckChip').textContent = `x${big ? CONFIG.LUCK20_BEST_OF : luckBestOf(s)}${n > 1 ? `·${n}` : ''}`;
  $('luckPill').classList.toggle('ready', s.luck > 0 || big);
  $('luckPill').classList.toggle('big', big);
  $('balance').textContent = formatMoney(s.balance);
}

export function renderControls(s) {
  $('multiBtn').textContent = `${s.multi}×`;
  $('countryBtn').innerHTML = `${countryOf(s).flag}<span>${countryOf(s).name}${operatorOf(s) ? ` · ${operatorOf(s).name}` : ''}</span>`;
  const bet = currentBet(s);
  const betBtn = $('betBtn');
  betBtn.textContent = `Ставка: ${bet.name}`;
  betBtn.style.color = bet.tier ? TIERS[bet.tier].color : '';
  $('spinCost').textContent = formatMoney(spinCost(s));
}

export function renderBetSheet(s) {
  const funds = s.balance;
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
  const rows = [
    { id: '', name: 'Любой оператор', sub: OPERATORS.map((o) => o.name).join(' · '), c: ['#f4f1ff', '#cfc6f0', '#a99be0'] },
    ...OPERATORS.map((o) => ({ id: o.id, name: o.name, sub: `Городов ${albumFound(s, o.id)} из ${albumSize(o.id)} · коды ${[...new Set(o.codes.map((c) => c.code))].sort().slice(0, 3).join(', ')}…`, c: o.c })),
  ];
  $('operList').innerHTML = rows.map((r) =>
    `<li><button class="row${(s.operator ?? '') === r.id ? ' on' : ''}" data-oper-id="${r.id}" style="--tier:#fff">
      <span class="sim-mini" style="background:${skinOf(r.id).bg}" aria-hidden="true"><svg viewBox="0 0 300 180" preserveAspectRatio="xMidYMid slice">${skinOf(r.id).art}</svg></span>
      <span class="row-text"><b class="row-title">${r.name}</b><small>${r.sub}</small></span><i class="tick" aria-hidden="true"></i></button></li>`).join('');
  const op = operatorOf(s);
  $('operFoot').textContent = op ? `Крутятся только SIM ${op.name}` : 'Крутятся SIM всех операторов поровну';
}

// view = { item, kept } | { item: null }
export function renderPlay(s, view) {
  const { item } = view;
  const tier = TIERS[item ? item.tier : 0];
  const op = OPERATORS.find((o) => o.id === item?.op) ?? operatorOf(s) ?? OPERATORS[0];

  const play = $('view-play');
  play.style.setProperty('--tier', tier.color);
  const sim = $('sim');
  const skin = skinOf(op.id);
  sim.style.background = skin.bg;
  sim.style.color = skin.ink;
  $('simArt').innerHTML = skin.art;
  $('simLogo').innerHTML = skin.logo;

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
    if (item.lucky) { const n = item.lucky === true ? 2 : item.lucky; lines.push(`🍀 Удача x${n}: лучший из ${n} номеров`); }
  }
  $('info').innerHTML = lines.map((l) => `<div>${l}</div>`).join('')
    + (item ? '<button class="link" id="detailLink">Разбор номера ›</button>' : '');

  const canKeep = !!s.pending && s.pending.id === item?.id;
  const inColl = !!item && s.collection.some((x) => x.id === item.id);
  const sold = !!item && !canKeep && !inColl;
  $('sellBtn').disabled = !(canKeep || inColl);
  $('sellBtn').textContent = sold ? `Продано за ${formatMoney(item.price)}` : item ? `Продать за ${formatMoney(item.price)}` : 'Продать';
  $('shareBtn').disabled = !item;
  $('sellLine').textContent = canKeep ? 'Крутишь дальше: номер сам уйдёт в коллекцию' : inColl ? 'Номер в коллекции' : '';
  $('spinLabel').textContent = item ? 'Крутить ещё' : 'Крутить';
}

export function renderCollection(s) {
  const items = [...s.collection].sort((a, b) => b.price - a.price);
  $('collectionTotal').textContent = items.length
    ? `${items.length} из ${CONFIG.COLLECTION_MAX} шт. на ${formatMoney(collectionValue(s))}`
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
    : `<li class="empty">Пока пусто. Номера попадают сюда сами, когда крутишь дальше (до ${CONFIG.COLLECTION_MAX} шт.).</li>`;
}

const totalFound = (s) => citiesOpened(s).size;
const totalCities = () => CITIES.length;

// Окошко «Гарант удачи»: два счётчика и готовые заряды
export function renderLuckSheet(s) {
  const card = (best, every, left, ready, hot) => {
    const done = every - left;
    return `<div class="lk${hot ? ' hot' : ''}">
      <div class="lk-top"><b class="lk-x">x${best}</b><span>каждые ${every} круток</span><em>${ready > 0 ? `готово: ${ready}` : `ещё ${left}`}</em></div>
      <i class="lc-bar"><u style="width:${(done / every) * 100}%"></u></i>
      <small>${done} из ${every} · одна крутка «лучший из ${best}»</small></div>`;
  };
  $('luckBody').innerHTML =
    card(CONFIG.LUCK20_BEST_OF, CONFIG.LUCK20_EVERY, luck20Left(s), s.luck20, true) +
    card(luckBestOf(s), CONFIG.LUCK_EVERY, luckLeft(s), s.luck, false);
}

export function renderMore(s) {
  const ready = s.luck20 > 0 ? `Удача x${CONFIG.LUCK20_BEST_OF} готова` : s.luck > 0 ? `Удача x${luckBestOf(s)} готова` : `До Удачи x${luckBestOf(s)}: ${luckLeft(s)}`;
  $('luckCard').innerHTML = `
    <span class="lc-clover" aria-hidden="true">🍀</span>
    <div class="lc-body">
      <b>${ready}</b>
      <small>До x${CONFIG.LUCK20_BEST_OF}: ${luck20Left(s)} круток. Нажми, чтобы посмотреть всё</small>
      <i class="lc-bar"><u style="width:${((CONFIG.LUCK_EVERY - luckLeft(s)) / CONFIG.LUCK_EVERY) * 100}%"></u></i>
    </div>
    <i class="mi-go" aria-hidden="true">›</i>`;
  const stat = (icon, val, label) => `<div class="stat"><span aria-hidden="true">${icon}</span><b>${val}</b><small>${label}</small></div>`;
  $('statsGrid').innerHTML =
    stat('🎰', s.stats.spins.toLocaleString('ru-RU'), 'круток') +
    stat('📱', `${s.collection.length}/${CONFIG.COLLECTION_MAX}`, 'в коллекции') +
    stat('💰', formatMoney(collectionValue(s)), 'цена коллекции') +
    stat('🗺️', `${totalFound(s)}/${totalCities()}`, 'городов открыто');
  $('atlasSub').textContent = `${totalFound(s)} из ${totalCities()} · ${rankOf(totalFound(s)).name}`;
  const d = CONFIG.DAILY_BONUS;
  const wait = s.lastDaily + d.cooldownH * 3600e3 - Date.now();
  $('dailySub').textContent = wait > 0 ? `Через ${Math.ceil(wait / 3600e3)} ч` : `Забери ${formatMoney(d.balance)}`;
  $('dailySub').classList.toggle('ok', wait <= 0);
  $('settingsSub').textContent = `Автопродажа: ${AUTO_SELL[s.autoSell].label}${s.digit !== null ? ` · цифра ${s.digit}` : ''}`;
  $('autoBtn').textContent = `Автопродажа: ${AUTO_SELL[s.autoSell].label}`;
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
  const bonus = [...DIGIT_BONUS].reverse().map((b) => `<li>от <b>${b.min}</b> таких цифр: цена <b>×${formatMult(b.mult)}</b></li>`).join('');
  $('digitNote').innerHTML = `<p>Выбери цифру, которую хочешь собирать. Чем чаще она встречается в 7 последних цифрах номера, тем дороже номер.</p><ul>${bonus}</ul>
    <p>Пример: любимая 7, номер <b>+7 916 777-57-77</b> (шесть семёрок) стоит в ${formatMult(DIGIT_BONUS[0].mult)} раза дороже. Действует только на новые номера и не меняет шансы на редкие серии.</p>`;
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
    : '<li class="empty" style="padding:14px 16px">В коллекции пусто. Номера попадают сюда сами, когда крутишь дальше.</li>';

  // быстрый выбор: по кнопке на каждую редкость, где набралось 10 номеров
  const quick = [];
  for (let t = 0; t < BETS.length - 1; t++) {
    const n = s.collection.filter((x) => x.tier === t).length;
    if (n >= CRAFT.COUNT) quick.push(`<button data-quick="${t}" style="--tier:${TIERS[t].color}">${TIERS[t].name} · ${n} шт.</button>`);
  }
  $('craftQuick').innerHTML = quick.join('');
  $('craftQuickLabel').hidden = !quick.length;

  // прогресс выбора виден всегда: счётчик и полоска в нижней панели
  $('craftCount').textContent = `Выбрано ${picked.length} из ${CRAFT.COUNT}`;
  $('craftMeter').style.width = `${Math.min(100, picked.length / CRAFT.COUNT * 100)}%`;
  $('craftMeter').parentElement.classList.toggle('full', picked.length >= CRAFT.COUNT);
  $('craftClear').hidden = !picked.length;

  const go = $('craftGo');
  go.disabled = true;
  go.textContent = 'Слить';
  if (picked.length < CRAFT.COUNT) {
    $('craftQuote').textContent = `Выбрано ${picked.length} из ${CRAFT.COUNT}. Номера должны быть одной редкости.`;
    return;
  }
  const q = craftQuote(picked);
  if (q.error) { $('craftQuote').textContent = q.error; return; }
  const enough = s.balance >= q.fee;
  const upLine = q.upTier !== null ? `<br>Шанс <b>${Math.round(q.upChance * 100)}%</b> на «${TIERS[q.upTier].name}»` : '';
  $('craftQuote').innerHTML = `Гарантия: «${TIERS[q.targetTier].name}» или выше (в среднем ≈ ${formatMoney(q.target.avg)}).${upLine}<br>`
    + `Сумма номеров ${formatMoney(q.sum)} · доплата ${q.fee ? formatMoney(q.fee) : 'не нужна'}${enough ? '' : ' · не хватает денег'}`
    + (q.lossy ? '<br>⚠️ Выше этой редкости ничего нет: выгоднее продать номера' : '');
  go.disabled = !enough;
  go.textContent = q.fee ? `Слить · доплата ${formatMoney(q.fee)}` : 'Слить';
}

// ---------- Атлас России ----------
const escH = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const opName = (id) => OPERATORS.find((o) => o.id === id)?.name ?? id;
const oneIn = (p) => `1 из ${Math.max(1, Math.round(1 / p)).toLocaleString('ru-RU')}`;

export function renderAtlas(s, districtId, cityName) {
  const opened = citiesOpened(s);
  const n = opened.size;
  const rank = rankOf(n);
  const next = ATLAS.RANKS.find((r) => r.from > n);
  $('atlasHead').innerHTML = `<div class="at-rank"><b>${rank.name}</b><span>${n} из ${CITIES.length} городов</span></div>
    <div class="meter"><i style="width:${(n / CITIES.length) * 100}%"></i></div>
    <small>${next ? `До звания «${next.name}»: ${next.from - n}` : 'Вся Россия открыта'} · за каждый округ ${formatMoney(ATLAS.DISTRICT_REWARD.balance)} и 🍀, за всю Россию ${formatMoney(ATLAS.ALL_REWARD.balance)} и 🍀 x${CONFIG.LUCK20_BEST_OF}</small>`;

  $('atlasTabs').innerHTML = DISTRICTS.map((d) => {
    const p = districtProgress(s, d, opened);
    return `<button class="d-tab${d.id === districtId ? ' on' : ''}${p.count === p.total ? ' full' : ''}" data-district="${d.id}"><b>${d.short}</b><small>${p.count}/${p.total}</small></button>`;
  }).join('');

  const d = DISTRICTS.find((x) => x.id === districtId) ?? DISTRICTS[0];
  const p = districtProgress(s, d, opened);
  const claimed = s.atlas?.claimed?.includes(d.id);
  $('atlasDistrict').innerHTML = `<b>${d.name} округ</b><span>${p.count} из ${p.total}${claimed ? ' · награда получена ✓' : ''}</span>`;
  $('atlasGrid').innerHTML = CITIES.filter((c) => c.district === d.id).map((c) => {
    const open = opened.has(c.name);
    const dots = OPERATORS.map((o) => `<i class="${(s.found?.[o.id] ?? []).includes(c.name) ? 'on' : ''}" style="--c:${o.c[2]}"></i>`).join('');
    return `<button class="atlas-city${open ? ' open' : ''}${c.name === cityName ? ' cur' : ''}" data-city="${escH(c.name)}"><b>${open ? '' : '🔒 '}${escH(c.name)}</b><span class="dots">${dots}</span></button>`;
  }).join('');

  const c = CITY_BY_NAME[cityName];
  if (!c) { $('atlasInfo').innerHTML = '<p class="muted center small">Нажми на город: покажу, как его открыть. Точки под названием — штампы операторов.</p>'; return; }
  const open = opened.has(c.name);
  const rows = c.ops.map((o, i) => {
    const has = (s.found?.[o.id] ?? []).includes(c.name);
    return `<li class="${has ? 'has' : ''}"><span>${has ? '✓' : ''} ${opName(o.id)}</span><b>${oneIn(o.chance)} круток</b></li>${i === 0 && !open ? '<li class="best"><small>Лучший шанс. Выбери этого оператора в шторке страны.</small></li>' : ''}`;
  }).join('');
  const missing = OPERATORS.filter((o) => !c.ops.some((x) => x.id === o.id)).map((o) => o.name);
  $('atlasInfo').innerHTML = `<div class="ci-head"><b>${escH(c.name)}</b><span>${open ? 'Открыт' : `Награда за открытие ${formatMoney(c.bonus)}`}</span></div>
    <ul class="ci-ops">${rows}</ul>${missing.length ? `<small class="muted">У ${missing.join(', ')} этого города нет</small>` : ''}`;
}

// Всплывающая карточка «Новый город»
let popTimer;
export function showDiscovery(f) {
  const d = f.district;
  const lines = [`<div class="pop-city">${escH(f.city)}</div>`, `<div class="pop-sub">${d.short} · ${d.count} из ${d.total}</div>`,
    `<div class="meter${d.done ? ' full' : ''}"><i style="width:${(d.count / d.total) * 100}%"></i></div>`,
    `<div class="pop-gain">+${formatMoney(f.cityBonus)}</div>`];
  if (d.done) lines.push(`<div class="pop-big">🏆 ${d.name} округ собран!<br>+${formatMoney(d.bonus)} и 🍀 Удача x2</div>`);
  if (f.all) lines.push(`<div class="pop-big">🇷🇺 Вся Россия открыта!<br>+${formatMoney(f.all.bonus)} и 🍀 Удача x${CONFIG.LUCK20_BEST_OF}</div>`);
  $('popBody').innerHTML = `<div class="pop-title">🗺️ Новый город!</div>${lines.join('')}`;
  const el = $('discoverPop');
  if (!el.open) el.show();
  clearTimeout(popTimer);
  popTimer = setTimeout(() => el.close(), d.done || f.all ? 4200 : 2600);
}
