import React, { useState } from 'react';
import SidebarLayout from '../components/layout/SidebarLayout';
import { BarChart3, TrendingUp, Target, Zap, Moon, Brain } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import OverviewDashboard from '../components/insights/OverviewDashboard';
import HabitsAnalytics from '../components/insights/HabitsAnalytics';
import GoalsProgress from '../components/insights/GoalsProgress';
import FocusAnalytics from '../components/insights/FocusAnalytics';
import SleepAnalytics from '../components/insights/SleepAnalytics';
import AIInsights from '../components/insights/AIInsights';

export default function Insights() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'habits' | 'goals' | 'focus' | 'sleep' | 'ai'

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'habits', label: 'Habits', icon: TrendingUp },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'focus', label: 'Focus', icon: Zap },
    { id: 'sleep', label: 'Sleep', icon: Moon },
    { id: 'ai', label: 'AI Insights', icon: Brain }
  ];

  return (
    <SidebarLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="text-[#1B5E57]" size={32} />
            <h1 className="text-3xl font-bold text-[#3E3E3E]">Insights & Analytics</h1>
          </div>
          <p className="text-[#6B7280]">
            Track your progress, identify patterns, and understand what's working
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
          {activeTab === 'overview' && <OverviewDashboard userId={user?.uid} />}
          {activeTab === 'habits' && <HabitsAnalytics userId={user?.uid} />}
          {activeTab === 'goals' && <GoalsProgress userId={user?.uid} />}
          {activeTab === 'focus' && <FocusAnalytics userId={user?.uid} />}
          {activeTab === 'sleep' && <SleepAnalytics userId={user?.uid} />}
          {activeTab === 'ai' && <AIInsights userId={user?.uid} />}
        </div>
      </div>
    </SidebarLayout>
  );
}
