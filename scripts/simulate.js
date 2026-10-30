// Проверка экономики: npm run sim
import { CONFIG, TIERS, BETS, OPERATORS, CRAFT } from '../webapp/js/config.js';
import { roll, rollMin, SERIES, detectSeries, digitBonus } from '../webapp/js/generator.js';
import { craftQuote } from '../webapp/js/game.js';

const N = 300000;
const pct = (v) => `${((v / CONFIG.SPIN_COST) * 100).toFixed(0)}%`;
const avg = (f, n = N) => { let s = 0; for (let i = 0; i < n; i++) s += f(); return s / n; };

const base = avg(() => roll().price);
const luck2 = avg(() => Math.max(roll().price, roll().price));
const tiers = TIERS.map(() => 0);
const series = {};
for (let i = 0; i < N; i++) {
  const a = roll();
  tiers[a.tier]++;
  if (a.series) series[a.series.name] = (series[a.series.name] || 0) + 1;
}
console.log(`Цена крутки: ${CONFIG.SPIN_COST} ₽`);
console.log(`Средняя цена номера: ${base.toFixed(0)} ₽ (${pct(base)} от цены крутки)`);
console.log(`С Удачей (лучший из 2): ${luck2.toFixed(0)} ₽ (${pct(luck2)})`);
console.log('Редкости:');
TIERS.forEach((t, i) => console.log(`  ${t.name.padEnd(12)} 1 из ${tiers[i] ? Math.round(N / tiers[i]) : '∞'}`));
console.log('Серии (частота; в config «p» должна совпадать):');
Object.entries(series).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
  const p = SERIES.find((s) => s.name === k).p;
  console.log(`  ${k.padEnd(16)} 1 из ${String(Math.round(N / v)).padStart(6)}   (в таблице 1 из ${Math.round(1 / p)})`);
});

// Конструкторы серий должны давать номера именно своей серии
for (const s of SERIES) {
  for (let i = 0; i < 2000; i++) {
    const body = s.make();
    if (body.length !== 7 || !/^\d{7}$/.test(body) || (detectSeries(body)?.mult ?? 0) < s.mult) {
      console.error(`Серия «${s.name}»: конструктор дал не тот номер: ${body}`);
      process.exit(1);
    }
  }
}

// Ставки с гарантией: цена должна быть близка к средней цене выданного номера
const M = 30000;
console.log('Ставки (cost → средняя цена номера; avg в config.js должен совпадать):');
BETS.forEach((b) => {
  if (!b.tier) return;
  let total = 0, min = Infinity;
  for (let i = 0; i < M; i++) {
    const it = rollMin(b.tier);
    if (it.tier < b.tier) { console.error(`Ставка ${TIERS[b.tier].name}+: выпал номер ниже редкости`); process.exit(1); }
    total += it.price; min = Math.min(min, it.price);
  }
  const mean = total / M;
  console.log(`  ${b.name.padEnd(10)} ${String(b.cost).padStart(7)} ₽ → ${mean.toFixed(0).padStart(7)} ₽ (${((mean / b.cost) * 100).toFixed(0)}%, avg в config ${b.avg}, минимум ${min} ₽)`);
});

// Операторы: бонус не должен разгонять экономику больше чем на ~10%
console.log('Операторы (обычная крутка, без Удачи):');
for (const o of OPERATORS) {
  const m = avg(() => roll({ op: o.id }).price);
  const lk = avg(() => {
    const n = o.luckBestOf ?? CONFIG.LUCK_BEST_OF;
    let best = 0;
    for (let i = 0; i < n; i++) best = Math.max(best, roll({ op: o.id }).price);
    return best;
  });
  console.log(`  ${o.name} «${o.tag}»: ${m.toFixed(0)} ₽ (${pct(m)}, ${((m / base - 1) * 100).toFixed(1)}% к базе); с Удачей ${lk.toFixed(0)} ₽ (${((lk / luck2 - 1) * 100).toFixed(1)}% к базе с Удачей)`);
}

// Любимая цифра: средний вклад бонуса в цену
const dBase = avg(() => roll({ digit: 7 }).price);
let hits = 0; for (let i = 0; i < N; i++) if (digitBonus(roll().body, 7)) hits++;
console.log(`Любимая цифра 7: бонус у 1 из ${Math.round(N / hits)} номеров, средняя цена ${dBase.toFixed(0)} ₽ (${((dBase / base - 1) * 100).toFixed(1)}% к базе)`);

// Слияние: ценность на выходе (номер минус доплата) должна быть ≈ суммы входящих минус комиссия
console.log(`Слияние (комиссия ${CRAFT.FEE * 100}%): итог = номер − доплата, сравниваем с суммой трёх номеров`);
for (let t = 0; t < 4; t++) {
  const pool = [];
  while (pool.length < 3000) { const it = roll(); if (it.tier === t) pool.push(it); }
  let sumIn = 0, sumOut = 0, fees = 0, K = 4000;
  for (let i = 0; i < K; i++) {
    const trio = [0, 1, 2].map(() => pool[Math.floor(Math.random() * pool.length)]);
    const q = craftQuote(trio);
    const out = rollMin(q.targetTier);
    sumIn += q.sum; sumOut += out.price - q.fee; fees += q.fee;
  }
  console.log(`  ${TIERS[t].name.padEnd(12)} → ${TIERS[t + 1].name.padEnd(12)} вход ${(sumIn / K).toFixed(0).padStart(6)} ₽, доплата ${(fees / K).toFixed(0).padStart(6)} ₽, выход ${(sumOut / K).toFixed(0).padStart(6)} ₽ (${((sumOut / sumIn) * 100).toFixed(0)}% от входа)`);
}
