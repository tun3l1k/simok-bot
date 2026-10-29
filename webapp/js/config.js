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

// Размер интерфейса: v — множитель, label — подпись на кнопке
export const UI_SCALES = [
  { v: 0.85, label: 'Мелкий' },
  { v: 0.95, label: 'Обычный' }, // стандарт, с ним игра открывается по умолчанию
  { v: 1.05, label: 'Крупный' },
  { v: 1.15, label: 'Огромный' },
];

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

// Вымышленные операторы (чтобы не пересекаться с брендами)
export const OPERATORS = [
  { id: 'mobi', name: 'MOBI', c: ['#f4f1ff', '#cfc6f0', '#a99be0'] },
  { id: 'vela', name: 'VELA', c: ['#effcf7', '#b9ecd9', '#7fd1b5'] },
  { id: 'nord', name: 'NORD', c: ['#eef6ff', '#bcd8f6', '#86b4e8'] },
];

// Ставки: номер гарантированно не ниже редкости tier. Цена ≈ средняя цена такого номера
// (пересчитывается через npm run sim, блок «Ставки»), поэтому это быстрый путь к редким номерам, а не халява.
export const BETS = [
  { tier: 0, cost: CONFIG.SPIN_COST },
  { tier: 1, cost: 2200 },
  { tier: 2, cost: 5300 },
  { tier: 3, cost: 25000 },
  { tier: 4, cost: 97000 },
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
