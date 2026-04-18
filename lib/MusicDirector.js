/**
 * MusicDirector — 专业配乐调度器
 *
 * 核心概念（对应影视配乐工业标准）：
 * 1. Cue / Cue Sheet    — 每段音乐的入出点、情绪标签、BPM
 * 2. Hit Point          — 音乐重拍与画面动作的对齐点
 * 3. Duck / Sidechain   — 对话期间自动避让（Attack/Release 包络）
 * 4. Crossfade          — 场景切换时的音乐过渡
 * 5. Stem               — 分轨（Pad/Bass/Percussion/Melody），可动态混合
 * 6. Tempo Map          — 全局或局部的速度曲线
 * 7. Master Bus         — 总线音量与最终限幅
 */

export class MusicCue {
  constructor(options = {}) {
    this.name = options.name || 'untitled';
    this.file = options.file || null;           // 音频文件路径
    this.startTime = options.startTime ?? 0;    // 入点 (s)
    this.endTime = options.endTime ?? 0;        // 出点 (s)
    this.fadeIn = options.fadeIn ?? 1.0;        // 淡入时长
    this.fadeOut = options.fadeOut ?? 1.0;      // 淡出时长
    this.baseVolume = options.baseVolume ?? 0.5; // 基础音量 (0~1)
    this.loop = options.loop ?? false;
    this.emotion = options.emotion || 'neutral'; // calm | upbeat | tension | comedy | sad
    this.bpm = options.bpm ?? 120;
    this.hitPoints = options.hitPoints || [];   // 需要对齐画面的节拍点 [{ time, label }]
  }
}

export class DuckEvent {
  /**
   * 对话避让事件
   * @param {number} startTime  — 避让开始
   * @param {number} duration   — 避让持续
   * @param {number} depth      — 剩余音量比例 (0=mute, 1=no duck)
   * @param {number} attack     — 压下去的速度 (s)
   * @param {number} release    — 抬起来的速度 (s)
   */
  constructor(startTime, duration, depth = 0.35, attack = 0.12, release = 0.35) {
    this.startTime = startTime;
    this.endTime = startTime + duration;
    this.depth = depth;
    this.attack = attack;
    this.release = release;
  }
}

export class StemMix {
  constructor(options = {}) {
    this.pad = options.pad ?? 1.0;
    this.bass = options.bass ?? 1.0;
    this.percussion = options.percussion ?? 1.0;
    this.melody = options.melody ?? 1.0;
  }
}

export class MusicDirector {
  constructor() {
    this.cues = [];         // MusicCue[]
    this.duckEvents = [];   // DuckEvent[]
    this.masterVolume = 0.75;
    this.stemMix = new StemMix();
    this.globalBpm = 120;
  }

  /** 添加一段音乐提示 */
  addCue(cue) {
    this.cues.push(cue);
  }

  /** 从 SRT 对白条目自动生成避让曲线 */
  autoDuckFromDialogues(entries, depth = 0.32, attack = 0.12, release = 0.35) {
    const padding = 0.25; // 前后留白，避免音乐突然切断
    for (const entry of entries) {
      if (entry.character && entry.dialogue && entry.dialogue.trim()) {
        this.duckEvents.push(new DuckEvent(
          Math.max(0, entry.startTime - padding),
          (entry.endTime - entry.startTime) + padding * 2,
          depth, attack, release
        ));
      }
    }
    this._mergeDuckEvents();
  }

  /** 合并重叠的避让区间，取更深的 duck */
  _mergeDuckEvents() {
    if (this.duckEvents.length === 0) return;
    this.duckEvents.sort((a, b) => a.startTime - b.startTime);
    const merged = [this.duckEvents[0]];
    for (let i = 1; i < this.duckEvents.length; i++) {
      const last = merged[merged.length - 1];
      const curr = this.duckEvents[i];
      if (curr.startTime <= last.endTime + 0.05) { // 允许 50ms 重叠
        last.endTime = Math.max(last.endTime, curr.endTime);
        last.depth = Math.min(last.depth, curr.depth); // 更深的 duck 胜出
        last.attack = Math.min(last.attack, curr.attack);
        last.release = Math.min(last.release, curr.release);
      } else {
        merged.push(curr);
      }
    }
    this.duckEvents = merged;
  }

