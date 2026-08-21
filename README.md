# repo-pulse

**One command. One honest snapshot of your repository's health.**

Every maintainer knows the questions that matter but are annoying to answer:

- *Is this repo still moving?* — commit velocity over a trailing window
- *What happens if the main contributor disappears?* — bus factor
- *Which of my dependencies rotted while I wasn't looking?* — stale deps
- *Do issues actually get resolved here?* — issue half-life

`repo-pulse` answers all four in one run and emits **badge-ready JSON + SVG**, so
your README can show the truth without you maintaining a single badge by hand.
Zero dependencies, Node 18+, runs entirely on your machine.

## Install

```sh
npm install -g repo-pulse
```

or run it once without installing:

```sh
npx repo-pulse@latest
```

## 30-second quickstart

```sh
cd your-project

repo-pulse                 # human-readable snapshot in your terminal
repo-pulse --format json   # same data, machine-readable
repo-pulse badge           # writes .repo-pulse/*.svg + *.json badges
```

Sample output:

```
repo-pulse — repository health snapshot
repository: your-project (main)
head: 6946f23 @ 2026-08-21T22:58:08Z

commit velocity : 7.3/week avg over 12w (trend up, last 9, prev 5)
bus factor      : 2 (low) across 6 contributors — top: Ada (38%), Bob (24%), …
stale deps      : 1/14 older than 12m
  • left-pad@1.3.0 — last publish 2016-05-25 (3740d ago)
issue half-life : 4.5 days median time-to-close (3 open / 41 closed)

score           : 78/100 (grade B) [velocity 100, bus 50, deps 93, issues 97]
```

Drop the badges into your README like any other image:

```md
![health](./.repo-pulse/health.svg)
![bus factor](./.repo-pulse/bus-factor.svg)
```

## What each metric means

| Metric | Definition |
| --- | --- |
| **Commit velocity** | Average commits per week across the trailing window (default 12 weeks), plus an up/down/flat trend comparing the recent half to the older half. Merge commits excluded. |
| **Bus factor** | Smallest number of contributors whose commit share covers ≥50% of history. 1 = critical, 2 = low, 3+ = healthy. |
| **Stale deps** | Runtime + dev dependencies whose package's most recent npm publish is older than the threshold (default 12 months). Requires network; skipped gracefully offline. |
| **Issue half-life** | Median time-to-close of recent GitHub issues (PRs excluded). Open issues are counted but don't affect the median. |

The overall score is a plain average of the available component scores — no
magic weights, nothing hidden. When a metric can't be computed (offline, private
issues), it's excluded from the average instead of silently guessed.

## Configuration

Optional `repo-pulse.config.json` in your repository root:

```json
{
  "weeks": 12,
  "maxAgeMonths": 12,
  "issues": {
    "enabled": true,
    "repo": "owner/name",
    "limit": 200
  },
  "badges": {
    "dir": ".repo-pulse"
  }
}
```

Run `repo-pulse init` to generate it. Every field has a CLI flag equivalent:
`--weeks`, `--stale-months`, `--repo`, `--out`, `--format`, `--write`,
`--offline`.

## Badge formats

Each badge ships twice:

- **SVG** (`health.svg`) — flat shields-style vector, self-contained, no CDN.
- **JSON** (`health.json`) — [shields.io endpoint format](https://shields.io/badges/endpoint-badge),
  so you can serve it yourself and consume it with shields' `endpoint` badge.

## Privacy & network behavior

- Git metrics never leave your machine.
- Staleness checks hit `registry.npmjs.org`; issue metrics hit `api.github.com`
  (unauthenticated, public repos only).
- Use `--offline` for strictly local operation; unavailable metrics are marked
  as such rather than faked.

## License

MIT. See [LICENSE](LICENSE).

## Repo Pulse Pro

Shipping this across a portfolio of repositories? **Repo Pulse Pro ($9/month)**
adds multi-repo batch snapshots with a single aggregated dashboard file,
scheduled CI regeneration so your badges never go stale, trend history so you
can see whether health is improving or drifting month over month, custom
scoring profiles tuned to your team's definition of "healthy", and priority
support. It's the same engine under the hood — Pro just stops you from running
it by hand twenty times. License via Gumroad — link placeholder.
