"""Procedural sound track for 《纳瓦尔宝典》 (21 sentences, 170s).
Mixes narration from build/vo/ + procedural score and foley from build/events.json.
Mastered to -14 LUFS, true peak <= -1 dBTP.
"""
import json, subprocess, wave
from pathlib import Path
import numpy as np
import sys
sys.path.append(str(Path(__file__).parent / "scripts"))
from synth import *

SR = 48000

def load_wav(p):
    with wave.open(str(p)) as w:
        return np.frombuffer(w.readframes(w.getnframes()), "<i2").astype(np.float32) / 32768

def main():
    vo_timing = json.loads(Path("build/vo/timing.json").read_text())
    events = json.loads(Path("build/events.json").read_text())
    timeline = json.loads(Path("build/timeline.json").read_text())
    dur = float(timeline["DUR"])
    start_times = timeline["START"]
    
    # 1. Voice track (mono)
    voice_track = np.zeros(int(round(dur * SR)), dtype=np.float32)
    for i, line in enumerate(vo_timing["lines"]):
        if i >= len(start_times):
            break
        t_start = start_times[i]
        wav_path = Path("build/vo") / f"{line['id']}.wav"
        if not wav_path.exists():
            continue
        data = load_wav(wav_path)
        idx = int(round(t_start * SR))
        end_idx = min(idx + len(data), len(voice_track))
        voice_track[idx:end_idx] += data[:end_idx - idx]
        
    # Voice envelope for ducking
    voice_env = envelope_follow(voice_track, attack=0.04, release=0.30)
    
    # 2. Procedural Music Track (BGM)
    # Warm contemplative chords progression on soft pad:
    # 4-bar cycles evolving across the 170s narrative:
    # Act 1 (0-33s): Fmaj7 -> G -> Em -> Am
    # Act 2 (33-68s): Dm7 -> G7 -> Cmaj7 -> Am
    # Act 3 (68-121s): Fmaj7 -> G -> Em7 -> A7 -> Dm9 -> Gsus4 -> C
    # Act 4 (121-170s): Am -> Fmaj7 -> Dm7 -> G -> Cmaj9 (resolving grandly)
    bgm = Mix(dur=dur)
    
    progression_chords = [
        # Act 1
        (0.0, 8.5, [mtof(m) for m in (53, 57, 60, 64)]),    # Fmaj7
        (8.5, 8.5, [mtof(m) for m in (55, 59, 62, 67)]),    # G
        (17.0, 8.0, [mtof(m) for m in (52, 55, 59, 64)]),   # Em7
        (25.0, 8.0, [mtof(m) for m in (57, 60, 64, 67)]),   # Am
        
        # Act 2
        (33.0, 7.5, [mtof(m) for m in (50, 53, 57, 60)]),   # Dm7
        (40.5, 7.5, [mtof(m) for m in (55, 59, 62, 65)]),   # G7
        (48.0, 8.0, [mtof(m) for m in (48, 55, 60, 64)]),   # Cmaj7
        (56.0, 7.0, [mtof(m) for m in (57, 60, 64, 69)]),   # Am
        (63.0, 6.0, [mtof(m) for m in (53, 57, 60, 64)]),   # Fmaj7
        
        # Act 3
        (69.0, 8.0, [mtof(m) for m in (55, 59, 62, 67)]),   # G
        (77.0, 8.5, [mtof(m) for m in (50, 53, 57, 62)]),   # Dm7
        (85.5, 8.0, [mtof(m) for m in (48, 55, 60, 64)]),   # C
        (93.5, 8.0, [mtof(m) for m in (53, 57, 60, 65)]),   # Fmaj7
        (101.5, 8.0, [mtof(m) for m in (55, 59, 62, 67)]),  # G
        (109.5, 8.0, [mtof(m) for m in (57, 60, 64, 67)]),  # Am
        (117.5, 6.5, [mtof(m) for m in (53, 57, 60, 64)]),  # Fmaj7
        
        # Act 4
        (124.0, 8.5, [mtof(m) for m in (55, 58, 62, 65)]),  # Gm7 (tension)
        (132.5, 8.5, [mtof(m) for m in (52, 55, 59, 62)]),  # Em7
        (141.0, 8.5, [mtof(m) for m in (50, 53, 57, 60)]),  # Dm7
        (149.5, 8.5, [mtof(m) for m in (55, 59, 62, 67)]),  # G
        (158.0, 12.0, [mtof(m) for m in (48, 55, 59, 64)])  # Cmaj9 finale
    ]
    
    for t_c, chord_dur, freqs in progression_chords:
        p = pad(freqs, chord_dur, detune=0.005, cutoff=1600)
        bgm.add(p, at=t_c, gain=0.22, pan=0.0)
        
    # Gentle pluck accents during scene transitions / key moments
    plucks = [
        (0.8, mtof(72)), (8.5, mtof(74)), (17.2, mtof(71)), (25.0, mtof(69)),
        (33.2, mtof(72)), (40.5, mtof(76)), (48.2, mtof(72)), (56.5, mtof(74)),
        (63.2, mtof(76)), (69.5, mtof(79)), (77.2, mtof(74)), (85.8, mtof(72)),
        (93.8, mtof(76)), (101.5, mtof(79)), (109.8, mtof(81)), (117.8, mtof(76)),
        (124.5, mtof(70)), (133.0, mtof(74)), (141.5, mtof(72)), (150.0, mtof(76)),
        (158.5, mtof(72)), (160.0, mtof(76)), (162.0, mtof(79))
    ]
    for t_p, f in plucks:
        bgm.add(pluck(f, dur=2.0, damp=0.994, bright=0.4), at=t_p, gain=0.18, pan=0.15)
        
    # Duck BGM under voice
    bgm.duck(voice_env, depth_db=13.0)
    
    # 3. Foley / Sound Effects Track
    sfx = Mix(dur=dur)
    for ev in events:
        name = ev["name"]
        t_ev = float(ev["t"])
        if name == "coin":
            sfx.add(click(freq=3200, dur=0.02, seed=int(t_ev*100)), at=t_ev, gain=0.35, pan=0.25)
        elif name == "whoosh":
            sfx.add(whoosh(dur=0.5, f_lo=400, f_hi=2200, seed=1), at=t_ev, gain=0.25)
        elif name == "draw":
            sfx.add(noise(dur=0.4, seed=2, color="pink"), at=t_ev, gain=0.12)
        elif name == "thud":
            sfx.add(thud(dur=0.35, seed=3), at=t_ev, gain=0.45)
        elif name == "hit":
            sfx.add(layer(thud(dur=0.4, seed=4), click(freq=1800, dur=0.03)), at=t_ev, gain=0.55)
        elif name == "chime_soft":
            sfx.add(chime(freq=660, dur=2.2), at=t_ev, gain=0.25, pan=-0.2)
        elif name == "pop":
            sfx.add(pop(f0=250, f1=650, dur=0.08), at=t_ev, gain=0.35)
        elif name == "pop_low":
            sfx.add(pop(f0=180, f1=380, dur=0.09), at=t_ev, gain=0.3)
        elif name == "tap":
            sfx.add(tap(freq=750, dur=0.06), at=t_ev, gain=0.3)
        elif name == "thud_soft":
            sfx.add(thud(dur=0.25, seed=5), at=t_ev, gain=0.3)
        elif name == "rise":
            sfx.add(whoosh(dur=1.2, f_lo=200, f_hi=1200, seed=6), at=t_ev, gain=0.22)
        elif name == "chime":
            sfx.add(chime(freq=880, dur=2.5), at=t_ev, gain=0.35)
        elif name == "chime_end":
            sfx.add(chime(freq=523.25, dur=4.5), at=t_ev, gain=0.40)
            
    # Combine All Stems: Voice (center) + BGM + SFX
    total_mix = Mix(dur=dur)
    total_mix.add(voice_track, at=0.0, gain=1.1, pan=0.0)
    total_mix.add(bgm.buf, at=0.0, gain=1.0)
    total_mix.add(sfx.buf, at=0.0, gain=1.0)
    total_mix.fade(fin=0.08, fout=1.2)
    
    raw_mix_path = "build/mix_raw.wav"
    total_mix.write(raw_mix_path)
    
    # Master using ffmpeg loudnorm (-14 LUFS, TP -1 dBTP)
    master_path = "build/master.wav"
    cmd_measure = [
        "ffmpeg", "-y", "-i", raw_mix_path,
        "-af", "loudnorm=I=-14:TP=-1:LRA=11:print_format=json",
        "-f", "null", "-"
    ]
    proc = subprocess.run(cmd_measure, capture_output=True, text=True)
    out = proc.stderr
    idx_json = out.rfind("{")
    if idx_json != -1:
        stats = json.loads(out[idx_json:out.rfind("}")+1])
        cmd_norm = [
            "ffmpeg", "-y", "-i", raw_mix_path,
            "-af", f"loudnorm=I=-14:TP=-1:LRA=11:measured_I={stats['input_i']}:measured_TP={stats['input_tp']}:measured_LRA={stats['input_lra']}:measured_thresh={stats['input_thresh']}:offset={stats['target_offset']}:linear=true",
            "-ar", "48000", master_path
        ]
        subprocess.run(cmd_norm, check=True)
    else:
        subprocess.run(["ffmpeg", "-y", "-i", raw_mix_path, "-af", "loudnorm=I=-14:TP=-1", "-ar", "48000", master_path], check=True)
    print("Mastered audio created at", master_path)

if __name__ == "__main__":
    main()
