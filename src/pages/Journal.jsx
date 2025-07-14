// src/pages/Journal.jsx

import React from 'react';
import SidebarLayout from '../components/layout/SidebarLayout';
import {
  BookOpen, Smile, Filter, Share2, FileText
} from 'lucide-react';

export default function Journal() {
  return (
    <SidebarLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <BookOpen size={28} className="text-[#1B5E57]" />
          <h1 className="text-2xl font-semibold text-[#3E3E3E]">Journal</h1>
        </div>

        <p className="text-[#9AAE8C] mb-6">
          Capture your thoughts, emotions, and daily reflections through guided or free-form journaling.
        </p>

        {/* Entry Types */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="bg-white/80 border border-[#D5E3D1] rounded-2xl p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[#3E3E3E] mb-2">📝 Free-form Entry</h2>
            <p className="text-[#3E3E3E] text-sm">Write whatever’s on your mind in an open format with optional mood tags.</p>
          </div>
          <div className="bg-white/80 border border-[#D5E3D1] rounded-2xl p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[#3E3E3E] mb-2">✨ Guided Prompts</h2>
            <p className="text-[#3E3E3E] text-sm">Choose from reflective or gratitude-based prompts to get started.</p>
          </div>
        </div>

        {/* Mood Tagging + Filters */}
        <div className="mb-10">
          <h3 className="text-lg font-semibold text-[#3E3E3E] mb-4 flex items-center gap-2">
            <Smile className="text-[#1B5E57]" size={20} />
            Mood Tagging & Filters
          </h3>
          <div className="flex flex-wrap gap-3 mb-3">
            {["😊 Happy", "😢 Sad", "😐 Neutral", "😠 Frustrated", "😌 Calm"].map((tag, i) => (
              <button
                key={i}
                className="px-4 py-1 bg-[#D5E3D1] hover:bg-[#B8CDBA] text-[#1B5E57] rounded-full text-sm font-medium"
              >
                {tag}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-center text-sm text-[#9AAE8C]">
            <Filter size={16} />
            Filter entries by tag or emotion (coming soon)
          </div>
        </div>

        {/* Templates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="bg-white/80 border border-[#D5E3D1] rounded-2xl p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[#3E3E3E] mb-2">🌟 Gratitude Template</h2>
            <p className="text-[#3E3E3E] text-sm">“Today, I’m grateful for…”</p>
          </div>
          <div className="bg-white/80 border border-[#D5E3D1] rounded-2xl p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[#3E3E3E] mb-2">🪞 Reflection Template</h2>
            <p className="text-[#3E3E3E] text-sm">“One thing I learned about myself today…”</p>
          </div>
        </div>

        {/* Export/Share */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-[#3E3E3E] mb-4 flex items-center gap-2">
            <Share2 className="text-[#1B5E57]" size={20} />
            Export or Share
          </h3>
          <div className="bg-white/80 border border-[#D5E3D1] rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <p className="text-[#3E3E3E]">Export all journal entries as a secure PDF or .txt file.</p>
            <button className="px-4 py-2 bg-[#1B5E57] text-white rounded-lg flex items-center gap-2 text-sm hover:scale-105 transition">
              <FileText size={16} /> Export
            </button>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}


