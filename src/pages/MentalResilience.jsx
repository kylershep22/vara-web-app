import React from 'react';
import SidebarLayout from '../components/layout/SidebarLayout';
import { Brain, Puzzle, BookOpen, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function MentalResilience() {
  const { user } = useAuth();

  return (
    <SidebarLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="text-[#1B5E57]" size={32} />
            <h1 className="text-3xl font-bold text-[#3E3E3E]">Mental Resilience</h1>
          </div>
          <p className="text-[#6B7280]">
            Build cognitive reserve through daily puzzles and brain-healthy practices
          </p>
        </div>

        {/* Content Sections - Placeholder */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* Cognitive Reserve Education */}
          <div className="bg-white rounded-xl shadow-sm border border-[#D5E3D1] p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <BookOpen className="text-[#1B5E57]" size={24} />
              <h2 className="text-xl font-semibold text-[#3E3E3E]">What is Cognitive Reserve?</h2>
            </div>
            <p className="text-[#6B7280] mb-4">
              Learn about the science behind cognitive reserve and why it matters for brain health.
            </p>
            <button className="text-[#1B5E57] font-medium hover:underline">
              Learn More →
            </button>
          </div>

          {/* Daily Puzzle */}
          <div className="bg-white rounded-xl shadow-sm border border-[#D5E3D1] p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <Puzzle className="text-[#F59E0B]" size={24} />
              <h2 className="text-xl font-semibold text-[#3E3E3E]">Daily Puzzle</h2>
            </div>
            <p className="text-[#6B7280] mb-4">
              Challenge your brain with today's puzzle. Choose from Sudoku, patterns, memory games, and more.
            </p>
            <button className="bg-gradient-to-r from-[#1B5E57] to-[#B8CDBA] text-white px-4 py-2 rounded-lg hover:shadow-lg transition-shadow">
              Start Today's Puzzle
            </button>
          </div>

          {/* Brain-Building Activities */}
          <div className="bg-white rounded-xl shadow-sm border border-[#D5E3D1] p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="text-[#10B981]" size={24} />
              <h2 className="text-xl font-semibold text-[#3E3E3E]">Brain-Building Activities</h2>
            </div>
            <p className="text-[#6B7280] mb-4">
              Discover activities and strategies to build cognitive reserve in your daily life.
            </p>
            <button className="text-[#1B5E57] font-medium hover:underline">
              Explore Activities →
            </button>
          </div>

        </div>

        {/* Coming Soon Notice */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Coming Soon</h3>
          <p className="text-blue-700">
            Daily puzzles, interactive brain games, cognitive reserve education, and personalized brain-building recommendations are currently in development.
          </p>
        </div>
      </div>
    </SidebarLayout>
  );
}
