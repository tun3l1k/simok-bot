// Проверка экономики: npm run sim
import { CONFIG, TIERS, BETS } from '../webapp/js/config.js';
import { roll, rollMin, SERIES, detectSeries } from '../webapp/js/generator.js';

const N = 300000;
let sum = 0, sumLuck = 0;
const tiers = TIERS.map(() => 0);
const series = {};
for (let i = 0; i < N; i++) {
  const a = roll();
  sum += a.price; tiers[a.tier]++;
  if (a.series) series[a.series.name] = (series[a.series.name] || 0) + 1;
  const b = roll(), c = roll();
  sumLuck += Math.max(b.price, c.price);
}
console.log(`Цена крутки: ${CONFIG.SPIN_COST} ₽`);
console.log(`Средняя цена номера: ${(sum / N).toFixed(0)} ₽ (${((sum / N / CONFIG.SPIN_COST) * 100).toFixed(0)}% от цены крутки)`);
console.log(`С Удачей (лучший из 2): ${(sumLuck / N).toFixed(0)} ₽ (${((sumLuck / N / CONFIG.SPIN_COST) * 100).toFixed(0)}%)`);
console.log('Редкости:');
TIERS.forEach((t, i) => console.log(`  ${t.name.padEnd(12)} 1 из ${tiers[i] ? Math.round(N / tiers[i]) : '∞'}`));
console.log('Серии (частота):');
Object.entries(series).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k.padEnd(14)} 1 из ${Math.round(N / v)}`));

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
const M = 20000;
console.log('Ставки (цена в config.js → средняя цена номера):');
BETS.forEach((b) => {
  if (!b.tier) return;
  let total = 0, min = Infinity;
  for (let i = 0; i < M; i++) {
    const it = rollMin(b.tier);
    if (it.tier < b.tier) { console.error(`Ставка ${TIERS[b.tier].name}+: выпал номер ниже редкости`); process.exit(1); }
    total += it.price; min = Math.min(min, it.price);
  }
  const mean = total / M;
  console.log(`  ${(TIERS[b.tier].name + '+').padEnd(13)} ${String(b.cost).padStart(7)} ₽ → ${mean.toFixed(0).padStart(7)} ₽ (${((mean / b.cost) * 100).toFixed(0)}%, минимум ${min} ₽)`);
});
