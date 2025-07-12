// src/components/habits/AddHabitForm.jsx

import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';

export default function AddHabitForm({ onHabitAdded }) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [type, setType] = useState('build');
  const [frequency, setFrequency] = useState('daily');
  const [trigger, setTrigger] = useState('');
  const [reward, setReward] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddHabit = async (e) => {
    e.preventDefault();
    if (!user || !title.trim()) return;

    try {
      setLoading(true);
      await addDoc(collection(db, 'habits'), {
        userId: user.uid,
        title: title.trim(),
        type,
        frequency,
        trigger: trigger.trim() || null,
        reward: reward.trim() || null,
        active: true,
        createdAt: serverTimestamp(),
        streak: 0,
        completions: [],
      });

      setTitle('');
      setTrigger('');
      setReward('');
      if (onHabitAdded) onHabitAdded();
    } catch (err) {
      console.error('Error adding habit:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleAddHabit} className="space-y-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <h2 className="text-xl font-semibold text-gray-800">Add a New Habit</h2>

      <div>
        <label className="block text-sm font-medium text-gray-600">Habit Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full border rounded-lg p-2"
          placeholder="Drink more water"
        />
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-600">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="mt-1 w-full border rounded-lg p-2">
            <option value="build">Build</option>
            <option value="maintain">Maintain</option>
            <option value="replace">Replace</option>
          </select>
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-600">Frequency</label>
          <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="mt-1 w-full border rounded-lg p-2">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600">Trigger (optional)</label>
        <input
          type="text"
          value={trigger}
          onChange={(e) => setTrigger(e.target.value)}
          className="mt-1 w-full border rounded-lg p-2"
          placeholder="After breakfast"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600">Reward (optional)</label>
        <input
          type="text"
          value={reward}
          onChange={(e) => setReward(e.target.value)}
          className="mt-1 w-full border rounded-lg p-2"
          placeholder="More energy"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="bg-[#1B5E57] text-white px-4 py-2 rounded-lg hover:bg-[#164e48] transition"
      >
        {loading ? 'Adding...' : 'Add Habit'}
      </button>
    </form>
  );
}
