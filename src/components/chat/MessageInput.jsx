// src/components/common/MessageInput.jsx
import React, { useState } from 'react';
import { Smile, Send } from 'lucide-react';

export default function MessageInput({ onSend }) {
  const [text, setText] = useState('');
  const [showEmojiBar, setShowEmojiBar] = useState(false);

  const EMOJIS = ['👍', '🎯', '✨', '💪', '😊', '🧘'];

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    setShowEmojiBar(false);
  };

  const handleEmojiSelect = (emoji) => {
    setText((prev) => `${prev}${prev && !prev.endsWith(' ') ? ' ' : ''}${emoji}`);
  };

  return (
    <div className="relative">
      {/* Optional mini emoji bar (no external libs) */}
      {showEmojiBar && (
        <div className="absolute bottom-12 left-0 z-10 bg-white border border-divider rounded-xl shadow-lg p-2">
          <div className="flex flex-wrap gap-2">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => handleEmojiSelect(e)}
                className="px-2 py-1 rounded-lg hover:bg-dew-sage-light"
                aria-label={`Insert ${e}`}
              >
                <span className="text-lg">{e}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setShowEmojiBar((prev) => !prev)}
          className="text-soft-charcoal/70 hover:text-evergreen-teal"
          aria-label="Toggle emoji bar"
          title="Toggle emoji bar (Tip: Win + . or ⌃⌘Space for OS emoji)"
        >
          <Smile className="w-5 h-5" />
        </button>

        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 border border-divider rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-silver-sage bg-white"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          aria-label="Message text"
        />

        <button
          type="button"
          onClick={handleSend}
          className="bg-gradient-to-br from-evergreen-teal to-silver-sage text-white px-4 py-2 rounded-lg hover:opacity-95 text-sm font-semibold disabled:opacity-50"
          disabled={!text.trim()}
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
