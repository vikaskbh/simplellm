/**
 * Minimal logger compatible with all runtimes (Node, Edge, Lambda, Bun, Deno).
 * Uses console.* only — no fs, no process.stdout.write.
 */

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

let currentLevel = LEVELS.warn;

export function setLogLevel(level) {
  if (level in LEVELS) {
    currentLevel = LEVELS[level];
  }
}

export function log(level, ...args) {
  const lvl = LEVELS[level] ?? LEVELS.info;
  if (lvl < currentLevel) return;

  const prefix = `[simple-llm:${level}]`;

  switch (level) {
    case "debug":
      console.debug(prefix, ...args);
      break;
    case "info":
      console.info(prefix, ...args);
      break;
    case "warn":
      console.warn(prefix, ...args);
      break;
    case "error":
      console.error(prefix, ...args);
      break;
    default:
      console.log(prefix, ...args);
  }
}
