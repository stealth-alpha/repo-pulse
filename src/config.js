import path from "node:path";
import fs from "node:fs";
import { readJson, deepMerge } from "./util.js";

const CONFIG_NAME = "repo-pulse.config.json";

export const DEFAULT_CONFIG = {
  weeks: 12,
  maxAgeMonths: 12,
  issues: {
    enabled: true,
    repo: null, // "owner/name"; auto-detected from git remote when null
    limit: 200,
  },
  badges: {
    dir: ".repo-pulse",
    files: ["health", "velocity", "bus-factor", "deps", "issues"],
  },
};

export function configFileName() {
  return CONFIG_NAME;
}

/** Load optional config from `cwd`, deep-merged over defaults. */
export function loadConfig(cwd = process.cwd()) {
  const file = path.join(cwd, CONFIG_NAME);
  const raw = readJson(file, {});
  if (raw === null) throw new Error(`Invalid ${CONFIG_NAME} in ${cwd}`);
  return deepMerge(DEFAULT_CONFIG, raw);
}

export function configExists(cwd = process.cwd()) {
  return fs.existsSync(path.join(cwd, CONFIG_NAME));
}

/** Write a starter config. */
export function writeDefaultConfig(cwd = process.cwd()) {
  const file = path.join(cwd, CONFIG_NAME);
  fs.writeFileSync(file, JSON.stringify(DEFAULT_CONFIG, null, 2) + "\n");
  return file;
}
