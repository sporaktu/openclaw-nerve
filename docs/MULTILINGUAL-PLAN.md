# Multilingual Voice Support — Implementation Plan

## Overview

Add multilingual voice support (STT + TTS) for the top 10 most spoken languages plus German. Language preference drives both speech-to-text and text-to-speech, with per-provider compatibility checks and graceful fallback.

## Supported Languages

| # | Language | Locale | Speakers | Edge TTS Voice (F) | Edge TTS Voice (M) | Qwen3 TTS | OpenAI TTS |
|---|----------|--------|----------|---------------------|---------------------|------------|------------|
| 1 | English | `en` | 1.5B | `en-US-AriaNeural` | `en-US-GuyNeural` | ✅ `English` | ✅ auto |
| 2 | Mandarin Chinese | `zh` | 1.1B | `zh-CN-XiaoxiaoNeural` | `zh-CN-YunxiNeural` | ✅ `Chinese` | ✅ auto |
| 3 | Hindi | `hi` | 600M | `hi-IN-SwaraNeural` | `hi-IN-MadhurNeural` | ❌ | ✅ auto |
| 4 | Spanish | `es` | 560M | `es-ES-ElviraNeural` | `es-ES-AlvaroNeural` | ✅ `Spanish` | ✅ auto |
| 5 | French | `fr` | 310M | `fr-FR-DeniseNeural` | `fr-FR-HenriNeural` | ✅ `French` | ✅ auto |
| 6 | Arabic | `ar` | 310M | `ar-SA-ZariyahNeural` | `ar-SA-HamedNeural` | ❌ | ✅ auto |
| 7 | Bengali | `bn` | 270M | `bn-IN-TanishaaNeural` | `bn-BD-PradeepNeural` | ❌ | ✅ auto |
| 8 | Portuguese | `pt` | 260M | `pt-BR-FranciscaNeural` | `pt-BR-AntonioNeural` | ✅ `Portuguese` | ✅ auto |
| 9 | Russian | `ru` | 255M | `ru-RU-SvetlanaNeural` | `ru-RU-DmitryNeural` | ✅ `Russian` | ✅ auto |
| 10 | Japanese | `ja` | 125M | `ja-JP-NanamiNeural` | `ja-JP-KeitaNeural` | ✅ `Japanese` | ✅ auto |
| 11 | German | `de` | 130M | `de-DE-KatjaNeural` | `de-DE-ConradNeural` | ✅ `German` | ✅ auto |

### Provider Coverage Summary

- **Edge TTS**: 11/11 ✅
- **Qwen3 TTS (Replicate)**: 8/11 (missing Hindi, Arabic, Bengali)
- **OpenAI TTS**: 11/11 ✅ (auto-detects from input text)
- **Local Whisper (multilingual)**: 11/11 ✅
- **OpenAI Whisper API**: 11/11 ✅ (auto-detects)

---

## Phase 1: Constants & Language Registry

### File: `server/lib/constants.ts`

**1a. Add multilingual whisper models alongside .en models:**

```ts
export const WHISPER_MODEL_FILES: Record<string, string> = {
  // English-only (legacy, slightly better English accuracy)
  'tiny.en':  'ggml-tiny.en.bin',
  'base.en':  'ggml-base.en.bin',
  'small.en': 'ggml-small.en.bin',
  // Multilingual (same size, 99 languages)
  'tiny':     'ggml-tiny.bin',
  'base':     'ggml-base.bin',
  'small':    'ggml-small.bin',
};

// New installs default to multilingual
export const WHISPER_DEFAULT_MODEL = 'tiny';
```

**1b. Add language registry:**

