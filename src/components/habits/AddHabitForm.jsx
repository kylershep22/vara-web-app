// src/components/habits/AddHabitForm.jsx

import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { getAllHabitCategories, getNeurochemicalTags, getBrainPillars } from '../../constants/brainHealthMapping';
import { NeurochemicalTagList, BrainPillarBadgeList } from '../shared/BrainPillarBadge';

export default function AddHabitForm({ goalId, onHabitAdded, onSuccess, userId: externalUserId }) {
  const { user: authUser } = useAuth();
  const userId = externalUserId || authUser?.uid;

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('build');
  const [frequency, setFrequency] = useState('daily');
  const [trigger, setTrigger] = useState('');
  const [reward, setReward] = useState('');
  const [loading, setLoading] = useState(false);

  // Get brain health info when category is selected
  const neurochemicalTags = category ? getNeurochemicalTags(category) : [];
  const brainPillars = category ? getBrainPillars(category) : [];
  const availableCategories = getAllHabitCategories();

  const handleAddHabit = async (e) => {
    e.preventDefault();
    if (!userId || !title.trim()) return;

    try {
      setLoading(true);

      const newHabit = {
        userId,
        title: title.trim(),
        category: category || null,
        type,
        frequency,
        trigger: trigger.trim() || null,
        reward: reward.trim() || null,
        active: true,
        createdAt: serverTimestamp(),
        streak: 0,
        completions: [],
        ...(goalId ? { goalIds: [goalId] } : {}) // support linking to a goal if passed
      };

      const docRef = await addDoc(collection(db, 'habits'), newHabit);

      // Reset fields
      setTitle('');
      setCategory('');
      setTrigger('');
      setReward('');

      // Callbacks
      if (onHabitAdded) onHabitAdded();
      if (onSuccess) onSuccess(docRef.id); // ✅ Enables modal behavior
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
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600">Category (Brain Health)</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="mt-1 w-full border rounded-lg p-2"
        >
          <option value="">Select a category...</option>
          {availableCategories.map(cat => (
            <option key={cat} value={cat}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">Choose a category to see brain health impacts</p>
      </div>

      {/* Brain Health Preview */}
      {category && (neurochemicalTags.length > 0 || brainPillars.length > 0) && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-blue-900">Brain Health Impact</h3>
          {neurochemicalTags.length > 0 && (
            <div>
              <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">Neurochemical Effects</span>
              <div className="mt-2">
                <NeurochemicalTagList impacts={neurochemicalTags} size="small" />
              </div>
            </div>
          )}
          {brainPillars.length > 0 && (
            <div>
              <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">Supports Brain Pillars</span>
              <div className="mt-2">
                <BrainPillarBadgeList pillars={brainPillars} size="small" />
              </div>
            </div>
          )}
        </div>
      )}

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

