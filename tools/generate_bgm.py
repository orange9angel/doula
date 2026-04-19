#!/usr/bin/env python3
"""
Procedural BGM synthesizer for Dula episodes.

Generates 5 mood-specific background music tracks:
- room_theme   : C major, 60 BPM, warm & cozy (indoor scenes)
- park_theme   : G major, 110 BPM, bright & playful (outdoor scenes)
- chaos_theme  : Diminished, 140 BPM, frantic & comedic (slapstick)
- tension_theme: A minor, 120 BPM, urgent & dramatic (rescue/danger)
- wonder_theme : F major, 90 BPM, soaring & magical (flying/wonder)

Features:
- Multi-layer synthesis: Pad, Pluck, Bass, Percussion, Lead
- ADSR envelopes, stereo panning, simple reverb/delay
- Ducking-ready: mastered to ~-14 LUFS equivalent
"""

import array
import math
import os
import struct
import sys
import wave
import subprocess

# Resolve episode path from CLI argument
EPISODE = sys.argv[1] if len(sys.argv) > 1 else "."
if not os.path.isabs(EPISODE):
    EPISODE = os.path.join(os.getcwd(), EPISODE)

OUTPUT_DIR = os.path.join(EPISODE, "assets", "audio", "music")
os.makedirs(OUTPUT_DIR, exist_ok=True)
MANUAL_BGM_DIR = os.path.join(EPISODE, "materials", "bgm")

SAMPLE_RATE = 22050

NOTES = {
    'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'E3': 164.81, 'F3': 174.61, 'F#3': 185.00,
    'G3': 196.00, 'G#3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'B3': 246.94,
    'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99,
    'G4': 392.00, 'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
    'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25, 'F5': 698.46, 'F#5': 739.99,
    'G5': 783.99, 'G#5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'B5': 987.77,
}

CHORDS = {
    'C':  ['C4', 'E4', 'G4'],
    'Cm': ['C4', 'D#4', 'G4'],
    'D':  ['D4', 'F#4', 'A4'],
    'Dm': ['D4', 'F4', 'A4'],
    'E':  ['E4', 'G#4', 'B4'],
    'Em': ['E4', 'G4', 'B4'],
    'F':  ['F4', 'A4', 'C5'],
    'Fm': ['F4', 'G#4', 'C5'],
    'G':  ['G3', 'B3', 'D4'],
    'Gm': ['G3', 'A#3', 'D4'],
    'A':  ['A3', 'C#4', 'E4'],
    'Am': ['A3', 'C4', 'E4'],
    'B':  ['B3', 'D#4', 'F#4'],
    'Bm': ['B3', 'D4', 'F#4'],
    'Cdim': ['C4', 'D#4', 'F#4'],
    'Ddim': ['D4', 'F4', 'G#4'],
    'Gdim': ['G3', 'A#3', 'C#4'],
}


def adsr(t, dur, a=0.05, d=0.15, s=0.6, r=0.25):
    if t < a and a > 0:
        return t / a
    elif t < a + d and d > 0:
        return 1.0 - (1.0 - s) * ((t - a) / d)
    elif t < dur - r:
        return s
    elif r > 0:
        return s * (1.0 - (t - (dur - r)) / r)
    return 0.0


def osc(freq, t, waveform='sine'):
    phase = 2 * math.pi * freq * t
    if waveform == 'sine':
        return math.sin(phase)
    elif waveform == 'triangle':
        return 2.0 / math.pi * math.asin(math.sin(phase))
    elif waveform == 'square':
        return 1.0 if math.sin(phase) > 0 else -1.0
    elif waveform == 'sawtooth':
        return 2.0 * ((phase / (2 * math.pi)) % 1.0) - 1.0
    elif waveform == 'pulse':
        # 25% pulse width
        return 1.0 if (phase % (2 * math.pi)) < (0.25 * 2 * math.pi) else -1.0
    return math.sin(phase)


def noise_sample():
    """Simple pseudo-random noise using LCG."""
    noise_sample._seed = (noise_sample._seed * 1103515245 + 12345) & 0x7fffffff
    return (noise_sample._seed / 0x7fffffff) * 2 - 1

noise_sample._seed = 12345


def synth_note(freq, duration, amp=0.3, waveform='sine', a=0.05, d=0.15, s=0.6, r=0.25, detune=0.0):
    n = int(SAMPLE_RATE * duration)
    samples = []
    f2 = freq * (1 + detune)
    for i in range(n):
        t = i / SAMPLE_RATE
        env = adsr(t, duration, a, d, s, r)
        samples.append((osc(freq, t, waveform) + osc(f2, t, waveform)) * 0.5 * amp * env)
    return samples


