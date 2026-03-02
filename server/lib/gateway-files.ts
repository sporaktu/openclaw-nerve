/**
 * Remote file access via Gateway tools API.
 *
 * When NERVE_REMOTE_WORKSPACE=true, Nerve reads workspace files through
 * the gateway's memory_get tool instead of the local filesystem.
 * This enables running Nerve in a container (e.g. K8s pod) while the
 * workspace lives on the gateway host.
 * @module
 */

import { invokeGatewayTool } from './gateway-client.js';

/** Whether remote workspace mode is enabled */
export const REMOTE_WORKSPACE = process.env.NERVE_REMOTE_WORKSPACE === 'true';

interface MemoryGetResult {
  content: Array<{ type: string; text: string }>;
}

/**
 * Read a workspace file via the gateway's memory_get tool.
 * Returns file content as string, or null if not found.
 */
export async function readRemoteFile(relativePath: string): Promise<string | null> {
  try {
    const result = (await invokeGatewayTool('memory_get', {
      path: relativePath,
    })) as MemoryGetResult;

    // memory_get returns { content: [{ type: "text", text: "..." }] }
    const text = result?.content?.[0]?.text;
    if (!text) return null;
    return text;
  } catch (err) {
    const msg = (err as Error).message;
    // Not found is expected for files that don't exist yet
    if (msg.includes('404') || msg.includes('not found') || msg.includes('No such file')) {
      return null;
    }
    console.warn(`[gateway-files] Failed to read ${relativePath}:`, msg);
    return null;
  }
}

/**
 * List files in a directory via gateway exec tool.
 * Returns array of filenames, or empty array on failure.
 */
export async function listRemoteDir(relativePath: string): Promise<string[]> {
  try {
    // Use memory_get with the directory path - gateway may support listing
    // For now, we'll use a different approach for daily memory files
    const result = (await invokeGatewayTool('memory_search', {
      query: '*',
      maxResults: 50,
    })) as MemoryGetResult;

    // Extract unique daily file paths from search results
    const text = result?.content?.[0]?.text;
    if (!text) return [];

    try {
      const parsed = JSON.parse(text);
      if (parsed.results) {
        const paths = new Set<string>();
        for (const r of parsed.results) {
          if (r.path && r.path.startsWith('memory/') && r.path.endsWith('.md')) {
            paths.add(r.path.replace('memory/', '').replace('.md', ''));
          }
        }
        return Array.from(paths);
      }
    } catch {
      // Not JSON, ignore
    }
    return [];
  } catch (err) {
    console.warn(`[gateway-files] Failed to list ${relativePath}:`, (err as Error).message);
    return [];
  }
}
