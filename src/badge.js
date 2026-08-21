import { escapeXml, round } from "./util.js";
import { healthColor } from "./health.js";

const COLOR_HEX = {
  brightgreen: "#4c1",
  green: "#97ca00",
  yellowgreen: "#a4a61f",
  yellow: "#dfb317",
  orange: "#fe7d37",
  red: "#e05d44",
  blue: "#007ec6",
  lightgrey: "#9f9f9f",
};

/** Approximate rendered text width for Verdana 11px. */
function textWidth(s) {
  return Math.round(6.5 * String(s).length);
}

/**
 * Shields.io "endpoint"-style JSON badge.
 */
export function badgeJson(label, message, color = "blue") {
  return {
    schemaVersion: 1,
    label: String(label),
    message: String(message),
    color,
  };
}

/**
 * Render a flat-style SVG badge string (no external assets).
 */
export function badgeSvg({ label, message, color = "blue" }) {
  const labelStr = String(label);
  const messageStr = String(message);
  const hex = COLOR_HEX[color] || COLOR_HEX.blue;
  const labelW = textWidth(labelStr) + 20;
  const messageW = textWidth(messageStr) + 20;
  const width = labelW + messageW;
  const labelX = labelW / 2;
  const messageX = labelW + messageW / 2;
  const gradId = `g${Math.abs(
    (labelStr + messageStr + color)
      .split("")
      .reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7)
  )}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="${escapeXml(
    labelStr
  )}: ${escapeXml(messageStr)}">
  <title>${escapeXml(labelStr)}: ${escapeXml(messageStr)}</title>
  <linearGradient id="${gradId}" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${width}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelW}" height="20" fill="#555"/>
    <rect x="${labelW}" width="${messageW}" height="20" fill="${hex}"/>
    <rect width="${width}" height="20" fill="url(#${gradId})"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelX}" y="14" fill="#010101" fill-opacity=".3">${escapeXml(
      labelStr
    )}</text>
    <text x="${labelX}" y="13">${escapeXml(labelStr)}</text>
    <text x="${messageX}" y="14" fill="#010101" fill-opacity=".3">${escapeXml(
      messageStr
    )}</text>
    <text x="${messageX}" y="13">${escapeXml(messageStr)}</text>
  </g>
</svg>
`;
}

/**
 * Derive the full badge set from a snapshot.
 * Returns an array of { file, label, message, color, json, svg }.
 */
export function snapshotBadges(snapshot) {
  const badges = [];
  const m = snapshot.metrics;
  const scores = snapshot.scores;

  badges.push(
    make("health", "health", scores.overall === null ? "n/a" : `${scores.overall}/100 ${scores.grade}`, healthColor(scores.overall))
  );

  if (m.velocity) {
    const color = m.velocity.average >= 5 ? "brightgreen" : m.velocity.average >= 1 ? "green" : m.velocity.average > 0 ? "yellow" : "red";
    badges.push(
      make(
        "velocity",
        "commits/week",
        `${round(m.velocity.average, 1)} (${m.velocity.trend})`,
        color
      )
    );
  }

  if (m.busFactor) {
    const bf = m.busFactor;
    const color =
      bf.score >= 3 ? "brightgreen" : bf.score === 2 ? "yellow" : "red";
    badges.push(
      make("bus-factor", "bus factor", `${bf.score} (${bf.risk})`, color)
    );
  }

  if (m.staleDeps && m.staleDeps.checked > 0) {
    const stale = m.staleDeps.stale.length;
    const color = stale === 0 ? "brightgreen" : stale <= 2 ? "yellow" : "red";
    badges.push(
      make(
        "deps",
        "stale deps",
        `${stale}/${m.staleDeps.checked}`,
        color
      )
    );
  } else {
    badges.push(make("deps", "stale deps", "unknown", "lightgrey"));
  }

  if (m.issueHalfLife) {
    const days = m.issueHalfLife.halfLifeDays;
    if (days === null) {
      badges.push(make("issues", "issue half-life", "no closed issues", "lightgrey"));
    } else {
      const color = days <= 7 ? "brightgreen" : days <= 30 ? "green" : days <= 90 ? "yellow" : "red";
      badges.push(
        make("issues", "issue half-life", `${days}d`, color)
      );
    }
  }

  return badges;

  function make(file, label, message, color) {
    return {
      file: `${file}.json`,
      label,
      message,
      color,
      json: JSON.stringify(badgeJson(label, message, color)) + "\n",
      svg: badgeSvg({ label, message, color }),
    };
  }
}
