#!/usr/bin/env node
/**
 * Dula Audio CLI
 * Usage: dula-audio <episode-dir>
 *
 * Spawns the Python audio pipeline (tools/generate_audio.py).
 * When installed via npm, this allows story projects to run:
 *   npx dula-audio .
 */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EPISODE = process.argv[2] || '.';
const pyPath = path.resolve(__dirname, '..', 'tools', 'generate_audio.py');

// Determine python command (Windows usually has 'python', *nix often 'python3')
const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

console.log(`[dula-audio] Episode: ${path.resolve(EPISODE)}`);
console.log(`[dula-audio] Python script: ${pyPath}`);

const proc = spawn(pythonCmd, [pyPath, EPISODE], { stdio: 'inherit' });

proc.on('error', (err) => {
  console.error(`[dula-audio] Failed to spawn ${pythonCmd}:`, err.message);
  if (err.code === 'ENOENT') {
    console.error(`[dula-audio] Please ensure Python and edge-tts are installed.`);
  }
  process.exit(1);
});

proc.on('exit', (code) => {
  process.exit(code ?? 0);
});
