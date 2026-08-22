import fs from "node:fs";
import path from "node:path";
import {
  log,
  error,
  warn,
  success,
  info,
  dim,
  bold,
  yellow,
} from "./util.js";
import {
  loadConfig,
  configExists,
  configFileName,
  writeDefaultConfig,
} from "./config.js";
import {
  isGitRepo,
  getCommits,
  getProjectName,
  getBranch,
  getHead,
  getRemoteUrl,
  parseGithubRemote,
} from "./git.js";
import { loadDeps, fetchPublishTimes } from "./metrics/deps.js";
import { fetchIssues } from "./metrics/issues.js";
import { buildSnapshot } from "./health.js";
import { snapshotBadges } from "./badge.js";
import { formatText, formatJson } from "./format.js";

const VERSION = "0.1.0";

export class RepoPulseError extends Error {}

function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const eq = arg.indexOf("=");
      if (eq !== -1) {
        flags[arg.slice(2, eq)] = arg.slice(eq + 1);
      } else {
        const next = argv[i + 1];
        if (next !== undefined && !next.startsWith("--")) {
          flags[arg.slice(2)] = next;
          i++;
        } else {
          flags[arg.slice(2)] = true;
        }
      }
    } else {
      positional.push(arg);
    }
  }
  return { flags, positional };
}

function printVersion() {
  log(VERSION);
}

function printHelp() {
  log(`repo-pulse ${VERSION}

${bold("Usage")}
  repo-pulse <command> [options]

${bold("Commands")}
  snapshot              Full health snapshot: velocity, bus factor, stale
                        deps, issue half-life (default command)
  badge                 Snapshot + write badge-ready JSON/SVG files
  init                  Create a ${configFileName()} in the current directory
  version               Print the repo-pulse version
  help                  Show this help

${bold("Options")}
  --format <f>          Output format: text | json (default: text)
  --write               Write report.json/report.txt next to badges
  --out <dir>           Output directory for badges (default: .repo-pulse)
  --weeks <n>           Velocity window in weeks (default: 12)
  --stale-months <n>    Dependency staleness threshold (default: 12)
  --repo <owner/name>   GitHub slug for issue half-life (auto-detected)
  --offline             Skip all network calls (deps + issues become unknown)
  --cwd <dir>           Repository directory (default: current directory)

${bold("Examples")}
  repo-pulse                       # text summary of the current repo
  repo-pulse --format json         # machine-readable snapshot
  repo-pulse badge --write         # emit .repo-pulse/*.svg + *.json
  repo-pulse --offline             # git-only metrics, no network
`);
}

async function collectSnapshot(flags) {
  const cwd = path.resolve(flags.cwd || process.cwd());
  if (!fs.existsSync(cwd) || !fs.statSync(cwd).isDirectory()) {
    throw new RepoPulseError(`Directory not found: ${cwd}`);
  }
  if (!isGitRepo(cwd)) {
    throw new RepoPulseError(
      `Not a git repository: ${cwd} (run inside a project with history)`
    );
  }

  const config = loadConfig(cwd);
  const offline = flags.offline === true;
  const weeks = parsePositiveInt(
    flags.weeks ?? config.weeks,
    "--weeks",
    "velocity window in weeks"
  );
  const maxAgeMonths = parsePositiveInt(
    flags["stale-months"] ?? config.maxAgeMonths,
    "--stale-months",
    "dependency staleness threshold in months"
  );

  const commits = getCommits({ cwd });
  let pkgPath = null;
  let cursor = cwd;
  while (cursor !== path.parse(cursor).root) {
    const candidate = path.join(cursor, "package.json");
    if (fs.existsSync(candidate)) {
      pkgPath = candidate;
      break;
    }
    cursor = path.dirname(cursor);
  }
  const deps = pkgPath ? loadDeps(pkgPath) : [];

  let publishTimes = {};
  if (!offline && deps.length > 0) {
    publishTimes = await fetchPublishTimes(deps);
  }

  const issuesEnabled = config.issues.enabled && !offline;
  let slug =
    flags.repo != null && flags.repo !== true
      ? String(flags.repo)
      : config.issues.repo || parseGithubRemote(getRemoteUrl(cwd));
  let issues = null;
  if (issuesEnabled && slug) {
    issues = await fetchIssues(slug, { limit: config.issues.limit });
  }

  const snapshot = buildSnapshot(
    { commits, deps, publishTimes, issues },
    { weeks, maxAgeMonths }
  );

  snapshot.repo = {
    name: getProjectName(cwd),
    branch: getBranch(cwd),
    head: getHead(cwd),
    github: slug || null,
    packageJson: pkgPath ? path.relative(cwd, pkgPath) : null,
    notes: [
      ...(offline ? ["offline mode: deps + issues skipped"] : []),
      ...(!issuesEnabled || !slug
        ? ["issue half-life unavailable (no GitHub slug)"]
        : []),
    ].filter(Boolean),
  };

  return snapshot;
}

