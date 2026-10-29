// Маленькие SVG-флаги (24×16), чтобы не зависеть от эмодзи платформы: у Абхазии эмодзи-флага нет.
const svg = (inner) => `<svg class="flag" viewBox="0 0 24 16" aria-hidden="true">${inner}</svg>`;
const rows = (cols, h = 16 / cols.length) => cols.map((c, i) => `<rect y="${+(i * h).toFixed(2)}" width="24" height="${+h.toFixed(2)}" fill="${c}"/>`).join('');
const circle = (cx, cy, r, fill) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;

const usStripes = Array.from({ length: 13 }, (_, i) => (i % 2 ? '#fff' : '#b22234'));
const usStars = [[1.8, 1.4], [4.4, 1.4], [7, 1.4], [3.1, 3], [5.7, 3], [1.8, 4.6], [4.4, 4.6], [7, 4.6], [3.1, 6.2], [5.7, 6.2]]
  .map(([x, y]) => circle(x, y, 0.5, '#fff')).join('');

export const FLAGS = {
  ru: svg(rows(['#ffffff', '#0039a6', '#d52b1e'])),
  by: svg(`<rect width="24" height="10.7" fill="#c8313e"/><rect y="10.7" width="24" height="5.3" fill="#4aa657"/>
    <rect width="3.6" height="16" fill="#fff"/><path d="M1.8 2.2l1.1 1.5-1.1 1.5-1.1-1.5zM1.8 7.2l1.1 1.5-1.1 1.5-1.1-1.5zM1.8 12.2l1.1 1.5-1.1 1.5-1.1-1.5z" fill="#c8313e"/>`),
  kz: svg(`<rect width="24" height="16" fill="#00afca"/>${circle(12, 7, 3.2, '#fec50c')}<rect x="5" y="12.2" width="14" height="1.2" rx=".6" fill="#fec50c"/>`),
  ae: svg(`${rows(['#00732f', '#ffffff', '#000000'])}<rect width="6" height="16" fill="#ff0000"/>`),
  ab: svg(`${rows(['#0b8a3e', '#ffffff', '#0b8a3e', '#ffffff', '#0b8a3e', '#ffffff', '#0b8a3e'])}<rect width="9.6" height="9.15" fill="#d6262d"/>${circle(4.8, 4.6, 1.6, '#fff')}`),
  ua: svg(rows(['#0057b7', '#ffd700'])),
  de: svg(rows(['#000000', '#dd0000', '#ffce00'])),
  az: svg(`${rows(['#00b5e2', '#ef3340', '#509e2f'])}${circle(11, 8, 2.7, '#fff')}${circle(11.8, 8, 2.2, '#ef3340')}${circle(14.4, 8, 0.7, '#fff')}`),
  am: svg(rows(['#d90012', '#0033a0', '#f2a800'])),
  ge: svg(`<rect width="24" height="16" fill="#fff"/><rect x="10.5" width="3" height="16" fill="#e8112d"/><rect y="6.5" width="24" height="3" fill="#e8112d"/>
    ${[[5.2, 3.2], [18.8, 3.2], [5.2, 12.8], [18.8, 12.8]].map(([x, y]) => `<rect x="${x - 0.5}" y="${y - 1.4}" width="1" height="2.8" fill="#e8112d"/><rect x="${x - 1.4}" y="${y - 0.5}" width="2.8" height="1" fill="#e8112d"/>`).join('')}`),
  us: svg(`${rows(usStripes)}<rect width="10" height="8.6" fill="#3c3b6e"/>${usStars}`),
  uz: svg(`<rect width="24" height="16" fill="#1eb53a"/><rect width="24" height="5.2" fill="#0099b5"/><rect y="5.2" width="24" height="5.6" fill="#fff"/>
    <rect y="5" width="24" height=".5" fill="#ce1126"/><rect y="10.5" width="24" height=".5" fill="#ce1126"/>${circle(3.6, 2.6, 1.5, '#fff')}${circle(4.2, 2.6, 1.3, '#0099b5')}`),
};
