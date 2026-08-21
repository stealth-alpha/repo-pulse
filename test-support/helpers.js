import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

export function makeTempDir(prefix = "repo-pulse-test-") {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

export function removeDir(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Build a commit object with a date `daysAgo` days before `now`. */
export function commitAt(daysAgo, author = "Ada", email = "ada@x.dev", now = Date.now()) {
  return {
    hash: Math.random().toString(16).slice(2, 10),
    short: Math.random().toString(16).slice(2, 8),
    author,
    email,
    date: new Date(now - daysAgo * DAY_MS).toISOString(),
    subject: `commit ${daysAgo}d ago`,
  };
}

/** Create a real git repo in tmp with the given commits. */
export function makeGitRepo(commits) {
  const dir = makeTempDir("repo-pulse-git-");
  const git = (args) => execFileSync("git", args, { cwd: dir, stdio: "ignore" });
  git(["init", "-q"]);
  git(["config", "user.name", "Test User"]);
  git(["config", "user.email", "test@example.com"]);
  write(path.join(dir, "README.md"), "# Test\n");
  git(["add", "-A"]);
  for (const commit of commits) {
    if (commit.files) {
      for (const [file, content] of Object.entries(commit.files)) {
        write(path.join(dir, file), content);
      }
      git(["add", "-A"]);
    }
    const env = commit.author
      ? { ...process.env, GIT_AUTHOR_NAME: commit.author, GIT_AUTHOR_EMAIL: commit.email || "a@x.dev", GIT_COMMITTER_NAME: commit.author, GIT_COMMITTER_EMAIL: commit.email || "a@x.dev" }
      : process.env;
    const dates = commit.daysAgo
      ? [
          "--date",
          new Date(Date.now() - commit.daysAgo * DAY_MS).toISOString(),
        ]
      : [];
    execFileSync(
      "git",
      ["commit", "-q", "--allow-empty", "-m", commit.message, ...dates],
      { cwd: dir, stdio: "ignore", env }
    );
  }
  return dir;
}
