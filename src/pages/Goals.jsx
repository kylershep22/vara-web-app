// src/pages/Goals.jsx

import React, { useState, useEffect } from 'react';
import { Plus, Target, X, Pencil, Trash2, CheckCircle, CalendarDays } from 'lucide-react';
import { db } from '../firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import SidebarLayout from '../components/layout/SidebarLayout';
import GoalCalendar from '../components/goals/GoalCalendar';

export default function Goals() {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editGoalId, setEditGoalId] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Mental & Emotional Wellness');
  const [target, setTarget] = useState('');
  const [unit, setUnit] = useState('minutes');
  const [frequency, setFrequency] = useState('Daily');
  const [dueDate, setDueDate] = useState('');
  const [goals, setGoals] = useState([]);

  useEffect(() => {
    if (user) fetchGoals();
  }, [user]);

  const fetchGoals = async () => {
    const q = query(collection(db, 'goals'), where('userId', '==', user.uid));
    const snapshot = await getDocs(q);
    const goalData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setGoals(goalData);
  };

  const resetForm = () => {
    setTitle('');
    setTarget('');
    setUnit('minutes');
    setCategory('Mental & Emotional Wellness');
    setFrequency('Daily');
    setDueDate('');
    setEditGoalId(null);
  };

  const handleAddOrEditGoal = async (e) => {
    e.preventDefault();
    if (!title || !target) return;

    const formattedDueDate = dueDate ? Timestamp.fromDate(new Date(dueDate)) : null;

    if (editGoalId) {
      const ref = doc(db, 'goals', editGoalId);
      await updateDoc(ref, {
        title,
        category,
        target: parseInt(target),
        unit,
        frequency,
        dueDate: formattedDueDate
      });
    } else {
      await addDoc(collection(db, 'goals'), {
        userId: user.uid,
        title,
        category,
        target: parseInt(target),
        unit,
        frequency,
        progress: 0,
        dueDate: formattedDueDate,
        createdAt: serverTimestamp()
      });
    }

    setShowModal(false);
    resetForm();
    fetchGoals();
  };

  const handleDeleteGoal = async (id) => {
    if (window.confirm('Delete this goal?')) {
      await deleteDoc(doc(db, 'goals', id));
      fetchGoals();
    }
  };

  const handleLogProgress = async (id, currentProgress, increment = 1) => {
    const ref = doc(db, 'goals', id);
    await updateDoc(ref, {
      progress: currentProgress + increment
    });
    fetchGoals();
  };

  const openEdit = (goal) => {
    setEditGoalId(goal.id);
    setTitle(goal.title);
    setCategory(goal.category);
    setTarget(goal.target);
    setUnit(goal.unit);
    setFrequency(goal.frequency);
    setDueDate(goal.dueDate?.toDate().toISOString().split('T')[0] || '');
    setShowModal(true);
  };

  return (
    <SidebarLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-semibold text-[#3E3E3E] flex items-center gap-2">
              <Target size={28} className="text-[#1B5E57]" />
              Your Goals
            </h1>
            <p className="text-[#9AAE8C] text-sm">Track, add, update, or remove your goals anytime.</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#1B5E57] to-[#B8CDBA] text-white font-medium shadow hover:scale-105 transition-transform"
          >
            <Plus size={18} />
            Add Goal
          </button>
        </div>

        {/* Goals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map(goal => (
            <div key={goal.id} className="bg-white/80 border border-[#D5E3D1] rounded-2xl p-5 shadow-sm relative">
              <div className="absolute top-3 right-3 flex gap-2">
                <button onClick={() => openEdit(goal)} className="text-[#9AAE8C] hover:text-[#1B5E57]">
                  <Pencil size={16} />
                </button>
                <button onClick={() => handleDeleteGoal(goal.id)} className="text-[#E57373] hover:text-red-700">
                  <Trash2 size={16} />
                </button>
              </div>
              <h3 className="text-lg font-semibold text-[#3E3E3E]">{goal.title}</h3>
              <p className="text-sm text-[#9AAE8C]">Target: {goal.target} {goal.unit}</p>
              <div className="mt-4 h-2 w-full bg-[#D5E3D1] rounded-full">
                <div
                  className="h-full bg-gradient-to-r from-[#1B5E57] to-[#B8CDBA] rounded-full"
                  style={{ width: `${Math.min((goal.progress / goal.target) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-right text-[#9AAE8C] mt-1">
                {Math.round((goal.progress / goal.target) * 100)}% complete
              </p>
              <button
                onClick={() => handleLogProgress(goal.id, goal.progress)}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2 bg-[#D5E3D1] text-[#1B5E57] rounded-lg text-sm font-medium hover:bg-[#B8CDBA] transition"
              >
                <CheckCircle size={16} /> Log Progress
              </button>
            </div>
          ))}
        </div>

        {/* Goal Calendar */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-4 text-[#1B5E57] flex items-center gap-2">
            <CalendarDays size={20} /> Goal Calendar
          </h2>
          <GoalCalendar />
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
              onClick={() => setShowModal(false)}
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-semibold text-[#3E3E3E] mb-4">
              {editGoalId ? 'Edit Goal' : 'Add New Goal'}
            </h2>
            <form onSubmit={handleAddOrEditGoal} className="space-y-4">
              <input
                type="text"
                placeholder="Goal Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-[#D5E3D1] rounded-lg px-4 py-2"
                required
              />
              <input
                type="number"
                placeholder="Target Value"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full border border-[#D5E3D1] rounded-lg px-4 py-2"
                required
              />
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full border border-[#D5E3D1] rounded-lg px-4 py-2"
              >
                <option value="minutes">minutes</option>
                <option value="days">days</option>
                <option value="hours">hours</option>
              </select>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-[#D5E3D1] rounded-lg px-4 py-2"
              >
                <option>Mental & Emotional Wellness</option>
                <option>Physical Health & Fitness</option>
                <option>Sleep & Recovery</option>
                <option>Lifestyle & Growth</option>
              </select>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full border border-[#D5E3D1] rounded-lg px-4 py-2"
              >
                <option>Daily</option>
                <option>Weekly</option>
                <option>Ongoing</option>
              </select>

              {/* 🗓 Due Date Picker */}
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full border border-[#D5E3D1] rounded-lg px-4 py-2"
              />

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-[#1B5E57] to-[#B8CDBA] text-white py-2 rounded-lg font-semibold hover:scale-105 transition"
              >
                {editGoalId ? 'Update Goal' : 'Save Goal'}
              </button>
            </form>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}






