# Dula Engine

基于 Web (Three.js) + Puppeteer 离线渲染的动画短片生成器。

**架构**：引擎与内容分离。本仓库只包含渲染/音频执行代码，剧本、配置、素材存放在独立的内容仓库（如 `dula-story`）中。

## 技术栈

- **渲染**：Three.js (ES Module) + Puppeteer 逐帧截图
- **合成**：ffmpeg (H.264/AAC, 1920×1080@30fps)
- **TTS**：edge-tts (Python)
- **混音**：Python 样本级混音 + ffmpeg `amix`

## CLI 命令

引擎发布为 npm 包，提供三个 CLI：

| 命令 | 说明 |
|------|------|
| `dula-render <episode>` | 生成完整视频 |
| `dula-verify <episode>` | 逐镜头验证截图 |
| `dula-audio <episode>` | 生成 TTS + BGM + SFX 混音 |

## 使用方式

### 1. 作为 npm 依赖（推荐）

```bash
# 内容仓库的 package.json
npm install dula-engine

# 使用
npx dula-render ./episodes/bichong_qiupai
```

### 2. 本地开发（file: 链接）

```bash
# 引擎侧
npm link

# 内容侧
npm link dula-engine
# 或在 package.json 中声明："dula-engine": "file:../dula-engine"
```

### 3. 本地 tarball 测试（验证发布行为）

```bash
cd dula-engine
npm pack                    # 生成 dula-engine-0.1.0.tgz

cd dula-story
npm install ../dula-engine/dula-engine-0.1.0.tgz
```

## Episode 目录协议

引擎期望内容目录包含以下结构：

```
episode/
├── script.story              # 剧本
├── config/
│   ├── transitions.json      # 场景过渡
│   ├── voice_config.json     # TTS 声线
│   └── choreography.json     # 静态编舞（可选，可被 .story 覆盖）
└── assets/
    └── audio/
        ├── music/            # BGM (*.wav)
        ├── sfx/              # 音效 (*.wav)
        ├── manifest.json     # 音频清单（自动生成）
        └── mixed.wav         # 最终混音（自动生成）
```

## 核心特性

- **`.story` 剧本格式**：SRT 时间轴扩展，支持语义化标签（`{Ball:Serve|...}`、`{Camera:ZoomIn|...}`、`{Event:Move|...}` 等）
- **语义化编排**：`CourtDirector` 自动计算球场站位、球轨迹、挥拍时机、相机机位
- **专业配乐**：`MusicDirector` 支持 Cue/Duck/HitPoint/Stem/Crossfade
- **角色系统**：哆啦A梦、大雄、静香，支持专属动画与通用动画
- **场景系统**：RoomScene、ParkScene（含完整网球场物理与道具系统）

## 开发文档

详见 `AGENTS.md`。
