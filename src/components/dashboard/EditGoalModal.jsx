import React, { useState } from 'react';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';

export default function EditGoalModal({ goal, onClose, onSave }) {
  const [formData, setFormData] = useState({
    goal: goal.goal,
    primaryFocus: goal.primaryFocus,
    refinedFocus: goal.refinedFocus,
    timeframe: goal.timeframe,
    targetDate: goal.targetDate || '',
  });

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const goalRef = doc(db, 'users', goal.uid, 'goals', goal.id);
    await updateDoc(goalRef, formData);
    onSave(goal.id, formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4 text-[#1B5E57]">Edit Goal</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            name="goal"
            value={formData.goal}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded"
            placeholder="Your goal"
            required
          />
          <input
            type="text"
            name="primaryFocus"
            value={formData.primaryFocus}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded"
            placeholder="Primary focus"
            required
          />
          <input
            type="text"
            name="refinedFocus"
            value={formData.refinedFocus}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded"
            placeholder="Refined focus"
          />
          <input
            type="text"
            name="timeframe"
            value={formData.timeframe}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded"
            placeholder="Timeframe"
          />
          <input
            type="date"
            name="targetDate"
            value={formData.targetDate}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded"
          />
          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#1B5E57] text-white rounded"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