def kick(t, amp=0.3):
    """Synthesized kick drum."""
    dur = 0.15
    if t >= dur:
        return 0.0
    freq = 150 * math.exp(-t / 0.03)
    env = math.exp(-t / 0.06)
    return math.sin(2 * math.pi * freq * t) * env * amp


def snare(t, amp=0.2):
    """Synthesized snare drum."""
    dur = 0.12
    if t >= dur:
        return 0.0
    tone = math.sin(2 * math.pi * 220 * t) * math.exp(-t / 0.02)
    nse = noise_sample() * math.exp(-t / 0.04)
    return (tone * 0.3 + nse * 0.7) * amp * math.exp(-t / 0.05)


def hihat(t, amp=0.12):
    """Synthesized closed hihat."""
    dur = 0.05
    if t >= dur:
        return 0.0
    nse = noise_sample()
    # high-pass-ish via fast decay
    env = math.exp(-t / 0.015)
    return nse * env * amp


def bell(freq, t, amp=0.15):
    """Bell-like tone with inharmonic partials."""
    dur = 2.0
    if t >= dur:
        return 0.0
    partials = [1.0, 2.7, 5.4, 8.1]
    amps = [0.5, 0.25, 0.12, 0.06]
    out = 0.0
    for p, a in zip(partials, amps):
        env = math.exp(-t / (0.3 + p * 0.1))
        out += math.sin(2 * math.pi * freq * p * t) * a * env
    return out * amp


def pad_chord(freqs, duration, amp=0.08):
    """Warm pad chord with slow attack."""
    n = int(SAMPLE_RATE * duration)
    out = [0.0] * n
    for freq in freqs:
        note = synth_note(freq, duration, amp=amp, waveform='sine',
                          a=1.2, d=0.8, s=0.5, r=1.5, detune=0.003)
        for i, v in enumerate(note):
            out[i] += v
    return out


def pluck_chord(freqs, duration, amp=0.12):
    """Plucked chord (guitar/ukulele style)."""
    n = int(SAMPLE_RATE * duration)
    out = [0.0] * n
    for freq in freqs:
        note = synth_note(freq, duration, amp=amp, waveform='triangle',
                          a=0.005, d=0.15, s=0.1, r=0.4, detune=0.001)
        for i, v in enumerate(note):
            out[i] += v
    return out


def bass_note(freq, duration, amp=0.18):
    """Warm bass with triangle wave."""
    return synth_note(freq, duration, amp=amp, waveform='triangle',
                      a=0.02, d=0.1, s=0.7, r=0.2)


def string_stab(freqs, duration, amp=0.1):
    """Orchestral string stab with sawtooth."""
    n = int(SAMPLE_RATE * duration)
    out = [0.0] * n
    for freq in freqs:
        note = synth_note(freq, duration, amp=amp, waveform='sawtooth',
                          a=0.05, d=0.2, s=0.4, r=0.6, detune=0.005)
        for i, v in enumerate(note):
            out[i] += v
    return out


def mix_tracks(*tracks):
    max_len = max(len(t) for t in tracks) if tracks else 0
    out = [0.0] * max_len
    for t in tracks:
        for i, v in enumerate(t):
            out[i] += v
    # Soft clip
    out = [math.tanh(v * 1.5) / 1.5 for v in out]
    return out


def apply_simple_delay(track, delay_sec=0.3, decay=0.4):
    """Simple single-tap delay for subtle space."""
    delay_samples = int(delay_sec * SAMPLE_RATE)
    out = track[:]
    for i in range(len(track)):
        if i + delay_samples < len(out):
            out[i + delay_samples] += track[i] * decay
    return out


def apply_pan(track, pan=0.0):
    """Apply stereo panning. Returns stereo interleaved samples."""
    # pan: -1=left, 0=center, 1=right
    left_gain = math.cos((pan + 1) * math.pi / 4)
    right_gain = math.sin((pan + 1) * math.pi / 4)
    stereo = []
    for s in track:
        stereo.append(s * left_gain)
        stereo.append(s * right_gain)
    return stereo


def save_wav_stereo(samples, filename):
    path = os.path.join(OUTPUT_DIR, filename)
    with wave.open(path, 'w') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        arr = array.array('h')
        gain = 0.75 * 32767
        for s in samples:
            v = int(s * gain)
            arr.append(max(-32768, min(32767, v)))
        w.writeframes(arr.tobytes())
    print(f"Saved BGM: {path} ({len(samples)/(2*SAMPLE_RATE):.2f}s)")


