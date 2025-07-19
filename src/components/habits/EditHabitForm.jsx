import React, { useState } from 'react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export default function EditHabitForm({ habit, onCancel, onSave }) {
  const [title, setTitle] = useState(habit.title);
  const [type, setType] = useState(habit.type);
  const [frequency, setFrequency] = useState(habit.frequency);
  const [trigger, setTrigger] = useState(habit.trigger || '');
  const [reward, setReward] = useState(habit.reward || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const habitRef = doc(db, 'habits', habit.id);
      await updateDoc(habitRef, {
        title: title.trim(),
        type,
        frequency,
        trigger: trigger.trim(),
        reward: reward.trim(),
      });
      if (onSave) onSave();
    } catch (err) {
      console.error('Error updating habit:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this habit?')) return;
    try {
      await deleteDoc(doc(db, 'habits', habit.id));
      if (onSave) onSave();
    } catch (err) {
      console.error('Error deleting habit:', err);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-600">Habit Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full border rounded-lg p-2"
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
        <label className="block text-sm font-medium text-gray-600">Trigger</label>
        <input
          type="text"
          value={trigger}
          onChange={(e) => setTrigger(e.target.value)}
          className="mt-1 w-full border rounded-lg p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600">Reward</label>
        <input
          type="text"
          value={reward}
          onChange={(e) => setReward(e.target.value)}
          className="mt-1 w-full border rounded-lg p-2"
        />
      </div>

      <div className="flex justify-between items-center gap-4">
        <button
          type="button"
          onClick={handleDelete}
          className="text-sm text-red-600 hover:underline"
        >
          Delete Habit
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-[#1B5E57] text-white rounded-lg hover:bg-[#144d47]"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </form>
  );
}


