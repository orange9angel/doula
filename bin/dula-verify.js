#!/usr/bin/env node
/**
 * Dula Verify CLI
 * Usage: dula-verify <episode-dir>
 *
 * Thin wrapper around tools/verify_shots.js.
 * When installed via npm, this allows story projects to run:
 *   npx dula-verify .
 */
import '../tools/verify_shots.js';
