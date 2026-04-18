/**
 * Simple SRT parser.
 * Supports metadata tags like:
 *   @SceneName
 *   [CharacterName] Dialogue text
 *   {ActionName} body animation
 *   {Camera:MoveName|key=value} camera movement with optional params
 *   {Music:Action|key=value} music cue with optional params
 */
export class SRTParser {
  static parse(text) {
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const entries = [];
    let i = 0;

    while (i < lines.length) {
      // Skip empty lines
      if (lines[i].trim() === '') {
        i++;
        continue;
      }

      // Read index line
      const index = parseInt(lines[i].trim(), 10);
      i++;
      if (i >= lines.length) break;

      // Read time line: 00:00:01,000 --> 00:00:03,500
      const timeLine = lines[i].trim();
      i++;
      const timeMatch = timeLine.match(
        /(\d{2}):(\d{2}):(\d{2}),(\d{3})\s+-->\s+(\d{2}):(\d{2}):(\d{2}),(\d{3})/
      );
      if (!timeMatch) continue;

      const startTime =
        parseInt(timeMatch[1]) * 3600 +
        parseInt(timeMatch[2]) * 60 +
        parseInt(timeMatch[3]) +
        parseInt(timeMatch[4]) / 1000;
      const endTime =
        parseInt(timeMatch[5]) * 3600 +
        parseInt(timeMatch[6]) * 60 +
        parseInt(timeMatch[7]) +
        parseInt(timeMatch[8]) / 1000;

      // Read text lines until empty line
      const textLines = [];
      while (i < lines.length && lines[i].trim() !== '') {
        textLines.push(lines[i].trim());
        i++;
      }

      const content = textLines.join('\n');
      entries.push({
        index,
        startTime,
        endTime,
        content,
        scene: this.extractScene(content),
        character: this.extractCharacter(content),
        animations: this.extractAnimations(content),
        cameraMove: this.extractCameraMove(content),
        musicCue: this.extractMusicCue(content),
        dialogue: this.extractDialogue(content),
      });
    }

    return entries;
  }

  static extractScene(text) {
    const match = text.match(/^@(\w+)/m);
    return match ? match[1] : null;
  }

  static extractCharacter(text) {
    const match = text.match(/\[(\w+)\]/);
    return match ? match[1] : null;
  }

  static extractAnimations(text) {
    // Match all {Action} but NOT {Camera:...}
    const matches = text.matchAll(/\{(?!Camera:)(\w+)\}/g);
    return Array.from(matches).map((m) => m[1]);
  }

  static extractCameraMove(text) {
    const match = text.match(/\{Camera:([^}]+)\}/);
    if (!match) return null;

    const parts = match[1].split('|').map((s) => s.trim());
    const name = parts[0];
    const options = {};

    for (let i = 1; i < parts.length; i++) {
      const eqIdx = parts[i].indexOf('=');
      if (eqIdx === -1) continue;
      const key = parts[i].slice(0, eqIdx).trim();
      const valStr = parts[i].slice(eqIdx + 1).trim();

      if (valStr.includes(',')) {
        // Array of numbers: "6,2.5,2"
        options[key] = valStr.split(',').map((s) => {
          const n = Number(s.trim());
          return isNaN(n) ? s.trim() : n;
        });
      } else {
        const n = Number(valStr);
        options[key] = isNaN(n) ? valStr : n;
      }
    }

    return { name, options };
  }

  static extractMusicCue(text) {
    const match = text.match(/\{Music:([^}]+)\}/);
    if (!match) return null;
    const parts = match[1].split('|').map((s) => s.trim());
    const action = parts[0]; // Play, Stop, Duck, etc.
    const options = {};
    for (let i = 1; i < parts.length; i++) {
      const eqIdx = parts[i].indexOf('=');
      if (eqIdx === -1) continue;
      const key = parts[i].slice(0, eqIdx).trim();
      const valStr = parts[i].slice(eqIdx + 1).trim();
      const n = Number(valStr);
      options[key] = isNaN(n) ? valStr : n;
    }
    return { action, options };
  }

  static extractDialogue(text) {
    return text
      .replace(/^@\w+\s*/m, '')
      .replace(/\[\w+\]\s*/, '')
      .replace(/\{(?!Camera:)\w+\}\s*/g, '')
      .replace(/\{Camera:[^}]+\}\s*/, '')
      .replace(/\{Music:[^}]+\}\s*/, '')
      .trim();
  }
}
