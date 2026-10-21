"""Озвучка нейроголосом Microsoft (edge-tts) по scripts/narration.json.

Результат: public/voice/<id>.wav (44.1 кГц, моно) — формат, который ждут timeline.mjs и ролик.
Запуск:  python scripts/voice_neural.py [--voice ru-RU-SvetlanaNeural] [--rate +5%]
"""
import argparse
import asyncio
import json
import pathlib
import subprocess

import edge_tts

ROOT = pathlib.Path(__file__).resolve().parent.parent
FFMPEG = ROOT / "node_modules" / "@remotion" / "compositor-win32-x64-msvc" / "ffmpeg.exe"


async def synth(text: str, voice: str, rate: str, mp3: pathlib.Path) -> None:
    await edge_tts.Communicate(text, voice, rate=rate).save(str(mp3))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default="ru-RU-DmitryNeural")
    ap.add_argument("--rate", default="+4%")
    args = ap.parse_args()

    out = ROOT / "public" / "voice"
    out.mkdir(parents=True, exist_ok=True)
    items = json.loads((ROOT / "scripts" / "narration.json").read_text(encoding="utf-8"))
    for item in items:
        mp3 = out / f"{item['id']}.mp3"
        wav = out / f"{item['id']}.wav"
        asyncio.run(synth(item["text"], args.voice, args.rate, mp3))
        subprocess.run(
            [str(FFMPEG), "-hide_banner", "-loglevel", "error", "-y", "-i", str(mp3), "-ar", "44100", "-ac", "1", "-c:a", "pcm_s16le", str(wav)],
            check=True,
        )
        mp3.unlink()
        print("voice:", item["id"])


if __name__ == "__main__":
    main()
