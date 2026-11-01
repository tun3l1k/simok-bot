// Внешний вид SIM каждого оператора. Всё нарисовано с нуля: свои знаки и свои фоны, без чужих логотипов.
// bg — фон, ink — цвет текста, art — декор (SVG в рамке 300×180), logo — знак рядом с названием.
const rect = (x, y, w, h, rx, f) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}"/>`;

export const SKINS = {
  // МГС: красная карта, кольца и шестиугольный знак с буквой «М»
  mgs: {
    bg: 'linear-gradient(135deg,#ff3a45,#e0101f 60%,#a8000f)', ink: '#fff',
    art: `<g fill="none" stroke="#fff" opacity=".16" stroke-width="2"><circle cx="262" cy="30" r="46"/><circle cx="262" cy="30" r="72"/><circle cx="262" cy="30" r="98"/></g><path d="M0 130L120 180H0z" fill="#000" opacity=".12"/>`,
    logo: `<svg viewBox="0 0 30 30" width="26" height="26" aria-hidden="true"><path d="M15 1.5l11.7 6.75v13.5L15 28.5 3.3 21.75V8.25z" fill="#fff"/><path d="M9 21V10l6 6 6-6v11" stroke="#e0101f" stroke-width="2.6" fill="none" stroke-linejoin="round" stroke-linecap="round"/></svg>`,
  },
  // Йога: тёмная карта с бирюзовым свечением и лотосом
  yoga: {
    bg: 'linear-gradient(135deg,#17303b,#0a141c 70%)', ink: '#fff',
    art: `<circle cx="258" cy="104" r="64" fill="#19d3c5" opacity=".13"/><g transform="translate(258 116)" fill="#19d3c5"><ellipse cx="0" cy="-26" rx="11" ry="26" opacity=".9"/><ellipse cx="0" cy="-26" rx="11" ry="26" transform="rotate(-42)" opacity=".7"/><ellipse cx="0" cy="-26" rx="11" ry="26" transform="rotate(42)" opacity=".7"/><ellipse cx="0" cy="-22" rx="9" ry="22" transform="rotate(-80)" opacity=".5"/><ellipse cx="0" cy="-22" rx="9" ry="22" transform="rotate(80)" opacity=".5"/></g>`,
    logo: `<svg viewBox="0 0 30 30" width="26" height="26" aria-hidden="true"><circle cx="15" cy="15" r="14" fill="#19d3c5"/><g fill="#0a141c"><ellipse cx="15" cy="12" rx="3.2" ry="7"/><ellipse cx="15" cy="12" rx="3.2" ry="7" transform="rotate(-50 15 20)"/><ellipse cx="15" cy="12" rx="3.2" ry="7" transform="rotate(50 15 20)"/></g></svg>`,
  },
  // MegaFox: зелёная карта с оранжевым лисьим хвостом
  megafox: {
    bg: 'linear-gradient(135deg,#43d96e,#00b45a 55%,#007f3b)', ink: '#fff',
    art: `<path d="M300 180V40Q250 60 215 120Q200 150 170 180z" fill="#ff8a1f" opacity=".95"/><path d="M300 180V90Q270 110 250 140Q240 160 225 180z" fill="#ffd9a8"/>`,
    logo: `<svg viewBox="0 0 30 30" width="26" height="26" aria-hidden="true"><path d="M3 3l8 5h8l8-5-2 12c0 7-5 12-10 12S5 22 5 15z" fill="#fff"/><circle cx="11" cy="15" r="1.7" fill="#00a74f"/><circle cx="19" cy="15" r="1.7" fill="#00a74f"/><path d="M13 21h4l-2 2z" fill="#00a74f"/></svg>`,
  },
  // Билайт: жёлтая карта с чёрным углом и точечной сеткой
  bilait: {
    bg: 'linear-gradient(135deg,#ffe02e,#ffcc00)', ink: '#111',
    art: `<path d="M300 46V146L232 96z" fill="#111"/><g fill="#111" opacity=".25">${[0, 1, 2, 3].map((r) => [0, 1, 2, 3, 4, 5].map((c) => `<circle cx="${150 + c * 12}" cy="${58 + r * 12}" r="2"/>`).join('')).join('')}</g>`,
    logo: `<svg viewBox="0 0 30 30" width="26" height="26" aria-hidden="true"><circle cx="15" cy="15" r="14" fill="#111"/><circle cx="15" cy="15" r="5.5" fill="#ffcc00"/><g stroke="#ffcc00" stroke-width="2" stroke-linecap="round"><path d="M15 4v3M15 23v3M4 15h3M23 15h3M7.2 7.2l2.1 2.1M20.7 20.7l2.1 2.1M7.2 22.8l2.1-2.1M20.7 9.3l2.1-2.1"/></g></svg>`,
  },
  // Теле3: чёрная карта с розовым кругом
  tele3: {
    bg: 'linear-gradient(135deg,#2a2a2e,#0d0d0f 70%)', ink: '#fff',
    art: `<circle cx="252" cy="92" r="28" fill="#ff2d87"/><circle cx="252" cy="92" r="44" fill="none" stroke="#ff2d87" stroke-width="2" opacity=".5"/>`,
    logo: `<svg viewBox="0 0 30 30" width="26" height="26" aria-hidden="true">${rect(0, 0, 30, 30, 8, '#fff')}<text x="15" y="21.5" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="17" fill="#0d0d0f">3</text></svg>`,
  },
  // «любой оператор»
  any: {
    bg: 'linear-gradient(135deg,#f4f1ff,#cfc6f0 55%,#a99be0)', ink: '#17112b',
    art: '', logo: '',
  },
};

export const skinOf = (id) => SKINS[id] ?? SKINS.any;
