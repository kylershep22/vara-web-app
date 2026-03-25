// src/pages/Habits.jsx

import React, { useEffect, useState } from 'react';
import SidebarLayout from '../components/layout/SidebarLayout';
import { Target, Plus } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import HabitCreateModal from '../components/dashboard/HabitCreateModal';
import HabitList from '../components/habits/HabitList';
import AIBasedSuggestions from '../components/habits/AIBasedSuggestions';

export default function Habits() {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [selectedGoalId, setSelectedGoalId] = useState(null);
  const [habitSectionOpen, setHabitSectionOpen] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (user) fetchGoals();
  }, [user]);

  const fetchGoals = async () => {
    const q = query(collection(db, 'goals'), where('userId', '==', user.uid));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setGoals(data);
  };

  const toggleHabitSection = (goalId) => {
    setHabitSectionOpen(prev => ({ ...prev, [goalId]: !prev[goalId] }));
    setSelectedGoalId(goalId);
  };

  return (
    <SidebarLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-evergreen-teal flex items-center gap-2">
              <Target size={28} />
              Goals & Habits
            </h1>
            <p className="text-muted-sage-gray mt-1">
              Link habits to each goal to better track your wellness journey and build consistency.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-evergreen-teal text-white rounded-lg text-sm font-medium hover:opacity-90 transition-colors"
          >
            <Plus size={16} />
            Create Habit
          </button>
        </div>

        {goals.map(goal => (
          <div key={goal.id} className="bg-white/90 border border-divider rounded-2xl p-6 shadow-md">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-semibold text-soft-charcoal">{goal.title}</h2>
                <p className="text-sm text-muted-sage-gray">Category: {goal.category}</p>
              </div>
              <button
                onClick={() => toggleHabitSection(goal.id)}
                className="text-sm px-4 py-2 rounded-lg bg-gradient-to-r from-evergreen-teal to-silver-sage text-white hover:scale-105 transition"
              >
                {habitSectionOpen[goal.id] ? 'Hide Habits' : 'View Habits'}
              </button>
            </div>

            {habitSectionOpen[goal.id] && (
              <div className="space-y-6">
                <HabitList userId={user?.uid} goalId={goal.id} showCalendar />
                <AIBasedSuggestions userId={user?.uid} goal={goal} />
              </div>
            )}
          </div>
        ))}

        {showCreateModal && (
          <HabitCreateModal
            userId={user?.uid}
            onClose={() => setShowCreateModal(false)}
            onSave={() => fetchGoals()}
          />
        )}
      </div>
    </SidebarLayout>
  );
}
