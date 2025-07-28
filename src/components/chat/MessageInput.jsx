import React, { useState } from 'react';
import { Smile, Send } from 'lucide-react';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';

export default function MessageInput({ onSend }) {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text);
    setText('');
    setShowEmojiPicker(false);
  };

  const handleEmojiSelect = (emoji) => {
    setText((prev) => prev + emoji.native);
  };

  return (
    <div className="relative">
      {showEmojiPicker && (
        <div className="absolute bottom-12 left-0 z-10">
          <Picker data={data} onEmojiSelect={handleEmojiSelect} theme="light" />
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          className="text-gray-500 hover:text-gray-700"
        >
          <Smile className="w-5 h-5" />
        </button>

        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-400"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend();
          }}
        />

        <button
          onClick={handleSend}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 text-sm font-semibold"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}