  /**
   * 计算某个 cue 在全局时间 t 的音量乘数 [0,1]
   * 应用了：Fade In/Out + Ducking + Master
   */
  computeCueVolume(cue, t) {
    if (t < cue.startTime || t > cue.endTime) return 0;

    let vol = cue.baseVolume * this.masterVolume;

    // Fade In (ease-in sine)
    if (t < cue.startTime + cue.fadeIn && cue.fadeIn > 0) {
      const p = (t - cue.startTime) / cue.fadeIn;
      vol *= Math.sin(p * Math.PI / 2);
    }

    // Fade Out (ease-out sine)
    if (t > cue.endTime - cue.fadeOut && cue.fadeOut > 0) {
      const p = (cue.endTime - t) / cue.fadeOut;
      vol *= Math.sin(p * Math.PI / 2);
    }

    // Ducking (smooth envelope with attack/release)
    for (const duck of this.duckEvents) {
      if (t >= duck.startTime && t < duck.endTime) {
        let factor;
        if (t < duck.startTime + duck.attack && duck.attack > 0) {
          // attack: 1.0 → depth (ease-out)
          const p = (t - duck.startTime) / duck.attack;
          factor = 1.0 - (1.0 - duck.depth) * Math.sin(p * Math.PI / 2);
        } else if (t > duck.endTime - duck.release && duck.release > 0) {
          // release: depth → 1.0 (ease-in)
          const p = (duck.endTime - t) / duck.release;
          factor = 1.0 - (1.0 - duck.depth) * Math.sin(p * Math.PI / 2);
        } else {
          factor = duck.depth;
        }
        vol *= factor;
        break;
      }
    }

    return Math.max(0, Math.min(1, vol));
  }

  /**
   * 对齐 Hit Point：微调 cue 的 startTime，使某个音乐重拍对齐画面动作
   * @param {MusicCue} cue
   * @param {number} beatIndex  — 第几个拍子要对齐 (0-based)
   * @param {number} targetTime — 需要对齐的画面时间
   */
  alignHitPoint(cue, beatIndex, targetTime) {
    const beatDuration = 60.0 / cue.bpm;
    const hitOffset = beatIndex * beatDuration;
    cue.startTime = targetTime - hitOffset;
  }

  /** 按情绪标签筛选 cues */
  getCuesByEmotion(emotion) {
    return this.cues.filter(c => c.emotion === emotion);
  }

  /** 计算全局音量包络（用于可视化或导出） */
  getVolumeEnvelope(timeResolution = 0.1, maxTime = null) {
    const end = maxTime ?? Math.max(...this.cues.map(c => c.endTime), 0);
    const samples = [];
    for (let t = 0; t <= end; t += timeResolution) {
      let sum = 0;
      for (const cue of this.cues) {
        sum += this.computeCueVolume(cue, t);
      }
      samples.push({ t, vol: Math.min(1, sum) });
    }
    return samples;
  }

  /** 导出给 Python/ffmpeg 混音器使用的 JSON 计划 */
  exportMixPlan() {
    return {
      cues: this.cues.map(c => ({
        name: c.name,
        file: c.file,
        startTime: c.startTime,
        endTime: c.endTime,
        fadeIn: c.fadeIn,
        fadeOut: c.fadeOut,
        baseVolume: c.baseVolume,
        emotion: c.emotion,
        bpm: c.bpm,
      })),
      duckEvents: this.duckEvents.map(d => ({
        startTime: d.startTime,
        endTime: d.endTime,
        depth: d.depth,
        attack: d.attack,
        release: d.release,
      })),
      masterVolume: this.masterVolume,
      stemMix: { ...this.stemMix },
    };
  }
}
