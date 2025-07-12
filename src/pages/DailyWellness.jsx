// src/pages/DailyWellness.jsx

import React from 'react';
import SidebarLayout from '../components/layout/SidebarLayout';
import {
  CalendarHeart,
  Brain,
  Wind,
  NotebookPen,
  Smile,
  MessageCircleHeart,
  Zap,
  TrendingUp
} from 'lucide-react';

export default function DailyWellness() {
  return (
    <SidebarLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="flex items-center gap-3 mb-4">
          <CalendarHeart size={28} className="text-[#1B5E57]" />
          <h1 className="text-2xl font-semibold text-[#3E3E3E]">Daily Wellness</h1>
        </div>

        <p className="text-[#9AAE8C] mb-6">
          A personalized wellness hub designed to guide your day with intention.
        </p>

        {/* AI-Powered Plan */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold text-[#3E3E3E] mb-3 flex items-center gap-2">
            <Zap size={20} className="text-[#1B5E57]" />
            Today’s Plan (AI-Recommended)
          </h2>
          <div className="bg-white/80 border border-[#D5E3D1] rounded-2xl p-5 shadow-sm space-y-2">
            <ul className="list-disc ml-5 text-[#3E3E3E]">
              <li>Meditate for 10 minutes to center your thoughts</li>
              <li>Go for a 20-minute walk outdoors</li>
              <li>Write 3 things you're grateful for in your journal</li>
            </ul>
            <p className="text-sm text-gray-500">Based on your goals and recent activity.</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-10">
          <h3 className="text-lg font-semibold text-[#3E3E3E] mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Meditate', icon: Brain },
              { label: 'Breathe', icon: Wind },
              { label: 'Journal', icon: NotebookPen },
              { label: 'Track Mood', icon: Smile },
              { label: 'Reflect', icon: MessageCircleHeart },
              { label: 'Log Progress', icon: TrendingUp }
            ].map((action, i) => (
              <button
                key={i}
                className="flex flex-col items-center gap-2 bg-[#D5E3D1] hover:bg-[#B8CDBA] text-[#1B5E57] px-4 py-3 rounded-xl font-medium shadow-sm transition"
              >
                <action.icon size={24} />
                <span className="text-sm">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Reflection Prompt */}
        <div className="mb-10">
          <h3 className="text-lg font-semibold text-[#3E3E3E] mb-3">Daily Reflection</h3>
          <div className="bg-white/80 border border-[#D5E3D1] rounded-2xl p-5 shadow-sm">
            <p className="text-[#3E3E3E] mb-3">What's one thing that helped you feel grounded today?</p>
            <textarea
              placeholder="Write your reflection here..."
              className="w-full border border-[#D5E3D1] rounded-lg p-3 text-sm text-gray-700"
              rows={4}
            />
            <div className="text-right mt-2">
              <button className="px-4 py-2 bg-[#1B5E57] text-white rounded-lg text-sm hover:bg-[#164e48] transition">
                Save Reflection
              </button>
            </div>
          </div>
        </div>

        {/* Progress Summary (Placeholder) */}
        <div className="mb-16">
          <h3 className="text-lg font-semibold text-[#3E3E3E] mb-3">Today's Progress</h3>
          <div className="bg-white/80 border border-[#D5E3D1] rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-gray-500">Progress tracking widgets coming soon.</p>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}

