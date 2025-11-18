// src/components/dashboard/GoalProgressModal.jsx

import React, { useState } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

const GoalProgressModal = ({ goal, onClose, onSave }) => {
  const currentProgress = goal.progress || 0;
  const target = goal.target || 100;

  const [progress, setProgress] = useState(currentProgress);
  const [saving, setSaving] = useState(false);

  const handleProgressChange = (amount) => {
    const newProgress = Math.max(0, Math.min(target, progress + amount));
    setProgress(newProgress);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await updateDoc(doc(db, 'goals', goal.id), {
        progress: progress,
        updatedAt: serverTimestamp()
      });

      if (onSave) onSave();
      onClose();
    } catch (error) {
      console.error('Error updating goal progress:', error);
      alert('Failed to update progress. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const progressPercent = Math.round((progress / target) * 100);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Update Progress</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Goal Title */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{goal.title}</h3>
            <p className="text-sm text-gray-500">
              Target: {target} {goal.unit || 'units'}
            </p>
          </div>

          {/* Progress Section */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-5 border border-green-200">
            <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
              Update Progress
            </label>

            {/* Progress Controls */}
            <div className="flex items-center gap-2 mb-4">
              <button
                type="button"
                onClick={() => handleProgressChange(-1)}
                className="flex-shrink-0 p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Minus size={18} className="text-gray-600" />
              </button>

              <input
                type="number"
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value) || 0)}
                className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B5E57] focus:border-[#1B5E57] outline-none text-center font-bold text-xl"
                min="0"
                max={target}
              />

              <button
                type="button"
                onClick={() => handleProgressChange(1)}
                className="flex-shrink-0 p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Plus size={18} className="text-gray-600" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Progress</span>
                <span className="font-bold text-[#1B5E57] text-lg">{progressPercent}%</span>
              </div>
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#1B5E57] to-[#B8CDBA] transition-all duration-300"
                  style={{ width: `${Math.min(progressPercent, 100)}%` }}
                />
              </div>
            </div>

            <p className="text-sm text-gray-600 text-center font-medium">
              {progress} / {target} {goal.unit || 'completed'}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-[#1B5E57] text-white rounded-lg font-medium hover:bg-[#164e48] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Progress'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GoalProgressModal;