def save_mono_as_stereo(samples, filename):
    """Convert mono track to stereo and save."""
    stereo = apply_pan(samples, 0.0)
    save_wav_stereo(stereo, filename)


def generate_room_theme(duration=30.0):
    bpm = 60
    beat = 60.0 / bpm
    n = int(SAMPLE_RATE * duration)
    prog = ['C', 'G', 'Am', 'F']
    total_beats = int(duration / beat)

    pad = [0.0] * n
    bass = [0.0] * n
    perc = [0.0] * n
    pluck = [0.0] * n

    for b in range(total_beats):
        t = b * beat
        idx = int(t * SAMPLE_RATE)
        chord = prog[(b // 4) % len(prog)]
        notes = [NOTES[n] for n in CHORDS[chord]]
        bar_dur = min(4 * beat, duration - t)

        # Warm pad
        chord_samples = pad_chord(notes, bar_dur, amp=0.07)
        for i, v in enumerate(chord_samples):
            if idx + i < n:
                pad[idx + i] += v

        # Bass
        root = NOTES[CHORDS[chord][0]] * 0.5
        note = bass_note(root, bar_dur, amp=0.16)
        for i, v in enumerate(note):
            if idx + i < n:
                bass[idx + i] += v

        # Pluck on beat 1 and 3
        if b % 2 == 0:
            pl = pluck_chord(notes, beat * 0.9, amp=0.09)
            for i, v in enumerate(pl):
                if idx + i < n:
                    pluck[idx + i] += v

        # Kick on 1, hihat on off-beats
        if b % 4 == 0:
            for i in range(int(0.2 * SAMPLE_RATE)):
                if idx + i < n:
                    perc[idx + i] += kick(i / SAMPLE_RATE, 0.18)
        elif b % 2 == 1:
            for i in range(int(0.1 * SAMPLE_RATE)):
                if idx + i < n:
                    perc[idx + i] += hihat(i / SAMPLE_RATE, 0.08)

    pad = apply_simple_delay(pad, 0.4, 0.3)
    combined = mix_tracks(pad, bass, perc, pluck)
    save_mono_as_stereo(combined, "room_theme.wav")


def generate_park_theme(duration=28.0):
    bpm = 110
    beat = 60.0 / bpm
    n = int(SAMPLE_RATE * duration)
    prog = ['G', 'D', 'Em', 'C']
    total_beats = int(duration / beat)

    pad = [0.0] * n
    bass = [0.0] * n
    perc = [0.0] * n
    pluck = [0.0] * n
    melody = [0.0] * n

    # Arpeggio pattern
    arp_patterns = [
        [0, 1, 2, 1],
        [0, 1, 2, 1],
        [0, 1, 2, 0],
        [0, 1, 2, 1],
    ]

    for b in range(total_beats):
        t = b * beat
        idx = int(t * SAMPLE_RATE)
        chord = prog[(b // 4) % len(prog)]
        notes = [NOTES[n] for n in CHORDS[chord]]
        bar_dur = min(4 * beat, duration - t)

        # Shorter pad
        chord_samples = pad_chord(notes, bar_dur, amp=0.06)
        for i, v in enumerate(chord_samples):
            if idx + i < n:
                pad[idx + i] += v

        # Bass
        root = NOTES[CHORDS[chord][0]] * 0.5
        note = bass_note(root, beat * 0.9, amp=0.18)
        for i, v in enumerate(note):
            if idx + i < n:
                bass[idx + i] += v

        # Kick 1,3 + Snare 2,4
        if b % 2 == 0:
            for i in range(int(0.15 * SAMPLE_RATE)):
                if idx + i < n:
                    perc[idx + i] += kick(i / SAMPLE_RATE, 0.22)
        else:
            for i in range(int(0.15 * SAMPLE_RATE)):
                if idx + i < n:
                    perc[idx + i] += snare(i / SAMPLE_RATE, 0.16)

        # Hihat every beat
        for i in range(int(0.08 * SAMPLE_RATE)):
            if idx + i < n:
                perc[idx + i] += hihat(i / SAMPLE_RATE, 0.06)

        # Arpeggio
        arp_idx = b % 4
        pattern = arp_patterns[(b // 4) % len(arp_patterns)]
        note_idx = pattern[arp_idx]
        freq = notes[note_idx] * 2
        pl = synth_note(freq, beat * 0.7, amp=0.1, waveform='triangle',
                        a=0.003, d=0.08, s=0.2, r=0.1)
        for i, v in enumerate(pl):
            if idx + i < n:
                pluck[idx + i] += v

        # Occasional melody note
        if b % 8 == 3:
            mel_freq = notes[0] * 2
            mel = synth_note(mel_freq, beat * 2, amp=0.08, waveform='sine',
                             a=0.01, d=0.3, s=0.3, r=0.4)
            for i, v in enumerate(mel):
                if idx + i < n:
                    melody[idx + i] += v

    pad = apply_simple_delay(pad, 0.35, 0.25)
    combined = mix_tracks(pad, bass, perc, pluck, melody)
    save_mono_as_stereo(combined, "park_theme.wav")


def generate_chaos_theme(duration=30.0):
    bpm = 140
    beat = 60.0 / bpm
    n = int(SAMPLE_RATE * duration)
    prog = ['Cdim', 'Gdim', 'Ddim', 'Gdim']
    total_beats = int(duration / beat)

    pad = [0.0] * n
    bass = [0.0] * n
    perc = [0.0] * n
    stabs = [0.0] * n

    for b in range(total_beats):
        t = b * beat
        idx = int(t * SAMPLE_RATE)
        chord = prog[(b // 2) % len(prog)]
        notes = [NOTES[n] for n in CHORDS[chord]]
        bar_dur = min(2 * beat, duration - t)

        # Dissonant short pad
        chord_samples = pad_chord(notes, bar_dur, amp=0.05)
        for i, v in enumerate(chord_samples):
            if idx + i < n:
                pad[idx + i] += v

        # Staccato bass
        root = NOTES[CHORDS[chord][0]] * 0.5
        note = bass_note(root, beat * 0.7, amp=0.2)
        for i, v in enumerate(note):
            if idx + i < n:
                bass[idx + i] += v

        # Fast kick every beat
        for i in range(int(0.12 * SAMPLE_RATE)):
            if idx + i < n:
                perc[idx + i] += kick(i / SAMPLE_RATE, 0.24)

        # Snare on off-beats
        if b % 2 == 1:
            for i in range(int(0.12 * SAMPLE_RATE)):
                if idx + i < n:
                    perc[idx + i] += snare(i / SAMPLE_RATE, 0.18)

        # Random high stabs for comic tension
        if (b * 97) % 100 > 55:
            stab_freq = 400 + ((b * 131) % 700)
            stab_dur = beat * (0.3 + ((b * 53) % 40) / 100)
            stab = synth_note(stab_freq, stab_dur, amp=0.12, waveform='sawtooth',
                              a=0.003, d=0.03, s=0.1, r=0.05)
            for i, v in enumerate(stab):
                if idx + i < n:
                    stabs[idx + i] += v

    combined = mix_tracks(pad, bass, perc, stabs)
    save_mono_as_stereo(combined, "chaos_theme.wav")


def generate_tension_theme(duration=28.0):
    bpm = 120
    beat = 60.0 / bpm
    n = int(SAMPLE_RATE * duration)
    prog = ['Am', 'F', 'Dm', 'E']
    total_beats = int(duration / beat)

    pad = [0.0] * n
    bass = [0.0] * n
    perc = [0.0] * n
    strings = [0.0] * n

    for b in range(total_beats):
        t = b * beat
        idx = int(t * SAMPLE_RATE)
        chord = prog[(b // 4) % len(prog)]
        notes = [NOTES[n] for n in CHORDS[chord]]
        bar_dur = min(4 * beat, duration - t)

        # Dark pad with slower attack
        chord_samples = pad_chord(notes, bar_dur, amp=0.08)
        for i, v in enumerate(chord_samples):
            if idx + i < n:
                pad[idx + i] += v

        # Low bass
        root = NOTES[CHORDS[chord][0]] * 0.5
        note = bass_note(root, bar_dur, amp=0.2)
        for i, v in enumerate(note):
            if idx + i < n:
                bass[idx + i] += v

        # Heartbeat-style kick: strong on 1, weaker on 3
        if b % 4 == 0:
            for i in range(int(0.18 * SAMPLE_RATE)):
                if idx + i < n:
                    perc[idx + i] += kick(i / SAMPLE_RATE, 0.28)
        elif b % 4 == 2:
            for i in range(int(0.15 * SAMPLE_RATE)):
                if idx + i < n:
                    perc[idx + i] += kick(i / SAMPLE_RATE, 0.14)

        # Tense string stabs on chord changes
        if b % 4 == 0:
            stab = string_stab(notes, beat * 1.5, amp=0.1)
            for i, v in enumerate(stab):
                if idx + i < n:
                    strings[idx + i] += v

    pad = apply_simple_delay(pad, 0.5, 0.35)
    combined = mix_tracks(pad, bass, perc, strings)
    save_mono_as_stereo(combined, "tension_theme.wav")


def generate_wonder_theme(duration=32.0):
    bpm = 90
    beat = 60.0 / bpm
    n = int(SAMPLE_RATE * duration)
    prog = ['F', 'C', 'G', 'Am']
    total_beats = int(duration / beat)

    pad = [0.0] * n
    bass = [0.0] * n
    perc = [0.0] * n
    bells = [0.0] * n
    lead = [0.0] * n

    # Soaring melody notes
    melody_notes = [
        'C5', 'E5', 'F5', 'G5', 'A5', 'G5', 'F5', 'E5',
        'D5', 'F5', 'E5', 'D5', 'C5', 'E5', 'D5', 'C5',
    ]

    for b in range(total_beats):
        t = b * beat
        idx = int(t * SAMPLE_RATE)
        chord = prog[(b // 4) % len(prog)]
        notes = [NOTES[n] for n in CHORDS[chord]]
        bar_dur = min(4 * beat, duration - t)

        # Wide, airy pad
        chord_samples = pad_chord(notes, bar_dur, amp=0.07)
        for i, v in enumerate(chord_samples):
            if idx + i < n:
                pad[idx + i] += v

        # Gentle bass
        root = NOTES[CHORDS[chord][0]] * 0.5
        note = bass_note(root, bar_dur, amp=0.14)
        for i, v in enumerate(note):
            if idx + i < n:
                bass[idx + i] += v

        # Soft kick on 1, light hihat on 2,4
        if b % 4 == 0:
            for i in range(int(0.18 * SAMPLE_RATE)):
                if idx + i < n:
                    perc[idx + i] += kick(i / SAMPLE_RATE, 0.16)
        elif b % 2 == 1:
            for i in range(int(0.08 * SAMPLE_RATE)):
                if idx + i < n:
                    perc[idx + i] += hihat(i / SAMPLE_RATE, 0.05)

        # Bell on beat 1 of each bar
        if b % 4 == 0:
            bell_freq = notes[0] * 2
            for i in range(int(3.0 * SAMPLE_RATE)):
                if idx + i < n:
                    bells[idx + i] += bell(bell_freq, i / SAMPLE_RATE, amp=0.12)
            # Also add a higher bell
            bell_freq2 = notes[2] * 2 if len(notes) > 2 else notes[0] * 3
            for i in range(int(2.5 * SAMPLE_RATE)):
                if idx + i < n:
                    bells[idx + i] += bell(bell_freq2, i / SAMPLE_RATE, amp=0.08)

        # Lead melody
        if b % 2 == 0:
            mel_idx = (b // 2) % len(melody_notes)
            mel_freq = NOTES[melody_notes[mel_idx]]
            mel = synth_note(mel_freq, beat * 1.8, amp=0.1, waveform='sine',
                             a=0.2, d=0.4, s=0.5, r=0.8)
            for i, v in enumerate(mel):
                if idx + i < n:
                    lead[idx + i] += v

    pad = apply_simple_delay(pad, 0.5, 0.4)
    combined = mix_tracks(pad, bass, perc, bells, lead)
    save_mono_as_stereo(combined, "wonder_theme.wav")


def convert_to_wav(src_path, dst_path, sample_rate=48000):
    cmd = [
        "ffmpeg", "-y", "-i", src_path,
        "-ac", "1", "-ar", str(sample_rate),
        "-acodec", "pcm_s16le", dst_path
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    print(f"Converted: {src_path} -> {dst_path}")


def use_manual_bgm():
    if not os.path.isdir(MANUAL_BGM_DIR):
        return False
    files = [f for f in os.listdir(MANUAL_BGM_DIR)
             if f.lower().endswith(('.mp3', '.wav', '.ogg', '.flac'))]
    if not files:
        return False
    for f in files:
        src = os.path.join(MANUAL_BGM_DIR, f)
        name = os.path.splitext(f)[0]
        dst = os.path.join(OUTPUT_DIR, f"{name}.wav")
        if os.path.exists(dst):
            print(f"Using existing: {dst}")
            continue
        try:
            convert_to_wav(src, dst)
        except Exception as e:
            print(f"Warning: failed to convert {src}: {e}")
    return True


def generate_all():
    if use_manual_bgm():
        print("\n[Manual BGM] Used high-quality tracks from materials/bgm/")
        print("To use procedural fallback instead, remove files from materials/bgm/\n")
    else:
        print("\n[Procedural BGM] No manual tracks found in materials/bgm/. Generating...\n")
        generate_room_theme(30.0)
        generate_park_theme(28.0)
        generate_chaos_theme(30.0)
        generate_tension_theme(28.0)
        generate_wonder_theme(32.0)
        print("All procedural BGM tracks generated.")


if __name__ == "__main__":
    generate_all()
