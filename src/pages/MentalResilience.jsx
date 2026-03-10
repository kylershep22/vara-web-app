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
      <div className="max-w-5xl mx-auto px-vara-base py-vara-lg">
        {/* Page Header */}
        <div className="mb-vara-lg">
          <div className="flex items-center gap-3 mb-2">
            <Heart className="text-evergreen-teal" size={32} />
            <h1 className="text-vara-2xl font-semibold text-evergreen-teal tracking-tight">Mental Resilience</h1>
          </div>
          <p className="text-muted-sage-gray">
            Build emotional strength, practice gratitude, and develop tools for navigating life's challenges
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mb-vara-lg overflow-x-auto border-b border-divider pb-0">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-evergreen-teal text-evergreen-teal'
                    : 'border-transparent text-muted-sage-gray hover:text-soft-charcoal hover:border-silver-sage'
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
