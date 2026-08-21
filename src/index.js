/**
 * repo-pulse — one-command repository health snapshot.
 *
 * Public API for programmatic use:
 *   buildSnapshot, commitVelocity, busFactor, findStaleDeps,
 *   issueHalfLife, snapshotBadges, badgeSvg, badgeJson
 */
export { buildSnapshot, gradeFor, healthColor } from "./health.js";
export { commitVelocity, velocityScore } from "./metrics/velocity.js";
export { busFactor, busFactorScore } from "./metrics/busfactor.js";
export {
  collectDeps,
  loadDeps,
  findStaleDeps,
  fetchPublishTimes,
} from "./metrics/deps.js";
export {
  issueHalfLife,
  issueHalfLifeScore,
  parseRepoSlug,
  fetchIssues,
} from "./metrics/issues.js";
export { snapshotBadges, badgeSvg, badgeJson } from "./badge.js";
export { formatText, formatJson } from "./format.js";
export {
  getCommits,
  parseLog,
  parseGithubRemote,
  isGitRepo,
} from "./git.js";
export { DEFAULT_CONFIG, loadConfig } from "./config.js";
