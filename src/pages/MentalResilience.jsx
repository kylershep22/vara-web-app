import React, { useState } from 'react';
import SidebarLayout from '../components/layout/SidebarLayout';
import { Heart, Smile, Brain, TrendingUp, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GratitudePractice from '../components/resilience/GratitudePractice';
import MindfulnessExercises from '../components/resilience/MindfulnessExercises';
import EmotionalCheckin from '../components/resilience/EmotionalCheckin';
import CognitiveReframing from '../components/resilience/CognitiveReframing';
import ResilienceTracker from '../components/resilience/ResilienceTracker';

export default function MentalResilience() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('gratitude'); // 'gratitude' | 'mindfulness' | 'emotions' | 'reframing' | 'tracker'

  const tabs = [
    { id: 'gratitude', label: 'Gratitude', icon: Heart },
    { id: 'mindfulness', label: 'Mindfulness', icon: Sparkles },
    { id: 'emotions', label: 'Emotional Check-In', icon: Smile },
    { id: 'reframing', label: 'Cognitive Reframing', icon: Brain },
    { id: 'tracker', label: 'Resilience Tracker', icon: TrendingUp }
  ];

  return (
    <SidebarLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Heart className="text-[#1B5E57]" size={32} />
            <h1 className="text-3xl font-bold text-[#3E3E3E]">Mental Resilience</h1>
          </div>
          <p className="text-[#6B7280]">
            Build emotional strength, practice gratitude, and develop tools for navigating life's challenges
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto border-b border-gray-200 pb-0">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-[#1B5E57] text-[#1B5E57]'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <Icon size={20} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'gratitude' && <GratitudePractice userId={user?.uid} />}
          {activeTab === 'mindfulness' && <MindfulnessExercises userId={user?.uid} />}
          {activeTab === 'emotions' && <EmotionalCheckin userId={user?.uid} />}
          {activeTab === 'reframing' && <CognitiveReframing userId={user?.uid} />}
          {activeTab === 'tracker' && <ResilienceTracker userId={user?.uid} />}
        </div>
      </div>
    </SidebarLayout>
  );
}
