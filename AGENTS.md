# Doula 项目开发规范与上下文

> 本文档供 AI 开发代理阅读，记录项目架构、协议、已知问题及开发工作流，确保重启后可无缝继续。

---

## 1. 项目概述

一个基于 Web (Three.js) + Puppeteer 离线渲染的 SRT 驱动型动画短片生成器。输入 SRT 字幕文件，输出带音频的 `output.mp4`。

当前剧情线：**「必中球拍」**（哆啦A梦借给大雄一个百发百中的网球拍，练习时起初很帅，最后球拍失控把大雄拖进池塘）。

---

## 2. 技术栈与环境

| 工具 | 版本/说明 |
|------|-----------|
| Node.js | v24.14.0 |
| npm | 11.9.0 |
| ffmpeg | 8.0.1-full_build |
| Python | 3.x（用于 edge-tts） |
| Node 依赖 | `puppeteer`, `three` (via CDN unpkg@0.160.0) |
| Python 依赖 | `edge-tts` |
| 帧率 | **固定 30 fps** |
| 输出分辨率 | 1920×1080 |

### 关键文件
- `render.html` + `render.js`：浏览器端 Three.js 渲染入口（生产管线）。
- `generate_video.js`：Node 端 Puppeteer 启动本地服务器、逐帧捕获 PNG、调用 ffmpeg 合成。
- `tools/generate_audio.py`：edge-tts 生成 MP3 + ffmpeg `amix` 混音成 `mixed.wav`。
- `tools/verify_shots.js`：逐镜头验证工作流（截图检查，不生成完整视频）。
- `subtitles/script.srt`：唯一剧本来源，驱动所有画面与音频。

---

## 3. 目录结构

```
D:\opensource\movie\doula
├── generate_video.js          # 主渲染管线（Puppeteer → PNG → ffmpeg）
├── render.html                # 浏览器渲染页面
├── render.js                  # 浏览器端帧循环
├── package.json
├── output.mp4                 # 最终输出（旧版可能被覆盖）
├── subtitles/
│   └── script.srt             # 剧本（SRT 协议）
├── lib/
│   └── SRTParser.js           # SRT 解析器（JS）
├── scenes/
│   ├── index.js               # SceneRegistry
│   ├── SceneBase.js           # 场景基类
│   ├── RoomScene.js           # 室内场景
│   └── ParkScene.js           # 公园场景（含网球网/球/球拍）
├── characters/
│   ├── index.js               # CharacterRegistry
│   ├── CharacterBase.js       # 角色基类（说话、动画、移动）
│   ├── Doraemon.js            # 哆啦A梦模型
│   └── Nobita.js              # 大雄模型
├── animations/
│   ├── AnimationBase.js
│   ├── index.js               # AnimationRegistry
│   ├── common/                # 通用动画（Walk, Jump, WaveHand…）
│   ├── doraemon/
│   └── nobita/
├── storyboard/
│   └── Storyboard.js          # 导演核心（场景切换、音频调度、球飞行控制）
├── voices/
│   └── index.js               # VoiceRegistry（目前未使用，音频由 Python 生成）
├── tools/
│   ├── generate_audio.py      # TTS + 混音
│   ├── adjust_srt.py          # 基于音频时长自动调整 SRT 时间轴（备用）
│   ├── verify_shots.js        # 逐镜头验证脚本
│   ├── verify.html            # 验证用浏览器入口
│   └── verify_render.js       # 验证用渲染逻辑
└── assets/audio/
    ├── *.mp3                  # 逐句 TTS 输出
    ├── manifest.json          # 音频清单（index, startTime, endTime, file）
    └── mixed.wav              # ffmpeg 混音结果
```

---

## 4. SRT 协议规范

`subtitles/script.srt` 是唯一数据源，格式在标准 SRT 之上扩展：

```srt
1
00:00:00,000 --> 00:00:04,000
@RoomScene

2
00:00:04,000 --> 00:00:08,500
[Doraemon]{WaveHand} 大雄！又在走廊发呆啦？
```

### 标记说明
- `@SceneName`：场景切换指令（如 `@RoomScene`, `@ParkScene`）。必须独占一行，可视为该时间段内的一个特殊条目。
- `[Character]`：说话角色，用于匹配 TTS 声线、触发嘴型动画、调度音频。
- `{Action}`：身体动画标签，在 TTS 生成前会被 Python 脚本剥离。

