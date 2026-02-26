/**
 * GET /api/version/check — Check if a newer version is available.
 *
 * Runs `git ls-remote --tags origin` (same logic as the updater's
 * release-resolver), caches the result for 1 hour, and returns:
 *   { current, latest, updateAvailable }
 */

import { Hono } from 'hono';
import { exec } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rateLimitGeneral } from '../middleware/rate-limit.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf-8')) as {
  version: string;
};

interface VersionCache {
  latest: string;
  checkedAt: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
let cache: VersionCache | null = null;

/** Compare two semver strings. Returns negative if a < b, positive if a > b, 0 if equal. */
function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

/** Run a shell command asynchronously and return stdout. */
function execAsync(command: string, cwd: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, { cwd, timeout: timeoutMs }, (err, stdout) => {
      if (err) return reject(err);
      resolve(stdout);
    });
  });
}

/** Parse semver tags from git output lines. */
function parseTags(output: string): string[] {
  const semverRegex = /v?(\d+\.\d+\.\d+)$/;
  const versions: string[] = [];
  for (const line of output.split('\n')) {
    const match = semverRegex.exec(line.trim());
    if (match && !versions.includes(match[1])) {
      versions.push(match[1]);
    }
  }
  return versions;
}

/** Fetch the latest semver tag from remote, falling back to local tags. */
async function fetchLatestTag(cwd: string): Promise<string | null> {
  let versions: string[] = [];

  // Try remote first
  try {
    const output = await execAsync('git ls-remote --tags origin', cwd, 10_000);
    versions = parseTags(output);
  } catch {
    // Remote unreachable — fall through to local
  }

  // Fallback to local tags
  if (versions.length === 0) {
    try {
      const output = await execAsync('git tag -l', cwd, 5_000);
      versions = parseTags(output);
    } catch {
      return null;
    }
  }

  if (versions.length === 0) return null;
  versions.sort(compareSemver);
  return versions[versions.length - 1];
}

const app = new Hono();

app.get('/api/version/check', rateLimitGeneral, async (c) => {
  const now = Date.now();
  const cwd = resolve(__dirname, '../..');

  // Serve from cache if fresh
  if (cache && now - cache.checkedAt < CACHE_TTL_MS) {
    return c.json({
      current: pkg.version,
      latest: cache.latest,
      updateAvailable: compareSemver(cache.latest, pkg.version) > 0,
    });
  }

  // Resolve latest tag (async — doesn't block the event loop)
  const latest = await fetchLatestTag(cwd);
  if (!latest) {
    return c.json({
      current: pkg.version,
      latest: null,
      updateAvailable: false,
      error: 'Could not fetch remote tags',
    });
  }

  cache = { latest, checkedAt: now };

  return c.json({
    current: pkg.version,
    latest,
    updateAvailable: compareSemver(latest, pkg.version) > 0,
  });
});

export default app;
