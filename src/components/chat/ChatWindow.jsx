import React, { useEffect, useRef, useState } from 'react';
import { db } from '../../firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

export default function ChatWindow({ groupId }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  // Scroll to bottom when new messages load
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Live Firestore listener (onSnapshot)
  useEffect(() => {
    if (!groupId) return;
    const messagesRef = collection(db, 'messages');
    const q = query(messagesRef, orderBy('timestamp'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const groupMessages = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((msg) => msg.chatId === groupId);
      setMessages(groupMessages);
      scrollToBottom();
    });

    return () => unsubscribe();
  }, [groupId]);

  const handleSendMessage = async (text) => {
    if (!user || !text.trim()) return;

    const newMessage = {
      chatId: groupId,
      senderId: user.uid,
      text: text.trim(),
      timestamp: serverTimestamp(),
      messageType: 'text',
      reactions: {},
      isEdited: false,
      editedAt: null
    };

    await addDoc(collection(db, 'messages'), newMessage);
  };

  return (
    <div className="bg-white rounded-xl border border-divider shadow-lg max-w-2xl mx-auto flex flex-col h-[500px]">
      <div className="px-4 py-3 border-b bg-gradient-to-r from-evergreen-teal to-evergreen-teal/80 text-white rounded-t-xl">
        <h2 className="font-semibold text-lg">Group Chat</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[--mist-white]">
        <MessageList messages={messages} currentUserId={user?.uid} />
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t px-4 py-3">
        <MessageInput onSend={handleSendMessage} />
      </div>
    </div>
  );
}