```ts
export interface LanguageConfig {
  code: string;         // ISO 639-1
  name: string;         // Display name
  nativeName: string;   // Name in own language
  whisperCode: string;  // Whisper language code
  edgeTtsVoices: {
    female: string;
    male: string;
  };
  qwen3Language: string | null;  // null = not supported
}

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  {
    code: 'en', name: 'English', nativeName: 'English',
    whisperCode: 'en',
    edgeTtsVoices: { female: 'en-US-AriaNeural', male: 'en-US-GuyNeural' },
    qwen3Language: 'English',
  },
  {
    code: 'zh', name: 'Chinese', nativeName: '中文',
    whisperCode: 'zh',
    edgeTtsVoices: { female: 'zh-CN-XiaoxiaoNeural', male: 'zh-CN-YunxiNeural' },
    qwen3Language: 'Chinese',
  },
  {
    code: 'hi', name: 'Hindi', nativeName: 'हिन्दी',
    whisperCode: 'hi',
    edgeTtsVoices: { female: 'hi-IN-SwaraNeural', male: 'hi-IN-MadhurNeural' },
    qwen3Language: null, // Not supported
  },
  {
    code: 'es', name: 'Spanish', nativeName: 'Español',
    whisperCode: 'es',
    edgeTtsVoices: { female: 'es-ES-ElviraNeural', male: 'es-ES-AlvaroNeural' },
    qwen3Language: 'Spanish',
  },
  {
    code: 'fr', name: 'French', nativeName: 'Français',
    whisperCode: 'fr',
    edgeTtsVoices: { female: 'fr-FR-DeniseNeural', male: 'fr-FR-HenriNeural' },
    qwen3Language: 'French',
  },
  {
    code: 'ar', name: 'Arabic', nativeName: 'العربية',
    whisperCode: 'ar',
    edgeTtsVoices: { female: 'ar-SA-ZariyahNeural', male: 'ar-SA-HamedNeural' },
    qwen3Language: null, // Not supported
  },
  {
    code: 'bn', name: 'Bengali', nativeName: 'বাংলা',
    whisperCode: 'bn',
    edgeTtsVoices: { female: 'bn-IN-TanishaaNeural', male: 'bn-BD-PradeepNeural' },
    qwen3Language: null, // Not supported
  },
  {
    code: 'pt', name: 'Portuguese', nativeName: 'Português',
    whisperCode: 'pt',
    edgeTtsVoices: { female: 'pt-BR-FranciscaNeural', male: 'pt-BR-AntonioNeural' },
    qwen3Language: 'Portuguese',
  },
  {
    code: 'ru', name: 'Russian', nativeName: 'Русский',
    whisperCode: 'ru',
    edgeTtsVoices: { female: 'ru-RU-SvetlanaNeural', male: 'ru-RU-DmitryNeural' },
    qwen3Language: 'Russian',
  },
  {
    code: 'ja', name: 'Japanese', nativeName: '日本語',
    whisperCode: 'ja',
    edgeTtsVoices: { female: 'ja-JP-NanamiNeural', male: 'ja-JP-KeitaNeural' },
    qwen3Language: 'Japanese',
  },
  {
    code: 'de', name: 'German', nativeName: 'Deutsch',
    whisperCode: 'de',
    edgeTtsVoices: { female: 'de-DE-KatjaNeural', male: 'de-DE-ConradNeural' },
    qwen3Language: 'German',
  },
];

export const DEFAULT_LANGUAGE = 'en';
```

---

## Phase 2: Server — Language Resolution & Provider Wiring

### File: `server/lib/language.ts` (NEW)

Central language resolution helper:

```ts
export function resolveLanguage(code: string): LanguageConfig | undefined
export function getEdgeTtsVoice(langCode: string, gender?: 'female' | 'male'): string
export function getQwen3Language(langCode: string): string | null
export function isLanguageSupported(provider: 'edge' | 'qwen3' | 'openai', langCode: string): boolean
export function getFallbackInfo(provider: string, langCode: string): { supported: boolean; fallbackLang: string; warning?: string }
```

### File: `server/services/whisper-local.ts`

**Changes:**
- Accept `language` parameter in `transcribe()` function
- Pass it to whisper context: `whisperContext.transcribe(audioPath, { language })`
- If language is `'en'` and model is `.en`, no change
- If language is non-English and model is `.en`, return error with suggestion to switch model
- Auto-detect mode (no language param) remains default behavior

### File: `server/services/edge-tts.ts`

**Changes:**
- Import `getEdgeTtsVoice` from language helper
- Replace hardcoded `DEFAULT_VOICE` with language-aware resolution:
  ```ts
  const effectiveVoice = voice || getEdgeTtsVoice(config.language, config.edgeVoiceGender) || DEFAULT_VOICE;
  ```
- Existing per-voice override in config still takes priority (power users)

### File: `server/routes/transcribe.ts`

**Changes:**
- `POST /api/transcribe`: Pass `config.language` to whisper/OpenAI as language hint
- `PUT /api/transcribe/config`: Accept `language` field, validate against `SUPPORTED_LANGUAGES`
- `GET /api/transcribe/config`: Return current language in response
- Hot-reload: update `config.language` in runtime + write `LANGUAGE` to `.env`

### File: `server/lib/config.ts`

**Changes:**
- Add `language` field: `language: process.env.LANGUAGE || 'en'`
- Add `edgeVoiceGender` field: `edgeVoiceGender: process.env.EDGE_VOICE_GENDER || 'female'`

### File: `server/lib/tts-config.ts`

**Changes:**
- TTS provider resolution checks language compatibility
- If provider doesn't support language, log warning and fall back to English voice
- Return `{ voice, language, fallback: boolean, warning?: string }` from resolution

