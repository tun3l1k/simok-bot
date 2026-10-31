// Сброс кеша: ставит новую версию ?v=… на все подключения файлов в webapp/.
// Без этого Telegram на iPhone может показать новый index.html со старыми js/css.
// Запускай перед каждым коммитом: npm run stamp
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const v = Date.now().toString(36);
const dir = new URL('../webapp/', import.meta.url).pathname;

const jsDir = join(dir, 'js');
for (const f of readdirSync(jsDir).filter((x) => x.endsWith('.js'))) {
  const p = join(jsDir, f);
  const src = readFileSync(p, 'utf8');
  const out = src.replace(/(from\s+'\.\/[\w.-]+\.js)(\?v=\w+)?'/g, `$1?v=${v}'`);
  if (out !== src) writeFileSync(p, out);
}
const html = join(dir, 'index.html');
const h = readFileSync(html, 'utf8')
  .replace(/(css\/style\.css)(\?v=\w+)?"/, `$1?v=${v}"`)
  .replace(/(js\/main\.js)(\?v=\w+)?"/, `$1?v=${v}"`);
writeFileSync(html, h);
console.log(`версия файлов: ${v}`);
