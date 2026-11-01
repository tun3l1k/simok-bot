// Все числа экономики и контента живут здесь. Меняй и проверяй: npm run sim
import { FLAGS } from './flags.js?v=mvycnlow';

export const CONFIG = {
  SAVE_KEY: 'simok_save_v1',
  BOT_USERNAME: 'SimOkBot', // имя бота без @
  SPIN_COST: 500,
  START_BALANCE: 10000,
  START_LUCK: 0,
  LUCK_EVERY: 100,            // каждые N круток копится заряд Удачи
  LUCK_BEST_OF: 2,            // заряд делает одну крутку «лучший из N номеров»
  LUCK20_EVERY: 500,          // каждые 500 круток копится большой заряд
  LUCK20_BEST_OF: 20,         // большой заряд: одна крутка «лучший из 20»
  ALBUM_BONUS: 25000,         // награда за все города оператора
  COLLECTION_MAX: 50,         // больше номеров в коллекции не помещается: самый дешёвый продаётся сам
  MULTI_OPTIONS: [1, 5, 10],
  BASE_MIN: 70,
  BASE_MAX: 210,
  PATTERN_BOOST: 0.04,        // шанс, что номер сгенерируется «красивым» намеренно
  XP_PER_SPIN: 10,
  BAILOUT: 2000,              // пособие, если денег нет и продавать нечего
  DAILY_BONUS: { balance: 2000, cooldownH: 20 },
};

export const xpForLevel = (lvl) => 100 + 60 * (lvl - 1);
export const levelReward = (lvl) => ({ balance: 1000 * lvl });

// Редкость определяется ценой номера
export const TIERS = [
  { name: 'Обычный',      min: 0,       color: '#9aa3b2' },
  { name: 'Необычный',    min: 500,     color: '#3ddc84' },
  { name: 'Редкий',       min: 3000,    color: '#4aa8ff' },
  { name: 'Эпический',    min: 15000,   color: '#b266ff' },
  { name: 'Легендарный',  min: 60000,   color: '#ffb020' },
  { name: 'Мифический',   min: 250000,  color: '#ff4d6d' },
];

// Автопродажа: номера этой редкости и ниже продаются сразу после крутки
export const AUTO_SELL = [
  { label: 'Выкл', maxTier: -1 },
  { label: 'Обычные', maxTier: 0 },
  { label: 'До Необычных', maxTier: 1 },
  { label: 'До Редких', maxTier: 2 },
];

