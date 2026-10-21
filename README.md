# FAKT — контроль прибыли заказов

MVP для небольших металлообрабатывающих производств: план, факт и прибыль по каждому заказу.

```bash
npm install
npm run dev      # http://localhost:5180
npm run build    # проверка типов и сборка в dist/
```

**Онлайн-демо:** https://denis21511.github.io/fakt/

Обновить демо после изменений: `npm run deploy` — собирает сайт и выкладывает его в ветку `gh-pages`.

Стек: Vite, React 18, TypeScript, Zustand, Recharts, Lucide, шрифты Manrope и Inter.

**Демо-режим.** Сервера нет: данные хранятся в localStorage браузера (ключ `fakt:data:v1`)
и не синхронизируются между устройствами. Демо-данные восстанавливаются в «Настройках».

Формулы расчёта — в `src/lib/calc.ts`.

**Пресеты демо.** Данные и отраслевые тексты лежат в `src/lib/presets/`; по умолчанию — металлообработка.
Пресет выбирается режимом Vite (`.env.<режим>`), у каждого свой ключ localStorage:

```bash
npm run dev:gorniza     # студия интерьерного дизайна, http://localhost:5182
npm run build:gorniza   # сборка в dist-gorniza/
npm run deploy:gorniza  # публикация в https://denis21511.github.io/fakt/gorniza/

npm run dev:uniapart     # дизайн и ремонт, Сочи, http://localhost:5183
npm run build:uniapart   # сборка в dist-uniapart/
npm run deploy:uniapart  # публикация в https://denis21511.github.io/fakt/uniapart/

npm run dev:alfastroy     # ремонт и строительство, Северск/Томск, http://localhost:5184
npm run build:alfastroy   # сборка в dist-alfastroy/
npm run deploy:alfastroy  # публикация в https://denis21511.github.io/fakt/alfastroy/
```

Все `deploy` выкладывают с `--add`, чтобы не стирать друг друга в ветке `gh-pages`.