### 动作标签清单（已注册在 `animations/common/`）
| 标签 | 动画类 | 效果 |
|------|--------|------|
| `{Walk}` | `Walk` | 走路（腿部摆动） |
| `{WaveHand}` | `WaveHand` | 挥手 |
| `{Jump}` | `Jump` | 跳跃 |
| `{StompFoot}` | `StompFoot` | 跺脚 |
| `{SwayBody}` | `SwayBody` | 身体摇摆 |
| `{Nod}` | `Nod` | 点头 |
| `{TurnToCamera}` | `TurnToCamera` | 转身面向镜头（由 Storyboard 自动调度） |

**注意**：时间轴必须给足音频播放时长。Edge-tts 中文语速约 1 秒 4~5 字，短句也应留 ≥2.5s。重叠会导致 `amix` 后听感混乱。

---

## 5. 渲染管线

1. `generate_video.js` 启动本地 HTTP 服务器（端口 8765）。
2. Puppeteer 打开 `http://localhost:8765/render.html`。
3. `render.js` 加载 `Storyboard`，按 30fps 逐帧调用 `storyboard.update(t)` 和 `storyboard.render()`。
4. 每一帧通过 `renderer.domElement.toDataURL('image/png')` 传回 Node，写入 `storyboard/frames/frame_00001.png`。
5. 渲染完成后，Node 调用 ffmpeg：
   ```bash
   ffmpeg -y -framerate 30 -i "storyboard/frames/frame_%05d.png" -i "assets/audio/mixed.wav" -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest "output.mp4"
   ```
6. 清理 `storyboard/frames/` 目录。

### 临时文件清理策略
- 生产帧：`generate_video.js` 在合成后删除 `storyboard/frames/`。
- 验证截图：`verify_shots.js` 运行后自动删除 `storyboard/check_shot_*.jpg`（可临时保留若干张用于人工检查）。
- **用户明确要求**：`check_*.jpg` 和 `frame_*.jpg` 在检查后立即删除，不可残留。

---

## 6. 音频管线

1. `python tools/generate_audio.py` 读取 `subtitles/script.srt`。
2. 对每句含 `[Character]` 的文本，调用 `edge_tts.Communicate` 生成 `{index:03d}_{Character}.mp3`。
   - Doraemon：`zh-CN-XiaoxiaoNeural`，rate `+10%`，pitch `+10Hz`
   - Nobita：`zh-CN-YunxiNeural`，rate `-5%`，pitch `-5Hz`
3. 生成 `assets/audio/manifest.json`，记录每句的 `index`, `startTime`, `endTime`, `character`, `dialogue`, `file`。
4. 调用 ffmpeg `amix` 滤镜，按 `adelay` 对齐各 MP3 的起始时间，输出 `mixed.wav`（48kHz 16bit PCM）。

### 音频重叠根因与修复
- **根因**：旧版 SRT 给每句的时间槽（slot）远短于 edge-tts 实际音频时长。例如 3.0s 的 slot 对应 5.3s 的音频，导致后一句提前开始，`amix` 后两段音频叠加。
- **修复**：手动重写 SRT，按每字约 0.28s + 0.5s 缓冲重新分配时间轴，总时长延长至约 112s，确保所有音频无重叠。

---

## 7. 角色系统

### CharacterBase (`characters/CharacterBase.js`)
核心能力：
- `speak(startTime, duration)`：触发嘴型动画 + 头部微动。
- `playAnimation(AnimClass, startTime, duration)`：播放显式身体动画。
- `moveTo(targetPos, startTime, duration)`：直线插值移动（easeInOutQuad）。
- `teleport(pos, time)`：瞬间重置位置（用于场景切换）。

#### 关键已知 Bug 已修复
**移动卡顿/stall Bug**：
- **旧代码**：`update()` 中每帧读取 `this.mesh.position` 作为 move 起点，导致 progress 计算错误，产生指数减速。
- **修复**：在 `moveTo` 中将 `startPos` 初始化为 `null`，在 `update` 中第一次进入该 move 的时间区间时 snapshot 当前位置：
  ```js
  if (move.startPos === undefined) {
    move.startPos = { x: this.mesh.position.x, z: this.mesh.position.z };
  }
  ```

