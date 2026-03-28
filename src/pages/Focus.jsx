import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import SidebarLayout from '../components/layout/SidebarLayout';
import { Timer, Clock, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PomodoroTimer from '../components/focus/PomodoroTimer';
import RoutinesTab from '../components/focus/RoutinesTab';

const TABS = [
  { id: 'pomodoro', label: 'Pomodoro', icon: Clock },
  { id: 'routines', label: 'Routines', icon: Calendar },
];

export default function Focus() {
  const { user } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('pomodoro');

  useEffect(() => {
    if (location.state?.tab) setActiveTab(location.state.tab);
  }, [location.state]);

  return (
    <SidebarLayout>
      <div className="max-w-5xl mx-auto px-vara-base py-vara-lg">
        {/* Header */}
        <div className="mb-vara-lg">
          <div className="flex items-center gap-3 mb-vara-2xs">
            <Timer className="text-evergreen-teal" size={28} />
            <h1 className="text-vara-2xl font-semibold text-evergreen-teal tracking-tight">Focus</h1>
          </div>
          <p className="text-vara-sm text-muted-sage-gray">
            Tools and techniques for deep work and sustained concentration
          </p>
        </div>

        {/* Segmented Tab Bar */}
        <div className="flex items-center gap-1 p-1 bg-dew-sage-light rounded-vara-lg mb-vara-lg">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-vara-md text-vara-sm font-medium transition-all flex-1 justify-center ${
                  isActive
                    ? 'bg-white text-evergreen-teal shadow-vara-sm'
                    : 'text-muted-sage-gray hover:text-soft-charcoal'
                }`}
              >
                <Icon size={18} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'pomodoro' && (
            <div className="max-w-2xl mx-auto">
              <PomodoroTimer userId={user?.uid} />
            </div>
          )}
          {activeTab === 'routines' && (
            <RoutinesTab userId={user?.uid} />
          )}
        </div>

        {/* Focus Tips — shown on Pomodoro tab only */}
        {activeTab === 'pomodoro' && (
          <div className="mt-vara-xl bg-white rounded-vara-lg shadow-vara-sm border border-divider p-vara-lg">
            <h3 className="text-vara-lg font-semibold text-soft-charcoal mb-vara-base">Tips for Deep Focus</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-vara-base">
              <div>
                <h4 className="font-semibold text-soft-charcoal mb-2 text-vara-sm">Before You Start:</h4>
                <ul className="space-y-1 text-muted-sage-gray text-vara-sm">
                  <li>Close unnecessary browser tabs and apps</li>
                  <li>Turn off notifications on your devices</li>
                  <li>Have water and snacks within reach</li>
                  <li>Set a clear intention for the session</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-soft-charcoal mb-2 text-vara-sm">During Your Session:</h4>
                <ul className="space-y-1 text-muted-sage-gray text-vara-sm">
                  <li>Work on ONE task at a time</li>
                  <li>Take breaks to prevent burnout</li>
                  <li>Use the 20-20-20 rule for eye strain</li>
                  <li>Track your peak performance hours</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
