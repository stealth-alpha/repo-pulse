import { execFileSync } from "node:child_process";

const RECORD_SEP = "\x1e";
const FIELD_SEP = "\x1f";

export function isGitRepo(cwd = process.cwd()) {
  try {
    execFileSync("git", ["rev-parse", "--is-inside-work-tree"], {
      cwd,
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

function runGit(args, cwd) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

/**
 * Parse raw `git log` output (custom separators) into commit objects:
 * { hash, short, author, email, date (ISO), subject }.
 */
export function parseLog(rawLog) {
  const commits = [];
  const records = rawLog.split(RECORD_SEP);
  for (const record of records) {
    if (!record.trim()) continue;
    const fields = record.split(FIELD_SEP);
    if (fields.length < 6) continue;
    const [hash, short, author, email, date, subject] = fields;
    commits.push({
      hash: hash.trim(),
      short: short.trim(),
      author: author.trim(),
      email: email.trim(),
      date: date.trim(),
      subject: subject.trim(),
    });
  }
  return commits;
}

/** Get commit history (merge-free), newest first. */
export function getCommits({
  cwd = process.cwd(),
  count = 5000,
} = {}) {
  const fmt = ["%H", "%h", "%an", "%ae", "%aI", "%s"].join(FIELD_SEP) + RECORD_SEP;
  let raw;
  try {
    raw = runGit(
      ["log", `--max-count=${count}`, "--no-merges", `--format=${fmt}`, "HEAD"],
      cwd
    );
  } catch {
    // Fresh repo with no commits yet.
    return [];
  }
  return parseLog(raw).filter((c) => c.hash && c.date);
}

export function getProjectName(cwd = process.cwd()) {
  return runGit(["rev-parse", "--show-toplevel"], cwd)
    .trim()
    .split(path.sep)
    .pop();
}

/** Current branch name, or null when detached. */
export function getBranch(cwd = process.cwd()) {
  try {
    return runGit(["rev-parse", "--abbrev-ref", "HEAD"], cwd).trim() || null;
  } catch {
    return null;
  }
}

/** Latest commit short hash + date. */
export function getHead(cwd = process.cwd()) {
  const commits = getCommits({ cwd, count: 1 });
  if (commits.length === 0) return null;
  return { hash: commits[0].short, date: commits[0].date };
}

/** First remote URL ("origin" preferred), or null. */
export function getRemoteUrl(cwd = process.cwd(), name = null) {
  let out;
  try {
    out = runGit(["remote", "-v"], cwd);
  } catch {
    return null;
  }
  const lines = out.split("\n").filter((l) => l.includes("(fetch)"));
  if (lines.length === 0) return null;
  const pick =
    lines.find((l) => l.startsWith(`${name || "origin"}\t`)) || lines[0];
  return pick.split("\t")[1].trim();
}

/**
 * Extract `owner/name` from a GitHub remote URL.
 * Handles https, ssh (git@github.com:) and git:// forms; strips .git suffix.
 */
export function parseGithubRemote(url) {
  if (!url) return null;
  const cleaned = url.trim().replace(/\.git$/i, "");
  let m =
    cleaned.match(/github\.com[/:]([^/]+)\/([^/?#]+)/i) ||
    cleaned.match(/^([^/:]+)\/([^/]+)$/); // already "owner/name"
  if (!m) return null;
  const owner = m[1];
  const name = m[2];
  if (!owner || !name) return null;
  return `${owner}/${name}`;
}