### Doraemon (`characters/Doraemon.js`)
- 全身程序化生成（蓝头、白脸、红鼻、铃铛、口袋、胶囊手臂）。
- 手臂通过 `addArm()` 创建，保存到 `this.rightArm` / `this.leftArm`。
- **新增**：`this.rightArmLength` 在 `build()` 中被记录，供外部附加道具使用。

### Nobita (`characters/Nobita.js`)
- 同理，黄衣蓝裤、眼镜、胶囊手臂。
- 同样记录 `this.rightArmLength`。

---

## 8. 动画系统

### AnimationBase (`animations/AnimationBase.js`)
```js
export class AnimationBase {
  constructor(name, duration) { ... }
  update(t, character) { } // t ∈ [0, 1]
}
```

### 注册方式
所有动画类导出到 `animations/index.js` 的 `AnimationRegistry`，以类名作为 key。

### 当前可用动画
位于 `animations/common/`：
- `Walk.js`：腿部/手臂周期性摆动，同时身体轻微上下起伏。
- `WaveHand.js`：挥动一只手臂。
- `Jump.js`：Y 轴抛物线跳跃。
- `StompFoot.js`：跺脚震动。
- `SwayBody.js`：身体左右摇摆。
- `Nod.js`：点头。
- `TurnToCamera.js`：平滑旋转至面朝 +Z（镜头方向）。

---

## 9. 场景系统

### SceneBase (`scenes/SceneBase.js`)
- `build()`：添加 Ambient + Directional 灯光。
- `addCharacter(character)` / `removeCharacter(character)`
- `update(time, delta)`：遍历 `this.characters` 调用 `character.update()`。

### RoomScene (`scenes/RoomScene.js`)
室内场景，目前为项目默认启动场景。

### ParkScene (`scenes/ParkScene.js`)
公园场景，包含：
- 蓝天背景、草地、长椅、树木、云朵。
- **网球网** (`this.net`)：两根柱子 + 白色半透明网 + 网格线。
- **网球** (`this.tennisBall`)：黄色小球，可受 `ballTrajectory` 驱动飞行。
- **球拍** (`createRacket(color)`)：手柄 + 圆环拍框 + 十字网线。
- `attachRacketToCharacter(character, color)`：将球拍附加到角色右手（local 坐标）。
  - 默认旋转 `racket.rotation.set(Math.PI / 6, 0, Math.PI / 2)`，让拍面朝前更易见。
- `setBallTrajectory(startTime, endTime, startPos, endPos, arcHeight)`：控制网球沿抛物线飞行。
- `update(time, delta)`：先 `super.update()` 更新角色，再按 `ballTrajectory` 插值球的位置（easeInOutQuad + 正弦弧高）。

---

## 10. Storyboard 导演系统

`storyboard/Storyboard.js` 是整个动画的「导演」。

### 核心流程
1. `load(srtPath, manifestPath)`：
   - 解析 SRT → `this.entries`。
   - 解码音频 → `this.audioBuffers`。
   - 初始化首场景，实例化所有提及角色。
   - `arrangeCharacters()`：按人数排位置（2 人时左右 -1.5 / +1.5）。
   - 自动调度 `{Action}` 动画。
   - **自动调度场景过渡动作**：
     - 切换前：角色 `Walk` 至 `SCENE_EXITS[prevScene]`。
     - 切换瞬间：`teleport` 到 `SCENE_ENTRANCES[nextScene]`。
     - 切换后：角色 `Walk` 入场，随后 `TurnToCamera`。

2. `update(t)`：
   - 检测并执行场景切换。
   - 更新角色 speaking 状态（触发动嘴）。
   - **公园场景网球飞行编排**：若当前是 `ParkScene`，按时间区间设置 `ballTrajectory`：
     - `55.0s~57.5s`：第一球从哆啦A梦发向大雄。
     - `59.5s~62.0s`：回球。
     - `71.5s~73.5s`：第二球。
     - `75.0s~77.0s`：回球。
     - `86.5s~90.0s`：失控，球飞向 `(4, -4)`。
     - `99.0s~102.0s`：球引向池塘 `(6, -8)`。
   - 调用 `this.currentScene.update(t, 0.016)` 推进角色动画与球位。

3. `render()`：调用 `renderer.render(scene, camera)`。

### 场景切换硬编码常量
```js
const SCENE_EXITS = {
  RoomScene: { x: -4, z: 2 },
};
const SCENE_ENTRANCES = {
  ParkScene: { x: -2, z: 3 },
};
```

---

## 11. 逐镜头验证工作流

