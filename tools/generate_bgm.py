#!/usr/bin/env python3
"""
轻量级程序化 BGM 合成器

为「必中球拍」短片生成三段情绪分明的背景音乐：
- room_theme   : C大调，60 BPM，舒缓日常（室内借球拍）
- park_theme   : G大调，110 BPM，轻快运动（公园对打）
- chaos_theme  : 减和弦，140 BPM，滑稽失控（球拍暴走）

技术特点：
- ADSR 包络让音色更自然
- 多层叠加：Pad + Bass + Percussion + Melody
- Ducking-ready：整体动态范围控制在 -12dB 以下，给对白留足 headroom
"""

import math
import os
import struct
import wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(ROOT, "assets", "audio", "music")
os.makedirs(OUTPUT_DIR, exist_ok=True)

SAMPLE_RATE = 48000

# 音符频率 (equal temperament, A4=440Hz)
NOTES = {
    'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
    'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
    'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00,
}


def adsr_envelope(t, duration, attack=0.05, decay=0.15, sustain=0.6, release=0.25):
    """标准 ADSR 包络"""
    if t < attack and attack > 0:
        return t / attack
    elif t < attack + decay and decay > 0:
        return 1.0 - (1.0 - sustain) * ((t - attack) / decay)
    elif t < duration - release:
        return sustain
    elif release > 0:
        rel = t - (duration - release)
        return sustain * (1.0 - rel / release)
    return 0.0


def synth_note(freq, duration, amp=0.3, waveform='sine', attack=0.05, decay=0.15, sustain=0.5, release=0.25):
    """合成单音符样本"""
    n = int(SAMPLE_RATE * duration)
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        env = adsr_envelope(t, duration, attack, decay, sustain, release)
        phase = 2 * math.pi * freq * t
        if waveform == 'sine':
            sample = math.sin(phase)
        elif waveform == 'triangle':
            sample = 2.0 / math.pi * math.asin(math.sin(phase))
        elif waveform == 'square':
            sample = 1.0 if math.sin(phase) > 0 else -1.0
        elif waveform == 'sawtooth':
            sample = 2.0 * ((phase / (2 * math.pi)) % 1.0) - 1.0
        else:
            sample = math.sin(phase)
        samples.append(sample * amp * env)
    return samples


def chord_notes(root_name, quality='major'):
    """返回和弦内音频率列表"""
    root = NOTES[root_name]
    if quality == 'major':
        return [root, root * 1.2599, root * 1.4983]
    elif quality == 'minor':
        return [root, root * 1.1892, root * 1.4983]
    elif quality == 'dim':
        return [root, root * 1.1892, root * 1.4142]
    elif quality == 'maj7':
        return [root, root * 1.2599, root * 1.4983, root * 1.8877]
    return [root]


def mix_tracks(*tracks):
    """多轨叠加 + 软限幅"""
    max_len = max(len(t) for t in tracks) if tracks else 0
    out = [0.0] * max_len
    for t in tracks:
        for i, v in enumerate(t):
            out[i] += v
    # Soft clip (tanh) to prevent hard digital clipping
    out = [math.tanh(v * 1.2) / 1.2 for v in out]
    return out


def save_wav(samples, filename):
    path = os.path.join(OUTPUT_DIR, filename)
    with wave.open(path, 'w') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        for s in samples:
            v = int(s * 0.85 * 32767)
            v = max(-32768, min(32767, v))
            w.writeframes(struct.pack('<h', v))
    print(f"Saved BGM: {path} ({len(samples)/SAMPLE_RATE:.2f}s)")


