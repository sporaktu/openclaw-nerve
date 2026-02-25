/**
 * Voice phrase configuration — per-language stop/cancel phrases.
 *
 * Config file: <PROJECT_ROOT>/voice-phrases.json
 *
 * Format (v2 — per-language):
 * {
 *   "en": { "stopPhrases": [...], "cancelPhrases": [...] },
 *   "fr": { "stopPhrases": [...], "cancelPhrases": [...] }
 * }
 *
 * Legacy flat format (v1) is auto-migrated on first read:
 * { "stopPhrases": [...], "cancelPhrases": [...] }
 *   → becomes the "en" entry.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_VOICE_PHRASES, type LanguageVoicePhrases } from './constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const CONFIG_PATH = path.join(PROJECT_ROOT, 'voice-phrases.json');

type PhrasesStore = Record<string, LanguageVoicePhrases>;

let cached: PhrasesStore | null = null;
let cachedMtime = 0;

/** Check if object is legacy v1 flat format (has stopPhrases at top level). */
function isLegacyFormat(raw: unknown): raw is LanguageVoicePhrases {
  return (
    typeof raw === 'object' &&
    raw !== null &&
    'stopPhrases' in raw &&
    Array.isArray((raw as Record<string, unknown>).stopPhrases)
  );
}

/** Read the full per-language phrases store. */
function readStore(): PhrasesStore {
  try {
    const stat = fs.statSync(CONFIG_PATH);
    if (cached && stat.mtimeMs === cachedMtime) return cached;

    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));

    // Migrate legacy flat format → per-language
    if (isLegacyFormat(raw)) {
      const migrated: PhrasesStore = {
        en: {
          stopPhrases: raw.stopPhrases,
          cancelPhrases: Array.isArray(raw.cancelPhrases) ? raw.cancelPhrases : DEFAULT_VOICE_PHRASES.en.cancelPhrases,
        },
      };
      // Write migrated format back
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(migrated, null, 2), 'utf-8');
      cached = migrated;
      cachedMtime = fs.statSync(CONFIG_PATH).mtimeMs;
      return cached;
    }

    // v2 format — validate entries
    const store: PhrasesStore = {};
    for (const [lang, val] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof val === 'object' && val !== null) {
        const v = val as Record<string, unknown>;
        store[lang] = {
          stopPhrases: Array.isArray(v.stopPhrases) ? v.stopPhrases as string[] : [],
          cancelPhrases: Array.isArray(v.cancelPhrases) ? v.cancelPhrases as string[] : [],
        };
      }
    }
    cached = store;
    cachedMtime = stat.mtimeMs;
    return cached;
  } catch {
    // File missing or invalid — return empty (defaults come from constants)
    return {};
  }
}

/** Write the full store to disk and invalidate cache. */
function writeStore(store: PhrasesStore): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(store, null, 2), 'utf-8');
  cached = store;
  cachedMtime = fs.statSync(CONFIG_PATH).mtimeMs;
}

/**
 * Get voice phrases for a specific language.
 * Returns the user's custom phrases merged with English as fallback.
 * The matching logic should check both the language-specific set AND English.
 */
export function getVoicePhrases(lang?: string): LanguageVoicePhrases {
  const store = readStore();
  const effectiveLang = lang || 'en';

  // Get language-specific phrases (custom > defaults)
  const langPhrases = store[effectiveLang] || DEFAULT_VOICE_PHRASES[effectiveLang];
  const enPhrases = store['en'] || DEFAULT_VOICE_PHRASES.en;

  if (!langPhrases || effectiveLang === 'en') {
    return enPhrases;
  }

  // Merge: language-specific + English fallback (deduplicated)
  const merged: LanguageVoicePhrases = {
    stopPhrases: [...new Set([...langPhrases.stopPhrases, ...enPhrases.stopPhrases])],
    cancelPhrases: [...new Set([...langPhrases.cancelPhrases, ...enPhrases.cancelPhrases])],
  };

  // Wake phrases: language-specific only (no English merge — these replace, not augment)
  if (langPhrases.wakePhrases?.length) {
    merged.wakePhrases = langPhrases.wakePhrases;
  }

  return merged;
}

/**
 * Get phrases for a specific language only (no English merge).
 * Used by the settings UI to show what's configured per-language.
 */
export function getLanguagePhrases(lang: string): LanguageVoicePhrases | null {
  const store = readStore();
  return store[lang] || null;
}

/**
 * Check if custom phrases have been configured for a language.
 */
export function hasCustomPhrases(lang: string): boolean {
  const store = readStore();
  return lang in store;
}

/**
 * Save custom phrases for a specific language.
 */
export function setLanguagePhrases(lang: string, phrases: LanguageVoicePhrases): void {
  const store = readStore();
  const entry: LanguageVoicePhrases = {
    stopPhrases: phrases.stopPhrases.filter(p => p.trim().length > 0),
    cancelPhrases: phrases.cancelPhrases.filter(p => p.trim().length > 0),
  };
  if (phrases.wakePhrases?.length) {
    entry.wakePhrases = phrases.wakePhrases.filter(p => p.trim().length > 0);
  }
  store[lang] = entry;
  writeStore(store);
}

/**
 * Get the full store (for admin/debug).
 */
export function getAllPhrases(): PhrasesStore {
  return readStore();
}
