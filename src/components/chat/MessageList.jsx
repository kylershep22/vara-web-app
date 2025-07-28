import React from 'react';
import { formatDistanceToNow } from 'date-fns';

export default function MessageList({ messages, currentUserId }) {
  return (
    <div className="space-y-2">
      {messages.map((msg) => {
        const isMe = msg.senderId === currentUserId;
        const time = msg.timestamp?.toDate?.() || new Date();

        return (
          <div
            key={msg.id}
            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] px-4 py-2 rounded-2xl shadow-sm text-sm whitespace-pre-wrap break-words
                ${isMe ? 'bg-emerald-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}
            >
              <div>{msg.text}</div>
              <div className="text-xs text-gray-400 mt-1 text-right">
                {formatDistanceToNow(time, { addSuffix: true })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
