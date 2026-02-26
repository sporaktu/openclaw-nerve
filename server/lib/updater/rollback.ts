/**
 * Rollback to the last-known-good snapshot.
 * Checks out the saved git ref, rebuilds, and restarts the service.
 */

import { join } from 'node:path';
import { rmSync, existsSync } from 'node:fs';
import { loadSnapshot } from './snapshot.js';
import { gitFetchAndCheckout, buildProject } from './installer.js';
import type { Snapshot, ServiceManager, Reporter } from './types.js';

export interface RollbackResult {
  success: boolean;
  snapshot: Snapshot | null;
  error?: string;
}

/**
 * Perform a full rollback: checkout previous ref → rebuild → restart.
 * Does NOT throw — returns a result object.
 */
export async function rollback(
  cwd: string,
  serviceManager: ServiceManager | null,
  reporter: Reporter,
): Promise<RollbackResult> {
  const snapshot = loadSnapshot();
  if (!snapshot) {
    return { success: false, snapshot: null, error: 'No snapshot found — cannot rollback' };
  }

  reporter.info(`Rolling back to ${snapshot.version} (${snapshot.ref.slice(0, 8)})`);

  try {
    // 1. Checkout the previous ref
    reporter.verbose(`git checkout ${snapshot.ref}`);
    gitFetchAndCheckout(cwd, snapshot.ref);
    reporter.ok(`Checked out ${snapshot.ref.slice(0, 8)}`);

    // 2. Clean node_modules to avoid stale dependencies from the failed version
    const nodeModulesPath = join(cwd, 'node_modules');
    if (existsSync(nodeModulesPath)) {
      reporter.verbose('Cleaning node_modules...');
      try {
        rmSync(nodeModulesPath, { recursive: true, force: true });
      } catch {
        // Fall back to npm ci behavior — npm install will reconcile
        reporter.verbose('Could not remove node_modules, proceeding anyway');
      }
    }

    // 3. Rebuild
    reporter.verbose('Rebuilding...');
    buildProject(cwd);
    reporter.ok('Rebuild complete');

    // 4. Restart service (if available)
    if (serviceManager) {
      reporter.verbose(`Restarting via ${serviceManager.name}`);
      await serviceManager.restart();
      reporter.ok(`Service restarted via ${serviceManager.name}`);
    }

    return { success: true, snapshot };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, snapshot, error: message };
  }
}
