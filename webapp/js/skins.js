// Внешний вид SIM каждого оператора: по духу как реальные карточки, но свои названия и знаки.
// bg — фон, ink — цвет текста, art — декор (SVG в рамке 300×180), logo — знак рядом с названием.
const rect = (x, y, w, h, rx, f, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}" ${extra}/>`;

export const SKINS = {
  // красная карта, белый скруглённый знак (как у крупного красного оператора)
  mgs: {
    bg: 'linear-gradient(135deg,#ff2a36,#e30613 60%,#b9000d)', ink: '#fff',
    art: `<circle cx="285" cy="20" r="95" fill="#fff" opacity=".08"/><circle cx="20" cy="190" r="80" fill="#000" opacity=".08"/>`,
    logo: `<svg viewBox="0 0 30 30" width="26" height="26" aria-hidden="true">${rect(0, 0, 30, 30, 9, '#fff')}<ellipse cx="15" cy="16" rx="8" ry="6.5" fill="#e30613"/><rect x="9" y="9" width="12" height="6" rx="3" fill="#e30613"/></svg>`,
  },
  // тёмная карта с неоновым голубым акцентом
  yoga: {
    bg: 'linear-gradient(135deg,#1b2432,#0b111b 70%)', ink: '#fff',
    art: `<path d="M0 176Q100 160 200 174T300 164V180H0z" fill="#00aff0"/><path d="M300 52Q250 60 215 100" stroke="#2ee6ff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/><path d="M300 68Q262 76 236 106" stroke="#00aff0" stroke-width="5" fill="none" stroke-linecap="round" opacity=".9"/>`,
    logo: `<svg viewBox="0 0 30 30" width="26" height="26" aria-hidden="true"><circle cx="15" cy="15" r="14" fill="none" stroke="#00c3ff" stroke-width="3"/><path d="M9 11l6 6 6-6M15 17v7" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
  // зелёная карта с фиолетовой лентой, знак-лисья мордочка
  megafox: {
    bg: 'linear-gradient(135deg,#3fd66a,#00b956 55%,#00873f)', ink: '#fff',
    art: `<path d="M300 0v110Q230 60 190 0z" fill="#6a2fd1" opacity=".92"/><path d="M300 40v70Q270 80 250 40z" fill="#9a63ff" opacity=".7"/>`,
    logo: `<svg viewBox="0 0 30 30" width="26" height="26" aria-hidden="true"><path d="M3 3l8 5h8l8-5-2 12c0 7-5 12-10 12S5 22 5 15z" fill="#fff"/><circle cx="11" cy="15" r="1.7" fill="#00a74f"/><circle cx="19" cy="15" r="1.7" fill="#00a74f"/><path d="M13 21h4l-2 2z" fill="#00a74f"/></svg>`,
  },
  // жёлтая карта с чёрными диагональными полосами
  bilait: {
    bg: 'linear-gradient(135deg,#ffd91a,#ffcc00)', ink: '#111',
    art: `<clipPath id="bc"><rect x="120" y="40" width="180" height="84"/></clipPath><g clip-path="url(#bc)"><g transform="rotate(-24 210 82)" fill="#111"><rect x="60" y="52" width="300" height="12"/><rect x="60" y="76" width="300" height="12"/><rect x="60" y="100" width="300" height="12"/></g></g>`,
    logo: `<svg viewBox="0 0 30 30" width="26" height="26" aria-hidden="true"><circle cx="15" cy="15" r="14" fill="#111"/><g fill="#ffcc00"><rect x="5" y="9" width="20" height="3.2" rx="1.6"/><rect x="5" y="14" width="20" height="3.2" rx="1.6"/><rect x="5" y="19" width="20" height="3.2" rx="1.6"/></g></svg>`,
  },
  // чёрная карта с белой надписью и яркой точкой
  tele3: {
    bg: 'linear-gradient(135deg,#2a2a2e,#0d0d0f 70%)', ink: '#fff',
    art: `<circle cx="252" cy="92" r="28" fill="#ff2d87"/><circle cx="252" cy="92" r="44" fill="none" stroke="#ff2d87" stroke-width="2" opacity=".5"/>`,
    logo: `<svg viewBox="0 0 30 30" width="26" height="26" aria-hidden="true"><rect width="30" height="30" rx="8" fill="#fff"/><text x="15" y="21.5" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="17" fill="#0d0d0f">3</text></svg>`,
  },
  // «любой оператор»
  any: {
    bg: 'linear-gradient(135deg,#f4f1ff,#cfc6f0 55%,#a99be0)', ink: '#17112b',
    art: '', logo: '',
  },
};

export const skinOf = (id) => SKINS[id] ?? SKINS.any;
