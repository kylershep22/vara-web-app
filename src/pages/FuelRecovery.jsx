import React, { useState } from 'react';
import SidebarLayout from '../components/layout/SidebarLayout';
import { Leaf, Moon, Wind, Brain, Apple, BookOpen, Dumbbell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SleepSection from '../components/fuelRecovery/SleepSection';
import BreathworkSection from '../components/fuelRecovery/BreathworkSection';
import StressManagementSection from '../components/fuelRecovery/StressManagementSection';
import MovementSection from '../components/fuelRecovery/MovementSection';
import NutritionSection from '../components/fuelRecovery/NutritionSection';
import WellnessVault from '../components/fuelRecovery/WellnessVault';

export default function FuelRecovery() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('sleep'); // 'sleep' | 'breathwork' | 'stress' | 'movement' | 'nutrition' | 'vault'

  const tabs = [
    { id: 'sleep', label: 'Sleep', icon: Moon },
    { id: 'breathwork', label: 'Breathwork', icon: Wind },
    { id: 'stress', label: 'Stress Management', icon: Brain },
    { id: 'movement', label: 'Movement', icon: Dumbbell },
    { id: 'nutrition', label: 'Nutrition', icon: Apple },
    { id: 'vault', label: 'Wellness Vault', icon: BookOpen }
  ];

  return (
    <SidebarLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Leaf className="text-[#1B5E57]" size={32} />
            <h1 className="text-3xl font-bold text-[#3E3E3E]">Fuel & Recovery</h1>
          </div>
          <p className="text-[#6B7280]">
            Essential resources for rest, recovery, and sustainable high performance
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
          {activeTab === 'sleep' && <SleepSection userId={user?.uid} />}
          {activeTab === 'breathwork' && <BreathworkSection userId={user?.uid} />}
          {activeTab === 'stress' && <StressManagementSection userId={user?.uid} />}
          {activeTab === 'movement' && <MovementSection userId={user?.uid} />}
          {activeTab === 'nutrition' && <NutritionSection userId={user?.uid} />}
          {activeTab === 'vault' && <WellnessVault userId={user?.uid} />}
        </div>
      </div>
    </SidebarLayout>
  );
}
