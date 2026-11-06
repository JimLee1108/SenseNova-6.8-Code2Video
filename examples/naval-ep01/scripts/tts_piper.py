"""Offline fallback for tts.py using Piper (edge-tts websocket is blocked in this VM).

usage: python3 tts_piper.py LINES.json OUT_DIR --model assets/voices/zh_CN-huayan-medium.onnx

Same LINES.json format and the same OUT_DIR/timing.json layout as tts.py (per line: wav, duration,
measured speech onset/offset), so the renderer and mixer don't care which engine produced the voice.
"rate" like "-4%" is mapped to Piper's length_scale (slower = larger). No word timings.
"""
import json, subprocess, sys, wave
from pathlib import Path
import numpy as np

SR = 48000

def load(p):
    with wave.open(str(p)) as w:
        return np.frombuffer(w.readframes(w.getnframes()), "<i2").astype(np.float32) / 32768

def main():
    if len(sys.argv) < 3 or "--model" not in sys.argv: sys.exit(__doc__)
    cfg = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    out = Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
    model = sys.argv[sys.argv.index("--model") + 1]
    from piper import PiperVoice
    from piper.config import SynthesisConfig
    voice = PiperVoice.load(model)
    res = {"engine": "piper", "voice": Path(model).stem, "lines": []}
    for ln in cfg["lines"]:
        say = ln["say"]; rate = ln.get("rate", cfg.get("rate", "+0%"))
        pct = float(rate.strip("%")) / 100.0
        syn = SynthesisConfig(length_scale=1.0 / (1.0 + pct))
        raw, wav = out / f"{ln['id']}_raw.wav", out / f"{ln['id']}.wav"
        with wave.open(str(raw), "wb") as w:
            voice.synthesize_wav(say, w, syn_config=syn)
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(raw), "-ac", "1", "-ar", str(SR), str(wav)], check=True)
        a = load(wav)
        fr = a[: len(a) // 480 * 480].reshape(-1, 480); db = 20 * np.log10(np.sqrt((fr ** 2).mean(1)) + 1e-9)
        on = np.flatnonzero(db > db.max() - 38)
        onset, offset = (on[0] * 0.01, (on[-1] + 1) * 0.01) if len(on) else (0.0, len(a) / SR)
        res["lines"].append({"id": ln["id"], "say": say, "show": ln.get("show", say), "rate": rate, "wav": str(wav),
                             "duration": round(len(a) / SR, 3), "onset": round(onset, 3), "offset": round(offset, 3), "words": []})
        print(f"{ln['id']:6s} {len(a) / SR:6.2f} s  speech {onset:5.2f}-{offset:5.2f}  {len(say)} chars  {(len(say) / max(offset - onset, .1)):.1f} chars/s")
    (out / "timing.json").write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")

if __name__ == "__main__":
    main()
