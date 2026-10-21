// Читает длительность каждого WAV и записывает src/narration.ts —
// по нему строятся длительности сцен и субтитры.
import fs from 'node:fs';

const items = JSON.parse(fs.readFileSync('scripts/narration.json', 'utf8'));

function wavSeconds(file) {
  const buf = fs.readFileSync(file);
  let off = 12;
  let byteRate = 0;
  while (off < buf.length) {
    const id = buf.toString('ascii', off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    if (id === 'fmt ') byteRate = buf.readUInt32LE(off + 16);
    if (id === 'data') return size / byteRate;
    off += 8 + size + (size % 2);
  }
  throw new Error(`Нет data-блока в ${file}`);
}

const out = items.map((it) => ({ ...it, seconds: Math.round(wavSeconds(`public/voice/${it.id}.wav`) * 100) / 100 }));
const ts = `// Сгенерировано scripts/timeline.mjs — не редактировать вручную.
export type NarrationId = ${out.map((o) => `'${o.id}'`).join(' | ')};

export const NARRATION: Record<NarrationId, { text: string; seconds: number }> = {
${out.map((o) => `  ${o.id}: { text: ${JSON.stringify(o.text)}, seconds: ${o.seconds} },`).join('\n')}
};
`;
fs.writeFileSync('src/narration.ts', ts);
console.log(out.map((o) => `${o.id}: ${o.seconds}s`).join('\n'));
console.log('total', out.reduce((a, o) => a + o.seconds, 0).toFixed(1));
