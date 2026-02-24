import type { ChatSendStatus } from './sendMessage';

export type RecoveryReason = 'frame-gap' | 'chat-gap' | 'reconnect' | 'unrenderable-final';

export interface RunState {
  runId: string;
  sessionKey: string;
  startedAt: number;
  lastChatSeq: number | null;
  lastFrameSeq: number | null;
  bufferText: string;
  finalized: boolean;
  status?: ChatSendStatus;
  stopReason?: string;
}

const FALLBACK_RUN_PREFIX = 'run-local';

export function createFallbackRunId(sessionKey: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${FALLBACK_RUN_PREFIX}:${sessionKey}:${Date.now()}:${rand}`;
}

export function hasSeqGap(lastSeq: number | null, nextSeq?: number): boolean {
  if (typeof nextSeq !== 'number') return false;
  if (lastSeq === null) return false;
  return nextSeq > lastSeq + 1;
}

export function updateHighestSeq(lastSeq: number | null, nextSeq?: number): number | null {
  if (typeof nextSeq !== 'number') return lastSeq;
  if (lastSeq === null) return nextSeq;
  return nextSeq > lastSeq ? nextSeq : lastSeq;
}

export function getOrCreateRunState(
  runs: Map<string, RunState>,
  runId: string,
  sessionKey: string,
): RunState {
  const existing = runs.get(runId);
  if (existing) return existing;

  const run: RunState = {
    runId,
    sessionKey,
    startedAt: Date.now(),
    lastChatSeq: null,
    lastFrameSeq: null,
    bufferText: '',
    finalized: false,
  };
  runs.set(runId, run);
  return run;
}

export function resolveRunId(
  runId: string | undefined,
  activeRunId: string | null,
  sessionKey: string,
): string {
  if (runId) return runId;
  if (activeRunId) return activeRunId;
  return createFallbackRunId(sessionKey);
}

export function pruneRunRegistry(runs: Map<string, RunState>, activeRunId: string | null): void {
  const finalized = [...runs.values()]
    .filter(run => run.finalized && run.runId !== activeRunId)
    .sort((a, b) => b.startedAt - a.startedAt);

  for (const run of finalized.slice(24)) {
    runs.delete(run.runId);
  }
}
