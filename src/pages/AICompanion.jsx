// src/pages/AICompanion.jsx

import React from 'react';
import SidebarLayout from '../components/layout/SidebarLayout';
import {
  Bot, Smile, Sparkles, ListChecks, MessageCircleQuestion, BrainCircuit
} from 'lucide-react';
import MoodCheckIn from '../components/MoodCheckIn';

export default function AICompanion() {
  return (
    <SidebarLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="flex items-center gap-3 mb-4">
          <Bot size={28} className="text-evergreen-teal" />
          <h1 className="text-2xl font-semibold text-soft-charcoal">AI Companion</h1>
        </div>

        <p className="text-muted-sage-gray mb-6">
          Meet Vara — your intelligent wellness assistant for daily guidance, motivation, and reflection.
        </p>

        {/* Mood Check-In */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-soft-charcoal mb-3 flex items-center gap-2">
            <Smile className="text-evergreen-teal" size={20} />
            Mood Check-In + Suggestions
          </h2>
          <MoodCheckIn />
        </div>

        {/* Micro Coaching */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-soft-charcoal mb-3 flex items-center gap-2">
            <Sparkles className="text-evergreen-teal" size={20} />
            Micro Coaching Nudges
          </h2>
          <div className="bg-white/80 border border-divider rounded-2xl p-5 shadow-sm">
            <p className="text-soft-charcoal">Receive gentle nudges or behavior-based insights like “Try a 5-minute walk” or “Take 3 deep breaths now.”</p>
          </div>
        </div>

        {/* Dynamic Daily Plans */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-soft-charcoal mb-3 flex items-center gap-2">
            <ListChecks className="text-evergreen-teal" size={20} />
            Dynamic Daily Plans
          </h2>
          <div className="bg-white/80 border border-divider rounded-2xl p-5 shadow-sm">
            <p className="text-soft-charcoal">Your plan adapts based on your mood, check-ins, and recent activity. You’ll see a personalized flow to guide your day.</p>
          </div>
        </div>

        {/* Ask Vara */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-soft-charcoal mb-3 flex items-center gap-2">
            <MessageCircleQuestion className="text-evergreen-teal" size={20} />
            Ask Vara (AI Chat)
          </h2>
          <div className="bg-white/80 border border-divider rounded-2xl p-5 shadow-sm flex flex-col gap-4">
            <p className="text-soft-charcoal">Ask questions about wellness, mindset, nutrition, stress, and more. Vara responds in a warm, motivating tone.</p>
            <button className="self-start bg-gradient-to-r from-evergreen-teal to-silver-sage text-white px-4 py-2 rounded-lg font-medium hover:scale-105 transition">
              Ask Vara
            </button>
          </div>
        </div>

        {/* Bonus: Personalized Reflections */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-soft-charcoal mb-3 flex items-center gap-2">
            <BrainCircuit className="text-evergreen-teal" size={20} />
            AI-Powered Reflections
          </h2>
          <div className="bg-white/80 border border-divider rounded-2xl p-5 shadow-sm">
            <p className="text-soft-charcoal">End your day with short summaries of what you did well, where you stayed mindful, and one thing to celebrate 🎉</p>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}


