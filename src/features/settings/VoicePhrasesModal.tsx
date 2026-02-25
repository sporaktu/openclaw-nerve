/**
 * VoicePhrasesModal — shown when switching to a non-English language
 * that doesn't have custom voice phrases configured yet.
 *
 * Lets the user set stop phrases (send), cancel phrases (abort),
 * pre-populated with translated defaults.
 */

import { useState, useEffect, useCallback } from 'react';
import { Globe, Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface VoicePhrasesModalProps {
  open: boolean;
  onClose: () => void;
  languageCode: string;
  languageName: string;
  languageNativeName: string;
}

interface PhrasesData {
  source: string;
  stopPhrases: string[];
  cancelPhrases: string[];
}

export function VoicePhrasesModal({
  open,
  onClose,
  languageCode,
  languageName,
  languageNativeName,
}: VoicePhrasesModalProps) {
  const [stopPhrases, setStopPhrases] = useState<string[]>([]);
  const [cancelPhrases, setCancelPhrases] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load defaults/existing phrases when modal opens
  useEffect(() => {
    if (!open || !languageCode) return;
    setLoaded(false);
    fetch(`/api/voice-phrases/${languageCode}`)
      .then(r => r.json())
      .then((data: PhrasesData) => {
        setStopPhrases(data.stopPhrases.length > 0 ? data.stopPhrases : ['']);
        setCancelPhrases(data.cancelPhrases.length > 0 ? data.cancelPhrases : ['']);
        setLoaded(true);
      })
      .catch(() => {
        setStopPhrases(['']);
        setCancelPhrases(['']);
        setLoaded(true);
      });
  }, [open, languageCode]);

  const updatePhrase = useCallback(
    (type: 'stop' | 'cancel', index: number, value: string) => {
      const setter = type === 'stop' ? setStopPhrases : setCancelPhrases;
      setter(prev => {
        const next = [...prev];
        next[index] = value;
        return next;
      });
    },
    [],
  );

  const addPhrase = useCallback((type: 'stop' | 'cancel') => {
    const setter = type === 'stop' ? setStopPhrases : setCancelPhrases;
    setter(prev => [...prev, '']);
  }, []);

  const removePhrase = useCallback((type: 'stop' | 'cancel', index: number) => {
    const setter = type === 'stop' ? setStopPhrases : setCancelPhrases;
    setter(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const resp = await fetch(`/api/voice-phrases/${languageCode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stopPhrases: stopPhrases.filter(p => p.trim()),
          cancelPhrases: cancelPhrases.filter(p => p.trim()),
        }),
      });
      if (resp.ok) onClose();
    } catch { /* ignore */ }
    setSaving(false);
  }, [languageCode, stopPhrases, cancelPhrases, onClose]);

  const handleSkip = useCallback(() => {
    // Close without saving — English phrases will be used as fallback
    onClose();
  }, [onClose]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Globe size={16} className="text-primary" />
            Voice Phrases — {languageName}
          </DialogTitle>
          <DialogDescription className="text-[12px] text-muted-foreground">
            Set the words you'll say in {languageNativeName} to send or cancel voice messages.
            English phrases always work as fallback.
          </DialogDescription>
        </DialogHeader>

        {loaded && (
          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
            {/* Stop (Send) Phrases */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold tracking-wide uppercase text-green">
                  Send Phrases
                </label>
                <span className="text-[10px] text-muted-foreground">
                  Say any of these to send your message
                </span>
              </div>
              {stopPhrases.map((phrase, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={phrase}
                    onChange={e => updatePhrase('stop', i, e.target.value)}
                    className="flex-1 px-3 py-1.5 text-[12px] bg-background border border-border/60 focus:border-primary outline-none transition-colors"
                    placeholder={`Send phrase ${i + 1}...`}
                    dir="auto"
                  />
                  {stopPhrases.length > 1 && (
                    <button
                      onClick={() => removePhrase('stop', i)}
                      className="p-1 text-muted-foreground hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => addPhrase('stop')}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus size={10} /> Add phrase
              </button>
            </div>

            {/* Cancel Phrases */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold tracking-wide uppercase text-orange">
                  Cancel Phrases
                </label>
                <span className="text-[10px] text-muted-foreground">
                  Say any of these to discard your message
                </span>
              </div>
              {cancelPhrases.map((phrase, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={phrase}
                    onChange={e => updatePhrase('cancel', i, e.target.value)}
                    className="flex-1 px-3 py-1.5 text-[12px] bg-background border border-border/60 focus:border-primary outline-none transition-colors"
                    placeholder={`Cancel phrase ${i + 1}...`}
                    dir="auto"
                  />
                  {cancelPhrases.length > 1 && (
                    <button
                      onClick={() => removePhrase('cancel', i)}
                      className="p-1 text-muted-foreground hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => addPhrase('cancel')}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus size={10} /> Add phrase
              </button>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            onClick={handleSkip}
            className="px-4 py-2 text-[11px] font-mono uppercase tracking-wide border border-border/60 text-muted-foreground hover:border-muted-foreground transition-colors"
          >
            Skip (use English)
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-[11px] font-mono uppercase tracking-wide bg-primary/20 border border-primary text-primary hover:bg-primary/30 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Phrases'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
