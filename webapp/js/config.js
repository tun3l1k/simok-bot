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

// Коды городов: w = вес выпадения, mult = множитель цены
export const CODES = [
  { code: '916', city: 'Москва', mult: 1.4, w: 10 },
  { code: '925', city: 'Москва', mult: 1.4, w: 10 },
  { code: '926', city: 'Москва', mult: 1.4, w: 10 },
  { code: '985', city: 'Москва', mult: 1.3, w: 6 },
  { code: '977', city: 'Москва', mult: 1.2, w: 4 },
  { code: '921', city: 'Санкт-Петербург', mult: 1.25, w: 8 },
  { code: '911', city: 'Санкт-Петербург', mult: 1.25, w: 6 },
  { code: '950', city: 'Екатеринбург', mult: 1.1, w: 5 },
  { code: '912', city: 'Екатеринбург', mult: 1.1, w: 5 },
  { code: '913', city: 'Новосибирск', mult: 1.05, w: 5 },
  { code: '918', city: 'Краснодар', mult: 1.05, w: 5 },
  { code: '927', city: 'Самара', mult: 1.0, w: 6 },
  { code: '900', city: 'Россия', mult: 1.5, w: 2 },
  { code: '999', city: 'Россия', mult: 1.5, w: 2 },
];

// Операторы России: пародии на реальных, чтобы не пересекаться с брендами.
// У каждого свой бонус тарифа: tag — короткое название, perk — описание для игрока.
// Бонусы: cityBoost / codeBoost — во сколько раз чаще выпадают города / коды, patternBoost — шанс красивого хвоста,
// luckBestOf — сколько номеров сравнивает Удача. Числа подобраны так, чтобы цена номера росла не больше чем на ~10% (npm run sim, блок «Операторы»).
export const OPERATORS = [
  { id: 'mgs', name: 'МГС', c: ['#fff1f1', '#f5bcbc', '#e57373'], tag: 'Столичный',
    perk: 'Московские коды выпадают в 4 раза чаще', cityBoost: { 'Москва': 4 } },
  { id: 'yoga', name: 'Йога', c: ['#eaf9ff', '#a9e4f7', '#4fc3f7'], tag: 'Серийный',
    perk: 'Красивые хвосты (пары, лесенки, тройки) выпадают в 1,25 раза чаще', patternBoost: 0.05 },
  { id: 'megafox', name: 'MegaFox', c: ['#effcf1', '#b7ecbf', '#6fd08a'], tag: 'Везучий',
    perk: 'Удача 🍀 берёт лучший из 3 номеров вместо 2', luckBestOf: 3 },
  { id: 'bilait', name: 'Билайт', c: ['#fffbe6', '#fbe59a', '#f2c94c'], tag: 'Северный',
    perk: 'Питерские коды выпадают в 4 раза чаще', cityBoost: { 'Санкт-Петербург': 4 } },
  { id: 'tele3', name: 'Теле3', c: ['#eceef3', '#b8bdcc', '#7c8399'], tag: 'Федеральный',
    perk: 'Коды 900 и 999 выпадают в 5 раз чаще', codeBoost: { '900': 5, '999': 5 } },
];

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
