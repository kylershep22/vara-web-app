import React from 'react';
import SidebarLayout from '../components/layout/SidebarLayout';
import { Target, Clock, Music, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Focus() {
  const { user } = useAuth();

  return (
    <SidebarLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Target className="text-[#1B5E57]" size={32} />
            <h1 className="text-3xl font-bold text-[#3E3E3E]">Focus</h1>
          </div>
          <p className="text-[#6B7280]">
            Tools and techniques for deep work and sustained concentration
          </p>
        </div>

        {/* Content Sections - Placeholder */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* Pomodoro Timer */}
          <div className="bg-white rounded-xl shadow-sm border border-[#D5E3D1] p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="text-[#1B5E57]" size={24} />
              <h2 className="text-xl font-semibold text-[#3E3E3E]">Pomodoro Timer</h2>
            </div>
            <p className="text-[#6B7280] mb-4">
              Stay focused with customizable work sessions. Choose 10, 25, 60, or 90-minute intervals.
            </p>
            <button className="bg-gradient-to-r from-[#1B5E57] to-[#B8CDBA] text-white px-4 py-2 rounded-lg hover:shadow-lg transition-shadow">
              Start Focus Session
            </button>
          </div>

          {/* Binaural Beats */}
          <div className="bg-white rounded-xl shadow-sm border border-[#D5E3D1] p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <Music className="text-[#F59E0B]" size={24} />
              <h2 className="text-xl font-semibold text-[#3E3E3E]">Focus Music</h2>
            </div>
            <p className="text-[#6B7280] mb-4">
              Listen to binaural beats and focus-enhancing music to boost concentration.
            </p>
            <button className="text-[#1B5E57] font-medium hover:underline">
              Browse Music Library →
            </button>
          </div>

          {/* Routine Designer */}
          <div className="bg-white rounded-xl shadow-sm border border-[#D5E3D1] p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="text-[#8B5CF6]" size={24} />
              <h2 className="text-xl font-semibold text-[#3E3E3E]">Routine Designer</h2>
            </div>
            <p className="text-[#6B7280] mb-4">
              Design your ideal morning, evening, and Sunday routines for optimal productivity.
            </p>
            <button className="text-[#1B5E57] font-medium hover:underline">
              Create Routine →
            </button>
          </div>

        </div>

        {/* Focus Tips Section */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-[#D5E3D1] p-6">
          <h3 className="text-xl font-semibold text-[#3E3E3E] mb-4">Tips for Staying Focused</h3>
          <ul className="space-y-2 text-[#6B7280]">
            <li>• Eliminate distractions before starting your focus session</li>
            <li>• Use the Pomodoro Technique to maintain sustainable concentration</li>
            <li>• Take regular breaks to prevent mental fatigue</li>
            <li>• Create a dedicated workspace for deep work</li>
            <li>• Match your most challenging tasks to your peak energy hours</li>
          </ul>
        </div>

        {/* Coming Soon Notice */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Coming Soon</h3>
          <p className="text-blue-700">
            Pomodoro timer, binaural beats library, routine designer, focus session tracking, and productivity analytics are currently in development.
          </p>
        </div>
      </div>
    </SidebarLayout>
  );
}
