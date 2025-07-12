// src/pages/SleepRecovery.jsx

import React from 'react';
import SidebarLayout from '../components/layout/SidebarLayout';
import {
  Moon, NotebookPen, Star, Wind, BookOpenCheck, History
} from 'lucide-react';

export default function SleepRecovery() {
  return (
    <SidebarLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="flex items-center gap-3 mb-4">
          <Moon size={28} className="text-[#1B5E57]" />
          <h1 className="text-2xl font-semibold text-[#3E3E3E]">Sleep & Recovery</h1>
        </div>

        <p className="text-[#9AAE8C] mb-6">
          Track your sleep quality, build a bedtime routine, and improve your recovery with mindfulness tools.
        </p>

        {/* Sleep Journal + Rating */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-[#3E3E3E] mb-3 flex items-center gap-2">
            <NotebookPen size={20} className="text-[#1B5E57]" />
            Sleep Journal + Rating
          </h2>
          <div className="bg-white/80 border border-[#D5E3D1] rounded-2xl p-5 shadow-sm">
            <p className="text-[#3E3E3E]">Log how you slept and rate your quality each morning. A prompt-driven journal will go here.</p>
          </div>
        </div>

        {/* Wind-Down Routine Builder */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-[#3E3E3E] mb-3 flex items-center gap-2">
            <Star size={20} className="text-[#1B5E57]" />
            Wind-Down Routine Builder
          </h2>
          <div className="bg-white/80 border border-[#D5E3D1] rounded-2xl p-5 shadow-sm">
            <p className="text-[#3E3E3E]">Create your custom evening routine with toggleable steps like breathwork, reading, light stretching, and gratitude journaling.</p>
          </div>
        </div>

        {/* Breathwork or Story Meditations */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-[#3E3E3E] mb-3 flex items-center gap-2">
            <Wind size={20} className="text-[#1B5E57]" />
            Bedtime Breathwork or Story Meditations
          </h2>
          <div className="bg-white/80 border border-[#D5E3D1] rounded-2xl p-5 shadow-sm">
            <p className="text-[#3E3E3E]">Browse short audio sessions to help you fall asleep calmly and restore deeply.</p>
          </div>
        </div>

        {/* Sleep History Dashboard */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-[#3E3E3E] mb-3 flex items-center gap-2">
            <History size={20} className="text-[#1B5E57]" />
            Sleep History (Coming Soon)
          </h2>
          <div className="bg-white/80 border border-[#D5E3D1] rounded-2xl p-5 shadow-sm">
            <p className="text-[#3E3E3E]">Optional integration with your smart watch, phone, or health apps to see patterns over time.</p>
          </div>
        </div>

        {/* Evening Reflection Prompts */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-[#3E3E3E] mb-3 flex items-center gap-2">
            <BookOpenCheck size={20} className="text-[#1B5E57]" />
            Evening Reflection
          </h2>
          <div className="bg-white/80 border border-[#D5E3D1] rounded-2xl p-5 shadow-sm">
            <p className="text-[#3E3E3E]">End your day with gratitude and insight. Reflection prompts and journaling will appear here each evening.</p>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
