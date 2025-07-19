import React, { useEffect, useState } from 'react';
import SidebarLayout from '../components/layout/SidebarLayout';
import { Target, Sparkles, CalendarDays, ChevronDown, ChevronUp, CheckCircle, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc
} from 'firebase/firestore';

import HabitList from '../components/habits/HabitList';
import AddHabitForm from '../components/habits/AddHabitForm';
import AIBasedSuggestions from '../components/habits/AIBasedSuggestions';
import CalendarView from '../components/habits/CalendarView';
import GlobalHabitCalendar from '../components/habits/GlobalHabitCalendar';
import GoalCreationForm from '../components/goals/GoalCreationForm';

export default function GoalsHabits() {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [expandedGoalId, setExpandedGoalId] = useState(null);
  const [creatingGoal, setCreatingGoal] = useState(false);

  useEffect(() => {
    if (user) fetchGoals();
  }, [user]);

  const fetchGoals = async () => {
    const q = query(collection(db, 'goals'), where('userId', '==', user.uid));
    const snapshot = await getDocs(q);
    const goalData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setGoals(goalData);
  };

  const toggleExpand = (goalId) => {
    setExpandedGoalId(expandedGoalId === goalId ? null : goalId);
  };

  const handleSaveGoal = async (goalData) => {
    if (!user?.uid) {
      console.error('User not authenticated!');
      return;
    }

    try {
      const mappedGoal = {
        title: goalData.goalText,
        category: goalData.focus === 'custom' ? goalData.customFocus : goalData.focus,
        target: goalData.targetType,
        unit: goalData.measurement,
        frequency: goalData.frequency,
        habits: goalData.habits,
        timeframe: goalData.timeframe,
        userId: user.uid,
        createdAt: new Date()
      };

      const docRef = await addDoc(collection(db, 'goals'), mappedGoal);
      await fetchGoals();
      setExpandedGoalId(docRef.id);
      setCreatingGoal(false);
    } catch (error) {
      console.error('Error saving goal:', error);
    }
  };

  const handleDeleteGoal = async (goalId) => {
    await deleteDoc(doc(db, 'goals', goalId));
    fetchGoals();
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

        {/* Create New Goal Button */}
        {!creatingGoal && (
          <button
            className="flex items-center gap-2 text-sm text-[#1B5E57] border border-[#B8CDBA] px-4 py-2 rounded hover:bg-[#B8CDBA] hover:text-white transition"
            onClick={() => setCreatingGoal(true)}
          >
            <Plus size={16} /> Create a New Goal
          </button>
        )}

        {/* Goal Creation Form */}
        {creatingGoal && (
          <div className="bg-white border border-[#D5E3D1] rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#1B5E57] mb-4 flex items-center gap-2">
              <Plus size={18} /> New Goal
            </h2>
            <GoalCreationForm onSave={handleSaveGoal} />
          </div>
        )}

        {/* Render Goal Cards */}
        {goals.map((goal) => {
          const isExpanded = expandedGoalId === goal.id;

          return (
            <div key={goal.id} className="bg-white border-2 border-[#1B5E57] rounded-xl p-6 shadow-md transition-all">
              <div
                className="flex justify-between items-start cursor-pointer"
                onClick={() => toggleExpand(goal.id)}
              >
                <div>
                  <h2 className="text-xl font-bold text-[#1B5E57] flex items-center gap-2">
                    🎯 {goal.title}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    <strong className="text-[#9AAE8C]">{goal.category}</strong> | Target: {goal.target} {goal.unit} | Frequency: {goal.frequency}
                  </p>
                  <p className="text-sm text-[#3E3E3E] mt-1 flex items-center gap-1">
                    <CheckCircle size={14} className="text-[#B8CDBA]" />
                    This is your top-level goal card. Expand to manage habits and track progress.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="text-xs text-red-500 hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteGoal(goal.id);
                    }}
                  >
                    Delete
                  </button>
                  {isExpanded ? (
                    <ChevronUp className="text-[#9AAE8C]" />
                  ) : (
                    <ChevronDown className="text-[#9AAE8C]" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="mt-6 space-y-6 border-t pt-6 border-dashed border-[#D5E3D1]">
                  {/* Habit List */}
                  <div>
                    <h4 className="text-sm font-medium text-[#3E3E3E] mb-1">Linked Habits</h4>
                    <HabitList userId={user.uid} goalId={goal.id} />
                  </div>

                  {/* AI Suggestions */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles size={18} className="text-yellow-500" />
                      <h3 className="text-sm font-semibold text-[#1B5E57]">
                        AI-Recommended Habits
                      </h3>
                    </div>
                    <AIBasedSuggestions goal={goal} userId={user.uid} />
                  </div>

                  {/* Add Habit Form */}
                  <AddHabitForm userId={user.uid} goalId={goal.id} compact />

                  {/* Calendar View */}
                  <div>
                    <div className="flex items-center gap-2 mt-4 mb-2">
                      <CalendarDays size={18} className="text-[#E4BFA1]" />
                      <h4 className="text-sm font-semibold text-[#1B5E57]">
                        Habit Calendar
                      </h4>
                    </div>
                    <CalendarView userId={user.uid} goalId={goal.id} />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Global Calendar */}
        <GlobalHabitCalendar />
      </div>
    </SidebarLayout>
  );
}







