# BGM 素材放置指南

本项目不再使用程序化合成的 BGM（音质有限）。
请将下载的高质量音乐素材以 **WAV 格式（48kHz, 16bit, 单声道或立体声）** 放入此目录。

## 命名规则

| 文件名 | 用途 | 建议风格 |
|--------|------|----------|
| `room_theme.wav` | 室内借球拍场景 (0~19s) | 轻松、日常、轻钢琴或木吉他 |
| `park_theme.wav` | 公园对打场景 (19~39s) | 轻快、运动、放克或流行 |
| `chaos_theme.wav` | 失控飞走场景 (39~68s) | 滑稽、紧张、卡通追逐乐 |

## 推荐免费素材来源

### 1. Pixabay Music（首选）
- 网址：https://pixabay.com/music/
- 许可：**免费商用，无需署名**
- 搜索关键词：
  - Room: `calm piano`, `happy acoustic`, `relaxing ukulele`
  - Park: `upbeat funk`, `energetic pop`, `playful`
  - Chaos: `comedy chase`, `cartoon funny`, `quirky fast`

### 2. Free Music Archive / FreePD
- 网址：https://freemusicarchive.org/ 或 https://freepd.com/
- 许可：CC BY（需署名）或 Public Domain

### 3. Fesliyan Studios
- 网址：https://www.fesliyanstudios.com/royalty-free-music/downloads-c/cartoon-music/86
- 有专门的 Cartoon 分类，质量较高

### 4. Videvo
- 网址：https://www.videvo.net/royalty-free-music/cartoon/
- 有 Comedy / Cartoon 专用分类

### 5. Freesound（音效）
- 网址：https://freesound.org/
- 适合找单个音效（如网球击球声、笑声等）

## 技术规格要求

- **格式**：WAV（推荐）或 MP3
- **采样率**：48000 Hz（与项目统一）
- **声道**：单声道或立体声均可
- **时长**：每段至少 25 秒，系统会自动截取所需片段
- **动态范围**：避免过度压缩（给对白留 headroom）

## 混音参数

系统在混音时会自动应用：
- **Fade In/Out**：按 SRT 中 `{Music:Play|fadeIn=2.0|fadeOut=1.5}` 的值执行正弦缓动
- **Sidechain Ducking**：对话期间自动压低 BGM（Depth: 32%, Attack: 0.12s, Release: 0.35s）
- **Soft Limiter**：防止削波

所以你选用的素材**不需要自带 ducking**，保持原曲即可。
