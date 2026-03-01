// src/components/ai/AIChatWidget.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { buildUserContextSummary, pageLabelFromPath } from '../../services/userContextService';
import { Bot, Send, X, MessageCircle, Loader2 } from 'lucide-react';
import { authedPost } from '../../lib/apiClient';

export default function AIChatWidget() {
  const { user, isAuthReady } = useAuth?.() || { user: null, isAuthReady: true };
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(() => {
    const saved = sessionStorage.getItem('aiChatOpen');
    return saved ? JSON.parse(saved) : false;
  });
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [context, setContext] = useState(null);
  const [messages, setMessages] = useState(() => [
    { role: 'assistant', content: "Hi! I’m your Vara coach. How can I help today?" }
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(false);

  const endRef = useRef(null);

  const pageLabel = useMemo(() => pageLabelFromPath(location.pathname), [location.pathname]);

  // Show unread dot if assistant replies while closed
  useEffect(() => {
    if (!isOpen && messages.length > 1) setUnread(true);
  }, [messages, isOpen]);

  // Persist open/closed across route changes within session
  useEffect(() => {
    sessionStorage.setItem('aiChatOpen', JSON.stringify(isOpen));
  }, [isOpen]);

  // Fetch minimal user/page context once on first open
  useEffect(() => {
    const run = async () => {
      if (!isOpen || context) return;
      try {
        setIsLoadingContext(true);
        // If auth context isn't ready yet, we still proceed with null uid (server will handle)
        const summary = await buildUserContextSummary(user?.uid);
        setContext({
          page: { path: location.pathname, label: pageLabel },
          userSummary: summary
        });
      } catch (e) {
        // Non-fatal: coach will still respond without user summary
        console.warn('AIChatWidget: context build failed (non-fatal)', e);
        setContext({
          page: { path: location.pathname, label: pageLabel },
          userSummary: null
        });
      } finally {
        setIsLoadingContext(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Auto-scroll on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // ESC to close
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && isOpen) setIsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const toggleOpen = () => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) setUnread(false);
      return next;
    });
  };

  const sendMessage = async (text) => {
    const content = (text || '').trim();
    if (!content) return;

    // Optimistically append user message
    const userMessage = { role: 'user', content };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSending(true);

    try {
      const payload = {
        messages: [...messages, userMessage], // include prior history + new user message
        context: {
          page: context?.page || { path: location.pathname, label: pageLabel },
          userSummary: context?.userSummary || null
        }
      };

      // NOTE: Requires CRA proxy ("proxy": "http://localhost:5001") or a configured API base.
      const res = await authedPost('/api/ai-chat', payload);

      if (!res.ok) {
        throw new Error(`AI chat error (${res.status})`);
      }
      const data = await res.json();
      const assistantText = data?.reply || "Sorry — I couldn't generate a response right now.";

      setMessages((prev) => [...prev, { role: 'assistant', content: assistantText }]);
    } catch (e) {
      console.error(e);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: "I hit a snag reaching the coach. Check your connection and try again." }
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const suggestionChips = useMemo(() => {
    switch (pageLabel) {
      case 'Goals':
        return [
          'Recommend habits for my top goal',
          'Break my goal into milestones',
          'How should I track progress each week?'
        ];
      case 'Habits':
        return [
          'Suggest a 2-week plan to build consistency',
          'How can I improve my streak?',
          'Give me habit stacking ideas'
        ];
      case 'Journal':
        return [
          'Give me a reflection prompt',
          'Summarize patterns in my recent entries',
          'Help me reframe a stressful thought'
        ];
      case 'Community':
        return [
          'Find motivation from the community',
          'What challenge should I try this week?',
          'Draft a supportive reply'
        ];
      default:
        return [
          'What’s a small win I can get today?',
          'Recommend a 10-minute routine',
          'Personalized daily suggestion'
        ];
    }
  }, [pageLabel]);

  // -------- UI (Portal to <body> prevents clipping and stacking issues) --------
  const ui = (
    <>
      {/* Floating Button (hidden/disabled while open to avoid overlay click-through) */}
      <button
        aria-label="Open AI Coach"
        aria-expanded={isOpen}
        onClick={toggleOpen}
        className={`fixed bottom-4 right-4 rounded-full shadow-lg p-3 md:p-4 bg-gradient-to-br from-[#1B5E57] to-[#B8CDBA] text-white hover:shadow-xl transition
          ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}
        `}
        style={{ zIndex: 9999 }}
      >
        <div className="relative">
          <MessageCircle className="w-6 h-6 md:w-7 md:h-7" />
          {unread && (
            <span className="absolute -top-1 -right-1 inline-block w-2.5 h-2.5 rounded-full bg-[#F4C542]" />
          )}
        </div>
      </button>

      {/* Overlay Panel */}
      {isOpen && (
        <div
          aria-label="AI Coach panel"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 flex items-end md:items-center md:justify-end"
          style={{ zIndex: 9998 }}
        >
          {/* Click-away background */}
          <div className="absolute inset-0 bg-black/20" onClick={() => setIsOpen(false)} />

          {/* Panel */}
          <div className="relative w-full md:max-w-md md:mr-4 bg-[#FAFAF6] rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-3 md:p-4 border-b border-[#D5E3D1] bg-white">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-gradient-to-br from-[#F4C542] to-[#F5B971]">
                  <Bot className="w-5 h-5 text-[#3E3E3E]" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#1B5E57]">Vara Coach</div>
                  <div className="text-xs text-[#3E3E3E]/70">
                    {isLoadingContext ? 'Preparing your context…' : `Page: ${pageLabel}`}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
                className="p-2 rounded-md hover:bg-[#D5E3D1]/40"
              >
                <X className="w-5 h-5 text-[#3E3E3E]" />
              </button>
            </div>

            {/* Messages */}
            <div
              className="p-3 md:p-4 max-h-[70vh] md:max-h-[70vh] overflow-y-auto space-y-3 bg-[#FAFAF6]"
              aria-live="polite"
            >
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`px-3 py-2 rounded-2xl max-w-[85%] text-sm leading-relaxed ${
                      m.role === 'assistant'
                        ? 'bg-white border border-[#D5E3D1] text-[#3E3E3E]'
                        : 'bg-gradient-to-br from-[#1B5E57] to-[#B8CDBA] text-white'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex items-center gap-2 text-xs text-[#3E3E3E]/70">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Coach is thinking…
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Suggestions */}
            <div className="px-3 md:px-4 pt-2 pb-1 flex flex-wrap gap-2 bg-[#FAFAF6] border-t border-[#D5E3D1]">
              {suggestionChips.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(s)}
                  className="text-xs px-3 py-1.5 rounded-full bg-white border border-[#D5E3D1] hover:bg-[#D5E3D1]/40"
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 md:p-4 bg-white border-t border-[#D5E3D1]">
              <input
                aria-label="Type a message"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask for a nudge, idea, or plan…"
                className="flex-1 text-sm px-3 py-2 rounded-xl border border-[#D5E3D1] outline-none focus:ring-2 focus:ring-[#B8CDBA] bg-[#FAFAF6]"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-white bg-gradient-to-br from-[#1B5E57] to-[#B8CDBA] disabled:opacity-50"
              >
                <Send className="w-4 h-4" /> Send
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );

  // Mount into <body> so no parent overflow/stacking can clip it
  return createPortal(ui, document.body);
}

