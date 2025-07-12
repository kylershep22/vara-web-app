// src/pages/GoalsHabits.jsx

import React, { useEffect, useState } from 'react';
import SidebarLayout from '../components/layout/SidebarLayout';
import { Target, PlusCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  addDoc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

import HabitList from '../components/habits/HabitList';
import AddHabitForm from '../components/habits/AddHabitForm';
import AIBasedSuggestions from '../components/habits/AIBasedSuggestions';

export default function GoalsHabits() {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);

  useEffect(() => {
    if (user) fetchGoals();
  }, [user]);

  const fetchGoals = async () => {
    const q = query(collection(db, 'goals'), where('userId', '==', user.uid));
    const snapshot = await getDocs(q);
    const goalData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setGoals(goalData);
  };

  return (
    <SidebarLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-12">
        <div className="flex items-center gap-3">
          <Target size={28} className="text-[#1B5E57]" />
          <h1 className="text-3xl font-semibold text-[#3E3E3E]">
            Goals & Habits
          </h1>
        </div>
        <p className="text-[#9AAE8C] max-w-xl">
          Align habits with your goals and track progress daily. Build consistency with support from AI-powered habit recommendations.
        </p>

        {/* Goals List */}
        {goals.length === 0 ? (
          <p className="text-gray-500 mt-8">No goals yet. Start by setting one in the Goals page.</p>
        ) : (
          goals.map((goal) => (
            <div key={goal.id} className="bg-white border border-[#D5E3D1] rounded-xl p-5 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-semibold text-[#1B5E57]">
                  🎯 {goal.title}
                </h2>
                <span className="text-sm text-[#9AAE8C]">{goal.category}</span>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Target: {goal.target} {goal.unit} | Frequency: {goal.frequency}
              </p>

              {/* AI Suggestions */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={18} className="text-yellow-500" />
                  <h3 className="text-sm font-semibold text-[#1B5E57]">AI-Recommended Habits</h3>
                </div>
                <AIBasedSuggestions goal={goal} />
              </div>

              {/* Add Habit Form */}
              <AddHabitForm userId={user.uid} goalId={goal.id} compact />

              {/* Habit List */}
              <div className="mt-4">
                <h4 className="text-sm text-[#3E3E3E] font-medium mb-1">Linked Habits</h4>
                <HabitList userId={user.uid} goalId={goal.id} />
              </div>
            </div>
          ))
        )}
      </div>
    </SidebarLayout>
  );
}
