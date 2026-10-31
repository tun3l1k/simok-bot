// Все числа экономики и контента живут здесь. Меняй и проверяй: npm run sim
import { FLAGS } from './flags.js';

export const CONFIG = {
  SAVE_KEY: 'simok_save_v1',
  BOT_USERNAME: 'SimOkBot', // имя бота без @
  SPIN_COST: 500,
  START_BALANCE: 10000,
  START_LUCK: 10,
  LUCK_BEST_OF: 2,            // при Удаче крутится N номеров, берётся лучший
  MULTI_OPTIONS: [1, 5, 10],
  BASE_MIN: 70,
  BASE_MAX: 210,
  PATTERN_BOOST: 0.04,        // шанс, что номер сгенерируется «красивым» намеренно
  XP_PER_SPIN: 10,
  BAILOUT: 2000,              // пособие, если денег нет и продавать нечего
  DAILY_BONUS: { balance: 2000, luck: 3, cooldownH: 20 },
};

export const xpForLevel = (lvl) => 100 + 60 * (lvl - 1);
export const levelReward = (lvl) => ({ balance: 1000 * lvl, luck: 3 });

// Редкость определяется ценой номера
export const TIERS = [
  { name: 'Обычный',      min: 0,       color: '#9aa3b2' },
  { name: 'Необычный',    min: 500,     color: '#3ddc84' },
  { name: 'Редкий',       min: 3000,    color: '#4aa8ff' },
  { name: 'Эпический',    min: 15000,   color: '#b266ff' },
  { name: 'Легендарный',  min: 60000,   color: '#ffb020' },
  { name: 'Мифический',   min: 250000,  color: '#ff4d6d' },
];

export const AUTO_KEEP = [
  { label: 'Выкл', tier: 99 },
  { label: 'Редкий+', tier: 2 },
  { label: 'Эпический+', tier: 3 },
];

// Операторы России: пародии на реальных, чтобы не пересекаться с брендами. Бонусов нет, отличаются только коды и регионы.
// codes: w — вес выпадения кода, mult — множитель цены региона. Средний множитель у всех примерно одинаковый (проверяет npm run sim).
export const OPERATORS = [
  { id: 'mgs', name: 'МГС', c: ['#fff1f1', '#f5bcbc', '#e57373'], codes: [
    { code: '916', city: 'Москва', mult: 1.4, w: 10 },
    { code: '910', city: 'Москва', mult: 1.4, w: 8 },
    { code: '985', city: 'Москва', mult: 1.3, w: 6 },
    { code: '917', city: 'Казань', mult: 1.0, w: 7 },
    { code: '913', city: 'Новосибирск', mult: 1.05, w: 4 },
    { code: '918', city: 'Краснодар', mult: 1.05, w: 4 },
    { code: '900', city: 'Россия', mult: 1.5, w: 2 },
  ] },
  { id: 'yoga', name: 'Йога', c: ['#eaf9ff', '#a9e4f7', '#4fc3f7'], codes: [
    { code: '925', city: 'Москва', mult: 1.4, w: 12 },
    { code: '977', city: 'Москва', mult: 1.3, w: 8 },
    { code: '911', city: 'Санкт-Петербург', mult: 1.25, w: 8 },
    { code: '950', city: 'Екатеринбург', mult: 1.1, w: 7 },
    { code: '952', city: 'Самара', mult: 1.0, w: 4 },
    { code: '953', city: 'Краснодар', mult: 1.05, w: 4 },
    { code: '902', city: 'Россия', mult: 1.5, w: 3 },
  ] },
  { id: 'megafox', name: 'MegaFox', c: ['#effcf1', '#b7ecbf', '#6fd08a'], codes: [
    { code: '926', city: 'Москва', mult: 1.4, w: 13 },
    { code: '921', city: 'Санкт-Петербург', mult: 1.25, w: 11 },
    { code: '912', city: 'Екатеринбург', mult: 1.1, w: 5 },
    { code: '929', city: 'Новосибирск', mult: 1.05, w: 5 },
    { code: '927', city: 'Самара', mult: 1.0, w: 5 },
    { code: '928', city: 'Краснодар', mult: 1.05, w: 5 },
    { code: '933', city: 'Россия', mult: 1.5, w: 5 },
  ] },
  { id: 'bilait', name: 'Билайт', c: ['#fffbe6', '#fbe59a', '#f2c94c'], codes: [
    { code: '903', city: 'Москва', mult: 1.4, w: 8 },
    { code: '905', city: 'Москва', mult: 1.4, w: 8 },
    { code: '906', city: 'Москва', mult: 1.3, w: 6 },
    { code: '909', city: 'Санкт-Петербург', mult: 1.25, w: 8 },
    { code: '951', city: 'Екатеринбург', mult: 1.1, w: 6 },
    { code: '961', city: 'Краснодар', mult: 1.05, w: 5 },
    { code: '960', city: 'Самара', mult: 1.0, w: 4 },
  ] },
  { id: 'tele3', name: 'Теле3', c: ['#eceef3', '#b8bdcc', '#7c8399'], codes: [
    { code: '995', city: 'Москва', mult: 1.4, w: 10 },
    { code: '901', city: 'Санкт-Петербург', mult: 1.25, w: 8 },
    { code: '904', city: 'Екатеринбург', mult: 1.1, w: 6 },
    { code: '923', city: 'Новосибирск', mult: 1.05, w: 6 },
    { code: '908', city: 'Краснодар', mult: 1.05, w: 6 },
    { code: '999', city: 'Россия', mult: 1.5, w: 7 },
  ] },
];