function writeBadges(snapshot, outDir) {
  const dir = path.resolve(outDir);
  fs.mkdirSync(dir, { recursive: true });
  const written = [];
  for (const badge of snapshotBadges(snapshot)) {
    const base = badge.file.replace(/\.json$/, "");
    fs.writeFileSync(path.join(dir, `${base}.json`), badge.json);
    fs.writeFileSync(path.join(dir, `${base}.svg`), badge.svg);
    written.push(`${base}.json`, `${base}.svg`);
  }
  return { dir, written };
}

async function cmdSnapshot(flags) {
  const snapshot = await collectSnapshot(flags);
  const format = flags.format || "text";
  if (format === "json") {
    log(formatJson(snapshot));
  } else {
    log(formatText(snapshot));
  }

  if (flags.write) {
    const outDir = typeof flags.write === "string" ? flags.write : flags.out;
    const { dir } = writeBadges(snapshot, outDir || ".repo-pulse");
    fs.writeFileSync(path.join(dir, "report.json"), formatJson(snapshot));
    fs.writeFileSync(path.join(dir, "report.txt"), formatText(snapshot) + "\n");
    success(`Wrote report + badges to ${dim(dir)}`);
  }
  return 0;
}

async function cmdBadge(flags) {
  const snapshot = await collectSnapshot(flags);
  const outDir =
    (typeof flags.out === "string" && flags.out) || ".repo-pulse";
  const { dir, written } = writeBadges(snapshot, outDir);
  success(`Wrote ${written.length} files to ${dim(dir)}:`);
  for (const file of written) info(dim(file));
  return 0;
}

async function cmdInit(flags) {
  const cwd = path.resolve(flags.cwd || process.cwd());
  if (configExists(cwd)) {
    log(`${yellow("Existing")} ${configFileName()} already present in ${cwd}`);
    return 0;
  }
  const file = writeDefaultConfig(cwd);
  success(`Created ${path.basename(file)} in ${cwd}`);
  info(dim("Edit it to tune the velocity window, staleness and issue source."));
  return 0;
}

/** Parse an integer option, failing with a readable message. */
function parsePositiveInt(value, flagName, description) {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n) || n < 1) {
    throw new RepoPulseError(
      `${flagName} must be a positive integer (${description}); got ${JSON.stringify(value ?? null)}`
    );
  }
  return n;
}

export async function main(argv = process.argv.slice(2)) {
  const { flags, positional } = parseArgs(argv);

  // Global flags win over the command word: parseArgs puts every `--x` in
  // `flags`, so they would otherwise be invisible to the command dispatch.
  if (flags.version) {
    printVersion();
    return;
  }
  if (flags.help) {
    printHelp();
    return;
  }

  const command = positional[0] || "snapshot";

  try {
    switch (command) {
      case "snapshot":
      case "run":
        process.exitCode = await cmdSnapshot(flags);
        break;
      case "badge":
      case "badges":
        process.exitCode = await cmdBadge(flags);
        break;
      case "init":
        process.exitCode = await cmdInit(flags);
        break;
      case "-v":
      case "version":
        printVersion();
        break;
      case "-h":
      case "help":
        printHelp();
        break;
      default:
        error(`Unknown command: ${command}`);
        printHelp();
        process.exitCode = 1;
    }
  } catch (err) {
    error(err instanceof RepoPulseError ? err.message : err.stack);
    process.exitCode = 1;
  }
}
