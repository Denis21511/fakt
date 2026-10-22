// Общий 404.html сайта /fakt/ принадлежит приложению FAKT. Чтобы прямые ссылки
// /fakt/trace/... (QR-коды паспортов) открывали TRACE, в него добавляется переадресация.
// Берётся текущий 404.html из ветки gh-pages, результат кладётся в .pages-root/.
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const MARK = "var p = '/fakt/trace/'";
const SNIPPET = `<script>
      // Адреса приложения TRACE (/fakt/trace/...) передаём ему
      (function () {
        var p = '/fakt/trace/';
        if (location.pathname.indexOf(p) === 0) location.replace(p + '?r=' + encodeURIComponent(location.pathname.slice(p.length) + location.search) + location.hash);
      })();
    </script>`;

execSync('git fetch origin gh-pages', { stdio: 'inherit' });
const html = execSync('git show origin/gh-pages:404.html', { encoding: 'utf8' });
const patched = html.includes(MARK) ? html : html.replace('<head>', `<head>\n    ${SNIPPET}`);
if (!patched.includes(MARK)) throw new Error('В 404.html не найден <head> — переадресация не добавлена');

mkdirSync('.pages-root', { recursive: true });
writeFileSync('.pages-root/404.html', patched);
console.log(html === patched ? '404.html уже содержит переадресацию' : '404.html дополнен переадресацией для /fakt/trace/');