// Коды для генерации: у конкретного оператора только его коды, у «любого» операторы равновероятны
// (веса кодов каждого оператора нормируются в сумму 1).
const POOLS = { any: OPERATORS.flatMap((o) => {
  const t = o.codes.reduce((a, c) => a + c.w, 0);
  return o.codes.map((c) => ({ ...c, op: o.id, w: c.w / t }));
}) };
OPERATORS.forEach((o) => { POOLS[o.id] = o.codes.map((c) => ({ ...c, op: o.id })); });
export const codesOf = (opId) => POOLS[opId ?? 'any'] ?? POOLS.any;

// Слияние: 3 номера одной редкости → 1 номер редкостью выше (гарантия), с доплатой.
// Доплата подобрана так, чтобы слияние было нейтрально для экономики: итоговая ценность = сумма номеров минус комиссия.
export const CRAFT = { COUNT: 3, FEE: 0.05, ROUND: 50 };

// Любимая цифра: чем больше таких цифр в номере (из 7), тем дороже
export const DIGIT_BONUS = [
  { min: 5, mult: 3 },
  { min: 4, mult: 2 },
  { min: 3, mult: 1.5 },
];

// Ставки: номер гарантированно не ниже редкости tier. Цена ≈ средняя цена такого номера
// (пересчитывается через npm run sim, блок «Ставки»), поэтому это быстрый путь к редким номерам, а не халява.
// name — короткое имя для кнопки, avg — средняя цена выпадающего номера (из npm run sim), показывается игроку.
export const BETS = [
  { tier: 0, name: 'Обычная', cost: CONFIG.SPIN_COST, avg: 371 },
  { tier: 1, name: 'Необычный+', cost: 2550, avg: 2550 },
  { tier: 2, name: 'Редкий+', cost: 5700, avg: 5700 },
  { tier: 3, name: 'Эпический+', cost: 19200, avg: 19200 },
  { tier: 4, name: 'Легендарный+', cost: 96900, avg: 96900 },
];

// Страны. Играбельна пока только Россия; операторы каждой страны добавим позже.
export const COUNTRIES = [
  { id: 'ru', name: 'Россия', ready: true },
  { id: 'by', name: 'Беларусь' },
  { id: 'kz', name: 'Казахстан' },
  { id: 'ae', name: 'ОАЭ' },
  { id: 'ab', name: 'Абхазия' },
  { id: 'ua', name: 'Украина' },
  { id: 'de', name: 'Германия' },
  { id: 'az', name: 'Азербайджан' },
  { id: 'am', name: 'Армения' },
  { id: 'ge', name: 'Грузия' },
  { id: 'us', name: 'США' },
  { id: 'uz', name: 'Узбекистан' },
].map((c) => ({ ...c, flag: FLAGS[c.id] }));

// Заглушка магазина. Реальная оплата Stars подключается на бэкенде.
export const SHOP_ITEMS = [
  { title: 'Пачка удачи', desc: '+20 Удачи', stars: 50 },
  { title: 'Мешок денег', desc: '+25 000 ₽', stars: 100 },
  { title: 'Стартовый набор', desc: '+60 000 ₽ и +50 Удачи', stars: 250 },
];
