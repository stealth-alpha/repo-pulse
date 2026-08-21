import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Minimal, dependency-free console output with ANSI colors.
 */
export const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
};

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;

export function paint(inner, code) {
  return useColor ? `${colors[code] ?? ""}${inner}${colors.reset}` : inner;
}

export function dim(s) {
  return paint(s, "dim");
}
export function bold(s) {
  return paint(s, "bold");
}
export function green(s) {
  return paint(s, "green");
}
export function red(s) {
  return paint(s, "red");
}
export function cyan(s) {
  return paint(s, "cyan");
}
export function yellow(s) {
  return paint(s, "yellow");
}

export function log(msg = "") {
  process.stdout.write(`${msg}\n`);
}

export function error(msg) {
  process.stderr.write(`${red("error")}: ${msg}\n`);
}

export function warn(msg) {
  process.stderr.write(`${yellow("warn")}: ${msg}\n`);
}

export function success(msg) {
  process.stdout.write(`${green("✓")} ${msg}\n`);
}

export function info(msg) {
  process.stdout.write(`${cyan("•")} ${msg}\n`);
}

/** Safe JSON read; returns fallback on any failure. */
export function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

/** Recursively merge `patch` into `base` (plain objects only). Arrays replace. */
export function deepMerge(base, patch) {
  if (patch === undefined) return base;
  if (!isPlainObject(base) || !isPlainObject(patch)) return patch;
  const out = { ...base };
  for (const key of Object.keys(patch)) {
    out[key] = deepMerge(base[key], patch[key]);
  }
  return out;
}

function isPlainObject(v) {
  return (
    v !== null &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    !(v instanceof Date)
  );
}

/** Clamp a number into [min, max]. */
export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

/** Round to `digits` decimals. */
export function round(n, digits = 1) {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

/** Escape text for inclusion in SVG/XML. */
export function escapeXml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export const PKG_ROOT = path.resolve(__dirname, "..");
