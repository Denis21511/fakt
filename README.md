# FAKT — контроль прибыли заказов

MVP для небольших металлообрабатывающих производств: план, факт и прибыль по каждому заказу.

```bash
npm install
npm run dev      # http://localhost:5180
npm run build    # проверка типов и сборка в dist/
```

Стек: Vite, React 18, TypeScript, Zustand, Recharts, Lucide, шрифты Manrope и Inter.

**Демо-режим.** Сервера нет: данные хранятся в localStorage браузера (ключ `fakt:data:v1`)
и не синхронизируются между устройствами. Демо-данные восстанавливаются в «Настройках».

Формулы расчёта — в `src/lib/calc.ts`.
