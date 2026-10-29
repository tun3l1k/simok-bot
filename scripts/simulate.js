// Проверка экономики: npm run sim
import { CONFIG, TIERS } from '../webapp/js/config.js';
import { roll } from '../webapp/js/generator.js';

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