def generate_room_theme(duration=22.0):
    """
    室内场景：C - G - Am - F
    Pad 音色为主，极轻的打击乐，营造日常温馨感
    """
    bpm = 60
    beat = 60.0 / bpm
    total_beats = int(duration / beat)
    n = int(SAMPLE_RATE * duration)

    progression = [
        ('C4', 'major'), ('G3', 'major'), ('A3', 'minor'), ('F3', 'major')
    ]

    pad = [0.0] * n
    bass = [0.0] * n
    perc = [0.0] * n

    for b in range(total_beats):
        t = b * beat
        idx = int(t * SAMPLE_RATE)
        chord_idx = (b // 4) % len(progression)
        root_name, quality = progression[chord_idx]
        notes = chord_notes(root_name, quality)
        bar_dur = min(4 * beat, duration - t)

        # Pad: 长音，温暖 sine
        for freq in notes:
            note = synth_note(freq, bar_dur, amp=0.08, waveform='sine',
                              attack=0.6, decay=0.8, sustain=0.4, release=1.0)
            for i, s in enumerate(note):
                if idx + i < n:
                    pad[idx + i] += s

        # Bass: 低八度三角波
        bass_freq = NOTES[root_name] * 0.5
        note = synth_note(bass_freq, bar_dur, amp=0.18, waveform='triangle',
                          attack=0.05, decay=0.1, sustain=0.7, release=0.3)
        for i, s in enumerate(note):
            if idx + i < n:
                bass[idx + i] += s

        # Perc: 极简，每小节第一拍一个轻kick
        if b % 4 == 0:
            kick = synth_note(55, 0.12, amp=0.15, waveform='sine',
                              attack=0.005, decay=0.08, sustain=0, release=0.02)
            for i, s in enumerate(kick):
                if idx + i < n:
                    perc[idx + i] += s

    combined = mix_tracks(pad, bass, perc)
    save_wav(combined, "room_theme.wav")


def generate_park_theme(duration=22.0):
    """
    公园场景：G - D - Em - C
    110 BPM，琶音 + 更明显的 kick/snare，运动活力感
    """
    bpm = 110
    beat = 60.0 / bpm
    total_beats = int(duration / beat)
    n = int(SAMPLE_RATE * duration)

    progression = [
        ('G4', 'major'), ('D4', 'major'), ('E4', 'minor'), ('C4', 'major')
    ]

    pad = [0.0] * n
    bass = [0.0] * n
    perc = [0.0] * n
    melody = [0.0] * n

    for b in range(total_beats):
        t = b * beat
        idx = int(t * SAMPLE_RATE)
        chord_idx = (b // 4) % len(progression)
        root_name, quality = progression[chord_idx]
        notes = chord_notes(root_name, quality)
        bar_dur = min(4 * beat, duration - t)

        # Pad: 稍短的 pad
        for freq in notes:
            note = synth_note(freq, bar_dur, amp=0.07, waveform='sine',
                              attack=0.2, decay=0.4, sustain=0.35, release=0.5)
            for i, s in enumerate(note):
                if idx + i < n:
                    pad[idx + i] += s

        # Bass
        bass_freq = NOTES[root_name] * 0.5
        note = synth_note(bass_freq, bar_dur, amp=0.18, waveform='triangle',
                          attack=0.02, decay=0.1, sustain=0.7, release=0.2)
        for i, s in enumerate(note):
            if idx + i < n:
                bass[idx + i] += s

        # Perc: kick (1,3) + snare (2,4)
        if b % 2 == 0:
            kick = synth_note(60, 0.1, amp=0.2, waveform='sine',
                              attack=0.005, decay=0.07, sustain=0, release=0.02)
            for i, s in enumerate(kick):
                if idx + i < n:
                    perc[idx + i] += s
        else:
            # noise snare
            snare_n = int(0.07 * SAMPLE_RATE)
            for i in range(snare_n):
                if idx + i < n:
                    noise = ((i * 9301 + 49297) % 233280) / 233280.0 * 2 - 1
                    env = math.exp(-i / (SAMPLE_RATE * 0.025))
                    perc[idx + i] += noise * env * 0.15

        # Arpeggio melody
        arp_note = notes[b % len(notes)]
        note = synth_note(arp_note * 2, beat * 0.85, amp=0.09, waveform='triangle',
                          attack=0.01, decay=0.05, sustain=0.3, release=0.08)
        for i, s in enumerate(note):
            if idx + i < n:
                melody[idx + i] += s

    combined = mix_tracks(pad, bass, perc, melody)
    save_wav(combined, "park_theme.wav")


def generate_chaos_theme(duration=30.0):
    """
    失控场景：减和弦 + 小二度，140 BPM
    方波制造刺耳感，快速切分节奏，滑稽而紧张
    """
    bpm = 140
    beat = 60.0 / bpm
    total_beats = int(duration / beat)
    n = int(SAMPLE_RATE * duration)

    progression = [
        ('C4', 'dim'), ('F4', 'dim'), ('G4', 'dim'), ('A4', 'dim')
    ]

    pad = [0.0] * n
    bass = [0.0] * n
    perc = [0.0] * n
    melody = [0.0] * n

    # 确定性的"随机"序列
    def pseudo_noise(i):
        return ((i * 16807 + 0) % 2147483647) / 2147483647.0

    for b in range(total_beats):
        t = b * beat
        idx = int(t * SAMPLE_RATE)
        chord_idx = (b // 2) % len(progression)
        root_name, quality = progression[chord_idx]
        notes = chord_notes(root_name, quality)
        bar_dur = min(2 * beat, duration - t)

        # Dissonant pad: 方波，短促
        for freq in notes:
            note = synth_note(freq, bar_dur, amp=0.06, waveform='square',
                              attack=0.02, decay=0.15, sustain=0.2, release=0.1)
            for i, s in enumerate(note):
                if idx + i < n:
                    pad[idx + i] += s

        # Bass: 低八度方波，每拍都切
        bass_freq = NOTES[root_name] * 0.5
        note = synth_note(bass_freq, beat * 0.8, amp=0.2, waveform='square',
                          attack=0.01, decay=0.05, sustain=0.6, release=0.1)
        for i, s in enumerate(note):
            if idx + i < n:
                bass[idx + i] += s

        # Perc: 密集鼓点
        kick = synth_note(50, 0.08, amp=0.22, waveform='sine',
                          attack=0.003, decay=0.06, sustain=0, release=0.02)
        for i, s in enumerate(kick):
            if idx + i < n:
                perc[idx + i] += s

        if b % 2 == 1:
            snare_n = int(0.06 * SAMPLE_RATE)
            for i in range(snare_n):
                if idx + i < n:
                    noise = pseudo_noise(idx + i) * 2 - 1
                    env = math.exp(-i / (SAMPLE_RATE * 0.02))
                    perc[idx + i] += noise * env * 0.18

        # Random high stabs for comic tension
        if pseudo_noise(b * 97) > 0.55:
            freq = 500 + pseudo_noise(b * 131) * 700
            stab_dur = beat * (0.3 + pseudo_noise(b * 53) * 0.4)
            note = synth_note(freq, stab_dur, amp=0.1, waveform='sawtooth',
                              attack=0.005, decay=0.03, sustain=0.1, release=0.05)
            for i, s in enumerate(note):
                if idx + i < n:
                    melody[idx + i] += s

    combined = mix_tracks(pad, bass, perc, melody)
    save_wav(combined, "chaos_theme.wav")


def generate_all():
    print("Generating BGM tracks...")
    generate_room_theme(22.0)
    generate_park_theme(22.0)
    generate_chaos_theme(30.0)
    print("All BGM tracks generated.")


if __name__ == "__main__":
    generate_all()
