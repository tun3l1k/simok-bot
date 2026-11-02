// Собирает webapp/js/registry.js из реестра Россвязи (файл вида «АВС/ DEF;Структурный;…;Оператор;ИНН»).
// Запуск: node scripts/build-registry.js путь/к/DEF-9xx.csv
// Берутся только мобильные коды 9xx пяти операторов (МТС, МегаФон, Вымпелком, Т2 Мобайл, Скартел) и только строки с одним регионом.
import { readFileSync, writeFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) { console.error('Укажи путь к CSV: node scripts/build-registry.js DEF-9xx.csv'); process.exit(1); }

// оператор реестра → оператор игры
const OWNER = [
  [/^ПАО "(МТС|Мобильные ТелеСистемы)"$/i, 'mgs'],
  [/^ПАО "МЕГАФОН"$/i, 'megafox'],
  [/^ПАО "(ВЫМПЕЛКОМ|Вымпел-Коммуникации)"$/i, 'bilait'],
  [/^ООО "Т2 МОБАЙЛ"$/i, 'tele3'],
  [/^ООО "Скартел"$/i, 'yoga'],
];
const FIX = {
  'Город Москва, Московская область': 'Город Москва',
  'Ленинградская область, Город Санкт-Петербург': 'Город Санкт-Петербург',
};

function expand(list) {
  const out = [];
  for (const part of list.split(',').map((x) => x.trim())) {
    const m = part.match(/^(\d{3})-(\d{3})$/);
    if (m) for (let c = +m[1]; c <= +m[2]; c++) out.push(String(c));
    else if (/^\d{3}$/.test(part)) out.push(part);
  }
  return out.filter((c) => c[0] === '9');
}

const text = readFileSync(file, 'utf8').replace(/^﻿/, '');
const regions = [], groups = [], ops = {};
const idx = (arr, v) => { let i = arr.indexOf(v); if (i < 0) i = arr.push(v) - 1; return i; };
const agg = {};
for (const line of text.split(/\r?\n/).slice(1)) {
  const f = line.split(';');
  if (f.length < 9) continue;
  const owner = OWNER.find(([re]) => re.test(f[7].trim()))?.[1];
  if (!owner) continue;
  const codes = expand(f[0]);
  if (!codes.length) continue;
  const zone = FIX[f[4].trim()] ?? f[4].trim();
  if (zone.includes(',')) continue; // строки сразу на много регионов не годятся
  const key = `${owner}|${idx(regions, zone)}|${idx(groups, codes.join(' '))}`;
  agg[key] = (agg[key] || 0) + 1;
}
for (const [key, n] of Object.entries(agg)) {
  const [o, r, g] = key.split('|');
  (ops[o] ??= []).push([+r, +g, n]);
}
const out = `// Сгенерировано scripts/build-registry.js из реестра Россвязи. Руками не править.
// regions — регионы, groups — наборы кодов (через пробел), ops[оператор] — тройки [регион, набор кодов, число блоков номеров].
export const REGISTRY = ${JSON.stringify({ regions, groups, ops })};
`;
writeFileSync(new URL('../webapp/js/registry.js', import.meta.url), out);
console.log(`регионов ${regions.length}, наборов кодов ${groups.length}, размер ${(out.length / 1024).toFixed(1)} КБ`);
for (const [o, t] of Object.entries(ops)) console.log(` ${o}: ${t.length} записей, блоков ${t.reduce((a, x) => a + x[2], 0)}`);
