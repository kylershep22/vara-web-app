import React from 'react';
import { Sparkles } from 'lucide-react';

export default function AIConsentModal({ isOpen, saving, onEnable, onDecline }) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-consent-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50"
    >
      <div className="bg-white rounded-vara-lg shadow-vara-lg max-w-md w-full p-vara-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-dew-sage text-evergreen-teal">
            <Sparkles size={20} />
          </div>
          <h2
            id="ai-consent-title"
            className="text-vara-lg font-semibold text-soft-charcoal"
          >
            Enable AI features
          </h2>
        </div>

        <p className="text-vara-sm text-soft-charcoal leading-relaxed">
          To make Vara feel personal, a few features are powered by OpenAI: your daily plan, AI chat, and journal tools. When you use them, what you write is shared along with a bit of context so the response actually fits you. OpenAI doesn't use any of this to train their models, and you can turn AI off anytime in Settings.
        </p>

        <div className="flex gap-2 mt-6">
          <button
            type="button"
            onClick={onDecline}
            disabled={saving}
            className="flex-1 py-2.5 rounded-vara-md border border-divider text-vara-sm text-soft-charcoal hover:bg-dew-sage/50 transition disabled:opacity-50"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={onEnable}
            disabled={saving}
            className="flex-1 py-2.5 rounded-vara-md bg-evergreen-teal text-white text-vara-sm font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Enable AI'}
          </button>
        </div>
      </div>
    </div>
  );
}
