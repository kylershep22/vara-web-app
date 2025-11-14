import React from 'react';
import SidebarLayout from '../components/layout/SidebarLayout';
import { Lightbulb, Target, Heart, Compass } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function Insights() {
  const { user } = useAuth();

  return (
    <SidebarLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Lightbulb className="text-[#1B5E57]" size={32} />
            <h1 className="text-3xl font-bold text-[#3E3E3E]">Insights & Life Design</h1>
          </div>
          <p className="text-[#6B7280]">
            Deep reflection, values alignment, and intentional goal-setting
          </p>
        </div>

        {/* Content Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Wheel of Life */}
          <div className="bg-white rounded-xl shadow-sm border border-[#D5E3D1] p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <Compass className="text-[#1B5E57]" size={24} />
              <h2 className="text-xl font-semibold text-[#3E3E3E]">Wheel of Life</h2>
            </div>
            <p className="text-[#6B7280] mb-4">
              Assess your life balance across 8 key areas: Career, Health, Relationships, Growth, Finance, Recreation, Environment, and Legacy.
            </p>
            <button className="bg-gradient-to-r from-[#1B5E57] to-[#B8CDBA] text-white px-4 py-2 rounded-lg hover:shadow-lg transition-shadow">
              Complete Assessment
            </button>
          </div>

          {/* Core Values */}
          <div className="bg-white rounded-xl shadow-sm border border-[#D5E3D1] p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <Heart className="text-[#EF4444]" size={24} />
              <h2 className="text-xl font-semibold text-[#3E3E3E]">Core Values</h2>
            </div>
            <p className="text-[#6B7280] mb-4">
              Discover your core values through guided exercises. Use them to guide your goals and decisions.
            </p>
            <button className="text-[#1B5E57] font-medium hover:underline">
              Explore Values →
            </button>
          </div>

          {/* Purpose & Legacy */}
          <div className="bg-white rounded-xl shadow-sm border border-[#D5E3D1] p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <Lightbulb className="text-[#F59E0B]" size={24} />
              <h2 className="text-xl font-semibold text-[#3E3E3E]">Purpose & Legacy</h2>
            </div>
            <p className="text-[#6B7280] mb-4">
              Reflect deeply on your life's purpose and the legacy you want to create.
            </p>
            <button className="text-[#1B5E57] font-medium hover:underline">
              Begin Reflection →
            </button>
          </div>

          {/* Goals & Habits */}
          <div className="bg-gradient-to-br from-[#1B5E57] to-[#B8CDBA] rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow text-white">
            <div className="flex items-center gap-3 mb-4">
              <Target className="text-white" size={24} />
              <h2 className="text-xl font-semibold">Goals & Habits</h2>
            </div>
            <p className="mb-4 opacity-90">
              Design your life through intentional goals and daily habits aligned with your values.
            </p>
            <Link
              to="/goals-habits"
              className="inline-block bg-white text-[#1B5E57] px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-shadow"
            >
              View Goals & Habits
            </Link>
          </div>

        </div>

        {/* Reflective Questions */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-[#D5E3D1] p-6">
          <h3 className="text-xl font-semibold text-[#3E3E3E] mb-4">Questions for Self-Discovery</h3>
          <div className="space-y-4">
            <div className="border-l-4 border-[#1B5E57] pl-4">
              <p className="font-medium text-[#3E3E3E] mb-1">What do you want to be remembered for?</p>
              <p className="text-sm text-[#6B7280]">Consider the impact you want to have on others and the world.</p>
            </div>
            <div className="border-l-4 border-[#10B981] pl-4">
              <p className="font-medium text-[#3E3E3E] mb-1">Who do you want to become?</p>
              <p className="text-sm text-[#6B7280]">Think beyond achievements—focus on character and growth.</p>
            </div>
            <div className="border-l-4 border-[#F59E0B] pl-4">
              <p className="font-medium text-[#3E3E3E] mb-1">What brings you alive?</p>
              <p className="text-sm text-[#6B7280]">Identify the activities and moments where you feel most energized and authentic.</p>
            </div>
          </div>
        </div>

        {/* Life Design Philosophy */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-[#3E3E3E] mb-3">Life Design vs. Life Balance</h3>
          <p className="text-[#6B7280] mb-4">
            Traditional "work-life balance" assumes all areas should be equal. Life design recognizes that different seasons require different focus.
            The Wheel of Life helps you see where you are, and values-aligned goals help you design where you're going—intentionally.
          </p>
          <p className="text-sm text-[#6B7280] italic">
            "You don't have to be great to start, but you have to start to be great."
          </p>
        </div>

        {/* Coming Soon Notice */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Coming Soon</h3>
          <p className="text-blue-700">
            Interactive Wheel of Life assessment, values card sort exercise, guided purpose journaling, AI insights on life balance, and integration with your goals and habits.
          </p>
        </div>
      </div>
    </SidebarLayout>
  );
}
