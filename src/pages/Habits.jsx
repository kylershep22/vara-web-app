// src/pages/Habits.jsx

import React, { useEffect, useState } from 'react';
import SidebarLayout from '../components/layout/SidebarLayout';
import { Target, Plus, CircleCheck } from 'lucide-react';
import { db } from '../firebase';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import AddHabitForm from '../components/habits/AddHabitForm';
import HabitList from '../components/habits/HabitList';
import AIBasedSuggestions from '../components/habits/AIBasedSuggestions';

export default function Habits() {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [selectedGoalId, setSelectedGoalId] = useState(null);
  const [habitSectionOpen, setHabitSectionOpen] = useState({});

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
        <div>
          <h1 className="text-3xl font-semibold text-[#1B5E57] flex items-center gap-2">
            <Target size={28} />
            Goals & Habits
          </h1>
          <p className="text-[#6B7280] mt-1">
            Link habits to each goal to better track your wellness journey and build consistency.
          </p>
        </div>

        {goals.map(goal => (
          <div key={goal.id} className="bg-white/90 border border-[#D5E3D1] rounded-2xl p-6 shadow-md">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-semibold text-[#3E3E3E]">{goal.title}</h2>
                <p className="text-sm text-[#6B7280]">Category: {goal.category}</p>
              </div>
              <button
                onClick={() => toggleHabitSection(goal.id)}
                className="text-sm px-4 py-2 rounded-lg bg-gradient-to-r from-[#1B5E57] to-[#B8CDBA] text-white hover:scale-105 transition"
              >
                {habitSectionOpen[goal.id] ? 'Hide Habits' : 'Add/View Habits'}
              </button>
            </div>

            {habitSectionOpen[goal.id] && (
              <div className="space-y-6">
                <AddHabitForm userId={user?.uid} goalId={goal.id} />
                <HabitList userId={user?.uid} goalId={goal.id} showCalendar />
                <AIBasedSuggestions userId={user?.uid} goal={goal} />
              </div>
            )}
          </div>
        ))}
      </div>
    </SidebarLayout>
  );
}
