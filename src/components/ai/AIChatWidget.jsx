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
    // Show universal quick prompts when chat is fresh
    if (messages.length <= 1) {
      return [
        ‘Help me focus’,
        ‘I need a reset’,
        ‘Build a routine’,
        ‘Feeling overwhelmed’,
      ];
    }
    // Page-specific suggestions after conversation starts
    switch (pageLabel) {
      case ‘Goals’:
        return [‘Recommend habits for my top goal’, ‘Break my goal into milestones’];
      case ‘Habits’:
        return [‘Suggest a plan to build consistency’, ‘Give me habit stacking ideas’];
      case ‘Journal’:
        return [‘Give me a reflection prompt’, ‘Help me reframe a stressful thought’];
      default:
        return ["What’s a small win I can get today?", ‘Recommend a 10-minute routine’];
    }
  }, [pageLabel, messages.length]);

  // -------- UI (Portal to <body> prevents clipping and stacking issues) --------
  const ui = (
    <>
      {/* Floating Button (hidden/disabled while open to avoid overlay click-through) */}
      <button
        aria-label="Open AI Coach"
        aria-expanded={isOpen}
        onClick={toggleOpen}
        className={`fixed bottom-4 right-4 rounded-full shadow-lg p-3 md:p-4 bg-gradient-to-br from-evergreen-teal to-silver-sage text-white hover:shadow-xl transition
          ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}
        `}
        style={{ zIndex: 9999 }}
      >
        <div className="relative">
          <MessageCircle className="w-6 h-6 md:w-7 md:h-7" />
          {unread && (
            <span className="absolute -top-1 -right-1 inline-block w-2.5 h-2.5 rounded-full bg-sunrise-amber" />
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
          <div className="relative w-full md:max-w-md md:mr-4 bg-mist-white rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-3 md:p-4 border-b border-divider bg-white">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-gradient-to-br from-sunrise-amber to-golden-apricot">
                  <Bot className="w-5 h-5 text-soft-charcoal" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-evergreen-teal">Vara Coach</div>
                  <div className="text-xs text-soft-charcoal/70">
                    {isLoadingContext ? 'Preparing your context…' : `Page: ${pageLabel}`}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
                className="p-2 rounded-md hover:bg-dew-sage-light"
              >
                <X className="w-5 h-5 text-soft-charcoal" />
              </button>
            </div>

            {/* Messages */}
            <div
              className="p-3 md:p-4 max-h-[70vh] md:max-h-[70vh] overflow-y-auto space-y-3 bg-mist-white"
              aria-live="polite"
            >
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`px-3 py-2 rounded-2xl max-w-[85%] text-sm leading-relaxed ${
                      m.role === 'assistant'
                        ? 'bg-white border border-divider text-soft-charcoal'
                        : 'bg-gradient-to-br from-evergreen-teal to-silver-sage text-white'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex items-center gap-2 text-xs text-soft-charcoal/70">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Coach is thinking…
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Suggestions */}
            <div className="px-3 md:px-4 pt-2 pb-1 flex flex-wrap gap-2 bg-mist-white border-t border-divider">
              {suggestionChips.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(s)}
                  className="text-xs px-3 py-1.5 rounded-full bg-white border border-divider hover:bg-dew-sage-light"
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 md:p-4 bg-white border-t border-divider">
              <input
                aria-label="Type a message"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask for a nudge, idea, or plan…"
                className="flex-1 text-sm px-3 py-2 rounded-xl border border-divider outline-none focus:ring-2 focus:ring-silver-sage bg-mist-white"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-white bg-gradient-to-br from-evergreen-teal to-silver-sage disabled:opacity-50"
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