为避免直接跑完整 `generate_video.js` 后才发现问题，已建立验证脚本：

```bash
node tools/verify_shots.js
```

### 行为
1. 启动本地服务器（端口 8766），加载 `tools/verify.html`。
2. 对 SRT 中每个条目，seek 到该条目的中点时间，截图保存为 `storyboard/check_shot_XX.jpg`。
3. 默认运行结束后删除所有临时截图（可临时修改脚本保留特定镜头人工检查）。

### 验证脚本中的路径补丁
`verify.html` 位于 `/tools/`，基地址不同，因此 `verify_render.js` 做了两处处理：
- SRT / manifest 路径使用 `../subtitles/script.srt` 和 `../assets/audio/manifest.json`。
- 通过覆盖 `window.fetch` 拦截 `assets/audio/` 开头的请求，在前面补 `../`，确保 MP3 能正确加载。

---

## 12. 已知问题与历史修复

| 问题 | 状态 | 说明 |
|------|------|------|
| 音频重叠 | ✅ 已修复 | 重写 SRT 时间轴，给足每句时长。 |
| 移动卡顿 Bug | ✅ 已修复 | `moveTo` 首次 update 时 snapshot `startPos`。 |
| 公园缺球拍/球 | ✅ 已修复 | `ParkScene` 新增 net、ball、racket 及飞行轨迹。 |
| 临时截图残留 | ✅ 已修复 | `verify_shots.js` 自动清理；之前 PowerShell `del` 失败已改为 `Remove-Item`。 |
| SRT 自动调整脚本 | 🔄 备用 | `tools/adjust_srt.py` 可根据现有 MP3 时长自动拉伸时间轴，但未启用。 |
| 对话自然度 | ⚠️ 待优化 | 用户反馈「必中球拍」梗的对话仍不够自然、缺乏真正的哆啦A梦式幽默。 |
| 球拍可见性 | ⚠️ 可优化 | 哆啦A梦身体较圆，红色球拍有时被身体遮挡，已稍微前倾，仍可在未来调整手臂 pose。 |

---

## 13. 开发工作流（标准操作顺序）

### 修改剧本/时间轴
1. 编辑 `subtitles/script.srt`。
2. 运行 `python tools/generate_audio.py` 重新生成音频与 manifest。
3. 运行 `node tools/verify_shots.js` 逐镜头验证画面。
4. 确认无误后，运行 `node generate_video.js` 生成最终视频。

### 修改场景/角色/动画
1. 修改对应 JS 文件。
2. 直接运行 `node tools/verify_shots.js` 查看关键帧。
3. 满意后再跑完整视频。

---

## 14. 待办事项（下次继续）

按优先级排列：

1. **最终视频生成**：当前所有修复已完成，跑 `node generate_video.js` 出片。
2. **对话自然度再打磨**：若用户对剧情或幽默感仍不满意，需再次重写 SRT。建议方向：
   - 减少翻译腔，增加口语化短句。
   - 哆啦A梦的吐槽更犀利/无奈一点。
   - 结局的笑点更突出（如大雄落水后哆啦A梦的补刀）。
3. **可选增强**：
   - 给球拍添加「挥拍」动画（让手臂在击球瞬间抬起）。
   - 给球增加旋转效果或拖尾。
   - 添加更多场景（如池塘边缘的 visual 暗示）。

---

## 15. 关键代码片段备忘

### CharacterBase 移动修复核心
```js
moveTo(targetPos, startTime, duration) {
  this.moves.push({
    targetPos,
    startPos: undefined, // 关键：延迟到第一次 update 再 snapshot
    startTime,
    endTime: startTime + duration,
  });
}

// update() 中
if (time >= move.startTime && time < move.endTime) {
  if (move.startPos === undefined) {
    move.startPos = { x: this.mesh.position.x, z: this.mesh.position.z };
  }
  // ... easeInOutQuad 插值
}
```

### ParkScene 球拍附加
```js
attachRacketToCharacter(character, color = 0xff3333) {
  if (!character.rightArm || !character.rightArmLength) return null;
  const racket = this.createRacket(color);
  racket.position.set(0, -character.rightArmLength, 0);
  character.rightArm.add(racket);
  return racket;
}
```

### Storyboard 公园球飞行编排
见 `storyboard/Storyboard.js` 中 `// Park scene tennis ball choreography` 区块。

---

**最后更新**：2026-04-16
