// Копирует игровую логику из webapp/js в server/src/shared, убирая ?v=… из импортов (их ставит npm run stamp для кеша браузера).
// Сервер и клиент считают игру одним и тем же кодом. Запускается автоматически перед деплоем и тестами.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const FILES = ['config.js', 'flags.js', 'registry.js', 'generator.js', 'game.js', 'state.js'];
const from = new URL('../webapp/js/', import.meta.url);
const to = new URL('../server/src/shared/', import.meta.url);
mkdirSync(to, { recursive: true });
for (const f of FILES) {
  const src = readFileSync(new URL(f, from), 'utf8').replace(/(from\s+'\.\/[\w.-]+\.js)\?v=\w+'/g, "$1'");
  writeFileSync(new URL(f, to), `// Копия webapp/js/${f}. Не править: scripts/sync-shared.js перезапишет.\n${src}`);
}
console.log(`shared: ${FILES.length} файлов`);
