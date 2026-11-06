"""Offline Mandarin narration with Kokoro v1.1 (sherpa-onnx). Fallback for tts.py when edge-tts is unreachable.

usage: python3 tts_kokoro.py LINES.json OUT_DIR --model-dir assets/voices/kokoro [--sid 50]

Same LINES.json input and OUT_DIR/timing.json output layout as tts.py (wav, duration, measured speech
onset/offset per line; no word timings). "rate" like "-8%" maps to speed 0.92.
"""
import json, subprocess, sys, wave
from pathlib import Path
import numpy as np

SR = 48000

def arg(name, default=None):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default

def main():
    if len(sys.argv) < 3 or "--model-dir" not in sys.argv: sys.exit(__doc__)
    import sherpa_onnx
    cfg = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    out = Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
    d = Path(arg("--model-dir")); sid = int(arg("--sid", cfg.get("sid", 50)))
    only = set(arg("--only", "").split(",")) - {""}
    tts = sherpa_onnx.OfflineTts(sherpa_onnx.OfflineTtsConfig(
        model=sherpa_onnx.OfflineTtsModelConfig(
            kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(
                model=str(d / "model.onnx"), voices=str(d / "voices.bin"), tokens=str(d / "tokens.txt"),
                data_dir=str(d / "espeak-ng-data"), dict_dir=str(d / "dict"),
                lexicon=f"{d / 'lexicon-us-en.txt'},{d / 'lexicon-zh.txt'}"),
            num_threads=2),
        rule_fsts=f"{d / 'date-zh.fst'},{d / 'phone-zh.fst'},{d / 'number-zh.fst'}",
        max_num_sentences=1))
    res = {"engine": "kokoro-multi-lang-v1_1", "sid": sid, "lines": []}
    for ln in cfg["lines"]:
        if only and ln["id"] not in only: continue
        say = ln["say"]; rate = ln.get("rate", cfg.get("rate", "+0%"))
        speed = 1.0 + float(rate.strip("%")) / 100.0
        a = tts.generate(say, sid=int(ln.get("sid", sid)), speed=speed)
        x = np.asarray(a.samples, dtype=np.float32)
        raw, wav = out / f"{ln['id']}_raw.wav", out / f"{ln['id']}.wav"
        with wave.open(str(raw), "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(a.sample_rate)
            w.writeframes((np.clip(x, -1, 1) * 32767).astype("<i2").tobytes())
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(raw), "-ac", "1", "-ar", str(SR), str(wav)], check=True)
        with wave.open(str(wav)) as w:
            y = np.frombuffer(w.readframes(w.getnframes()), "<i2").astype(np.float32) / 32768
        fr = y[: len(y) // 480 * 480].reshape(-1, 480); db = 20 * np.log10(np.sqrt((fr ** 2).mean(1)) + 1e-9)
        on = np.flatnonzero(db > db.max() - 38)
        onset, offset = (on[0] * 0.01, (on[-1] + 1) * 0.01) if len(on) else (0.0, len(y) / SR)
        res["lines"].append({"id": ln["id"], "say": say, "show": ln.get("show", say), "rate": rate, "wav": str(wav),
                             "duration": round(len(y) / SR, 3), "onset": round(onset, 3), "offset": round(offset, 3), "words": []})
        print(f"{ln['id']:6s} {len(y) / SR:6.2f} s  speech {onset:5.2f}-{offset:5.2f}  {len(say)} chars  {len(say) / max(offset - onset, .1):.1f} chars/s", flush=True)
    if not only:
        (out / "timing.json").write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")

if __name__ == "__main__":
    main()
