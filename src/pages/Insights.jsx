import React, { useState } from 'react';
import SidebarLayout from '../components/layout/SidebarLayout';
import { BarChart3, TrendingUp, Target, Zap, Moon, Brain, Circle, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import OverviewDashboard from '../components/insights/OverviewDashboard';
import HabitsAnalytics from '../components/insights/HabitsAnalytics';
import GoalsProgress from '../components/insights/GoalsProgress';
import FocusAnalytics from '../components/insights/FocusAnalytics';
import SleepAnalytics from '../components/insights/SleepAnalytics';
import AIInsights from '../components/insights/AIInsights';
import WheelOfLife from '../components/insights/WheelOfLife';
import BrainHealthHub from '../components/insights/BrainHealthHub';

export default function Insights() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'habits' | 'goals' | 'focus' | 'sleep' | 'ai'

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'habits', label: 'Habits', icon: TrendingUp },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'focus', label: 'Focus', icon: Zap },
    { id: 'sleep', label: 'Sleep', icon: Moon },
    { id: 'wheel', label: 'Life Balance', icon: Circle },
    { id: 'brainhealth', label: 'Brain Health', icon: Activity },
    { id: 'ai', label: 'AI Insights', icon: Brain }
  ];

  return (
    <SidebarLayout>
      <div className="max-w-5xl mx-auto px-vara-base py-vara-lg">
        {/* Page Header */}
        <div className="mb-vara-lg">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="text-evergreen-teal" size={32} />
            <h1 className="text-vara-2xl font-semibold text-evergreen-teal tracking-tight">Insights & Analytics</h1>
          </div>
          <p className="text-muted-sage-gray">
            Track your progress, identify patterns, and understand what's working
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
          {activeTab === 'overview' && <OverviewDashboard userId={user?.uid} />}
          {activeTab === 'habits' && <HabitsAnalytics userId={user?.uid} />}
          {activeTab === 'goals' && <GoalsProgress userId={user?.uid} />}
          {activeTab === 'focus' && <FocusAnalytics userId={user?.uid} />}
          {activeTab === 'sleep' && <SleepAnalytics userId={user?.uid} />}
          {activeTab === 'wheel' && <WheelOfLife userId={user?.uid} />}
          {activeTab === 'brainhealth' && <BrainHealthHub userId={user?.uid} />}
          {activeTab === 'ai' && <AIInsights userId={user?.uid} />}
        </div>
      </div>
    </SidebarLayout>
  );
}
