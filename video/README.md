# Презентационный ролик FAKT

Ролик 16:9 (1920×1080, ~1:50) с объяснением продукта для клиента: настоящие экраны FAKT,
наезды камеры, подсветка ключевых мест, русская озвучка и субтитры.

Готовый файл: `out/fakt-presentation.mp4`.

## Как пересобрать

1. Запустите приложение FAKT (в корне проекта): `npm run dev` — оно должно открываться на http://localhost:5180.
2. Снимите свежие скриншоты (чистые демо-данные, двойное разрешение):
   ```bash
   node scripts/capture.mjs
   ```
3. Озвучка — текст в `scripts/narration.json`, нейроголос Microsoft «Дмитрий» (нужен интернет и `pip install edge-tts`):
   ```bash
   python scripts/voice_neural.py
   node scripts/timeline.mjs
   ```
   Женский голос: `python scripts/voice_neural.py --voice ru-RU-SvetlanaNeural`.
   `timeline.mjs` пересчитывает длительности сцен под новую озвучку.
4. Предпросмотр: `npm run dev`. Рендер:
   ```bash
   npx remotion render FaktPresentation out/fakt-presentation.mp4 --codec=h264 --crf=18
   ```

## Где что менять

- Тексты озвучки и субтитров — `scripts/narration.json`.
- Заголовки сцен, тезисы и движение камеры — `src/FaktVideo.tsx` (массив `SCREENS`).
- Цвета и шрифты — `src/theme.ts`.

Чтобы заменить синтезированный голос живым, положите свои WAV-файлы с теми же именами
в `public/voice/` и выполните `node scripts/timeline.mjs`.