---

## Phase 3: Settings API

### File: `server/routes/settings.ts` or `transcribe.ts`

**New/modified endpoints:**

```
GET  /api/language          → { language: 'en', supported: [...], providers: { edge: true, qwen3: true, openai: true } }
PUT  /api/language          → { language: 'de' } → hot-reloads config + writes .env
GET  /api/language/support  → full compatibility matrix (provider × language)
```

**Response shape for `/api/language/support`:**
```json
{
  "languages": [
    {
      "code": "en",
      "name": "English",
      "nativeName": "English",
      "stt": { "local": true, "openai": true },
      "tts": { "edge": true, "qwen3": true, "openai": true }
    },
    {
      "code": "hi",
      "name": "Hindi",
      "nativeName": "हिन्दी",
      "stt": { "local": true, "openai": true },
      "tts": { "edge": true, "qwen3": false, "openai": true }
    }
  ]
}
```

---

## Phase 4: UI — Language Selector & Warnings

### File: `src/features/settings/SettingsPanel.tsx` (or equivalent)

**Changes:**

1. **Language dropdown** in voice settings section:
   - Shows language name + native name: "German — Deutsch"
   - "Auto-detect" option at top (no language hint, whisper auto-detects)
   - Calls `PUT /api/language` on change

2. **Compatibility warnings:**
   - If selected TTS provider doesn't support language → yellow badge:
     "⚠️ Qwen3 doesn't support Hindi. Voice output will use English."
   - If whisper model is `.en` and language is non-English → prompt:
     "Download multilingual model? (same size, 75MB)"

3. **Voice gender toggle** for Edge TTS:
   - Female / Male selector
   - Updates `EDGE_VOICE_GENDER` in config

4. **Model download prompt:**
   - If user selects non-English language and current model is `.en`
   - Show inline button: "Switch to multilingual tiny (75MB, same size)"
   - Triggers model download + switch via existing `/api/transcribe/config`

---

## Phase 5: Migration & Defaults

### New Installs
- Default model: `tiny` (multilingual) instead of `tiny.en`
- Default language: `en` (English)
- Setup wizard: no change needed (language can be configured post-install via UI)

### Existing Installs
- **No breaking changes** — `.en` models still work, English stays default
- If user had `WHISPER_MODEL=tiny.en` in `.env`, it keeps working
- Language features are opt-in via settings UI
- `.en` models remain in `WHISPER_MODEL_FILES` for backwards compatibility

### .env Variables (all optional, hot-reloadable)
```
LANGUAGE=en                    # Language preference (ISO 639-1)
EDGE_VOICE_GENDER=female       # Edge TTS voice gender (female/male)
WHISPER_MODEL=tiny             # Changed default from tiny.en to tiny
STT_PROVIDER=local             # Unchanged
TTS_PROVIDER=edge              # Unchanged
```

---

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `server/lib/constants.ts` | Modify | Add multilingual models + language registry |
| `server/lib/language.ts` | **New** | Language resolution helper |
| `server/lib/config.ts` | Modify | Add `language`, `edgeVoiceGender` fields |
| `server/lib/tts-config.ts` | Modify | Language-aware TTS voice resolution |
| `server/services/whisper-local.ts` | Modify | Accept + pass language param |
| `server/services/edge-tts.ts` | Modify | Language-aware voice selection |
| `server/routes/transcribe.ts` | Modify | Language in config endpoints |
| `src/features/settings/*` | Modify | Language dropdown + warnings |

**Estimated scope:** ~300-400 lines across 8 files. No new dependencies.

---

## Testing Plan

1. **Per-language smoke test:** Record/upload short audio in each language → verify transcription
2. **Edge TTS voice test:** Synthesize "Hello" equivalent in each language → verify correct voice
3. **Qwen3 fallback test:** Set language to Hindi + TTS to Qwen3 → verify English fallback + warning
4. **Model switch test:** Set language to German while on `tiny.en` → verify prompt + download + switch
5. **Hot-reload test:** Change language via API → verify next transcription/synthesis uses new language
6. **Backwards compat:** Existing `tiny.en` user, no `LANGUAGE` env → verify everything works as before

---

## Open Questions

1. **Auto-detect as default?** Should the default language be `en` (explicit) or `auto` (let whisper decide)? Auto-detect adds ~200ms latency on local whisper but is more flexible.
2. **Per-session language?** Should language be global or per-chat-session? Global is simpler and covers 99% of use cases.
3. **Additional Edge TTS voice variants?** Some languages have 10+ voices (US English has ~20). Do we expose all of them or just one male + one female per language?