// Операторы России: пародии на реальных, чтобы не пересекаться с брендами. Бонусов нет, отличаются только коды и регионы.
// codes: w — вес выпадения кода, mult — множитель цены региона. Большие города встречаются чаще, дальние (Магадан, Анадырь, Камчатка) редко, зато они дороже.
// Средний множитель у всех операторов примерно одинаковый (проверяет npm run sim), поэтому оператор не даёт бонуса, а меняет только набор городов.
export const OPERATORS = [
  { id: 'mgs', name: 'МГС', c: ['#fff1f1', '#f5bcbc', '#e57373'], codes: [
    { code: '916', city: 'Москва', mult: 1.46, w: 10 },
    { code: '910', city: 'Москва', mult: 1.46, w: 8 },
    { code: '985', city: 'Москва', mult: 1.35, w: 6 },
    { code: '917', city: 'Казань', mult: 1.04, w: 7 },
    { code: '913', city: 'Новосибирск', mult: 1.09, w: 4 },
    { code: '918', city: 'Краснодар', mult: 1.09, w: 4 },
    { code: '900', city: 'Россия', mult: 1.56, w: 2 },
    { code: '907', city: 'Нижний Новгород', mult: 1.14, w: 4.0 },
    { code: '914', city: 'Омск', mult: 1.14, w: 4.0 },
    { code: '915', city: 'Челябинск', mult: 1.14, w: 4.0 },
    { code: '919', city: 'Саратов', mult: 1.09, w: 3.0 },
    { code: '920', city: 'Тюмень', mult: 1.09, w: 3.0 },
    { code: '922', city: 'Тольятти', mult: 1.09, w: 3.0 },
    { code: '924', city: 'Ижевск', mult: 1.09, w: 3.0 },
    { code: '930', city: 'Калининград', mult: 1.35, w: 1.2 },
    { code: '931', city: 'Мурманск', mult: 1.4, w: 1.2 },
    { code: '932', city: 'Архангельск', mult: 1.35, w: 1.2 },
    { code: '934', city: 'Сочи', mult: 1.46, w: 1.2 },
  ] },
  { id: 'yoga', name: 'Йога', c: ['#eaf9ff', '#a9e4f7', '#4fc3f7'], codes: [
    { code: '925', city: 'Москва', mult: 1.45, w: 12 },
    { code: '977', city: 'Москва', mult: 1.34, w: 8 },
    { code: '911', city: 'Санкт-Петербург', mult: 1.29, w: 8 },
    { code: '950', city: 'Екатеринбург', mult: 1.14, w: 7 },
    { code: '952', city: 'Самара', mult: 1.03, w: 4 },
    { code: '953', city: 'Краснодар', mult: 1.09, w: 4 },
    { code: '902', city: 'Россия', mult: 1.55, w: 3 },
    { code: '935', city: 'Ростов-на-Дону', mult: 1.14, w: 4.0 },
    { code: '936', city: 'Уфа', mult: 1.14, w: 4.0 },
    { code: '937', city: 'Красноярск', mult: 1.14, w: 4.0 },
    { code: '938', city: 'Барнаул', mult: 1.09, w: 3.0 },
    { code: '939', city: 'Ульяновск', mult: 1.09, w: 3.0 },
    { code: '940', city: 'Иркутск', mult: 1.09, w: 3.0 },
    { code: '941', city: 'Хабаровск', mult: 1.09, w: 3.0 },
    { code: '942', city: 'Севастополь', mult: 1.4, w: 1.2 },
    { code: '943', city: 'Симферополь', mult: 1.34, w: 1.2 },
    { code: '944', city: 'Якутск', mult: 1.55, w: 1.2 },
    { code: '945', city: 'Норильск', mult: 1.55, w: 1.2 },
  ] },
  { id: 'megafox', name: 'MegaFox', c: ['#effcf1', '#b7ecbf', '#6fd08a'], codes: [
    { code: '926', city: 'Москва', mult: 1.44, w: 13 },
    { code: '921', city: 'Санкт-Петербург', mult: 1.29, w: 11 },
    { code: '912', city: 'Екатеринбург', mult: 1.13, w: 5 },
    { code: '929', city: 'Новосибирск', mult: 1.08, w: 5 },
    { code: '927', city: 'Самара', mult: 1.03, w: 5 },
    { code: '928', city: 'Краснодар', mult: 1.08, w: 5 },
    { code: '933', city: 'Россия', mult: 1.55, w: 5 },
    { code: '946', city: 'Пермь', mult: 1.13, w: 4.0 },
    { code: '947', city: 'Воронеж', mult: 1.13, w: 4.0 },
    { code: '948', city: 'Волгоград', mult: 1.13, w: 4.0 },
    { code: '949', city: 'Владивосток', mult: 1.08, w: 3.0 },
    { code: '954', city: 'Ярославль', mult: 1.08, w: 3.0 },
    { code: '955', city: 'Томск', mult: 1.08, w: 3.0 },
    { code: '956', city: 'Оренбург', mult: 1.08, w: 3.0 },
    { code: '957', city: 'Южно-Сахалинск', mult: 1.55, w: 1.2 },
    { code: '958', city: 'Магадан', mult: 1.65, w: 1.2 },
    { code: '959', city: 'Петропавловск-Камч.', mult: 1.75, w: 1.2 },
    { code: '962', city: 'Анадырь', mult: 1.85, w: 1.2 },
  ] },
  { id: 'bilait', name: 'Билайт', c: ['#fffbe6', '#fbe59a', '#f2c94c'], codes: [
    { code: '903', city: 'Москва', mult: 1.46, w: 8 },
    { code: '905', city: 'Москва', mult: 1.46, w: 8 },
    { code: '906', city: 'Москва', mult: 1.36, w: 6 },
    { code: '909', city: 'Санкт-Петербург', mult: 1.3, w: 8 },
    { code: '951', city: 'Екатеринбург', mult: 1.15, w: 6 },
    { code: '961', city: 'Краснодар', mult: 1.1, w: 5 },
    { code: '960', city: 'Самара', mult: 1.04, w: 4 },
    { code: '963', city: 'Нижний Новгород', mult: 1.15, w: 4.0 },
    { code: '964', city: 'Омск', mult: 1.15, w: 4.0 },
    { code: '965', city: 'Челябинск', mult: 1.15, w: 4.0 },
    { code: '966', city: 'Кемерово', mult: 1.1, w: 3.0 },
    { code: '967', city: 'Рязань', mult: 1.1, w: 3.0 },
    { code: '968', city: 'Тула', mult: 1.1, w: 3.0 },
    { code: '969', city: 'Липецк', mult: 1.1, w: 3.0 },
    { code: '970', city: 'Грозный', mult: 1.36, w: 1.2 },
    { code: '971', city: 'Махачкала', mult: 1.36, w: 1.2 },
    { code: '972', city: 'Владикавказ', mult: 1.36, w: 1.2 },
    { code: '973', city: 'Улан-Удэ', mult: 1.46, w: 1.2 },
  ] },
  { id: 'tele3', name: 'Теле3', c: ['#eceef3', '#b8bdcc', '#7c8399'], codes: [
    { code: '995', city: 'Москва', mult: 1.45, w: 10 },
    { code: '901', city: 'Санкт-Петербург', mult: 1.3, w: 8 },
    { code: '904', city: 'Екатеринбург', mult: 1.14, w: 6 },
    { code: '923', city: 'Новосибирск', mult: 1.09, w: 6 },
    { code: '908', city: 'Краснодар', mult: 1.09, w: 6 },
    { code: '999', city: 'Россия', mult: 1.56, w: 7 },
    { code: '974', city: 'Ростов-на-Дону', mult: 1.14, w: 4.0 },
    { code: '975', city: 'Уфа', mult: 1.14, w: 4.0 },
    { code: '976', city: 'Красноярск', mult: 1.14, w: 4.0 },
    { code: '978', city: 'Киров', mult: 1.09, w: 3.0 },
    { code: '979', city: 'Чебоксары', mult: 1.09, w: 3.0 },
    { code: '980', city: 'Калуга', mult: 1.09, w: 3.0 },
    { code: '981', city: 'Белгород', mult: 1.09, w: 3.0 },
    { code: '982', city: 'Чита', mult: 1.45, w: 1.2 },
    { code: '983', city: 'Салехард', mult: 1.66, w: 1.2 },
    { code: '984', city: 'Ханты-Мансийск', mult: 1.45, w: 1.2 },
    { code: '986', city: 'Калининград', mult: 1.35, w: 1.2 },
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
export const CRAFT = { COUNT: 10, FEE: 0.05, ROUND: 50 };

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
  { tier: 0, name: 'Обычная', cost: CONFIG.SPIN_COST, avg: 370 },
  { tier: 1, name: 'Необычный+', cost: 2560, avg: 2560 },
  { tier: 2, name: 'Редкий+', cost: 5775, avg: 5775 },
  { tier: 3, name: 'Эпический+', cost: 19350, avg: 19350 },
  { tier: 4, name: 'Легендарный+', cost: 96800, avg: 96800 },
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
