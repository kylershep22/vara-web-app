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
        <div className="flex items-center justify-between p-6 border-b border-divider">
          <h2 className="text-xl font-bold text-soft-charcoal">Update Progress</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dew-sage-light rounded-lg transition-colors"
          >
            <X size={20} className="text-muted-sage-gray" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Goal Title */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-soft-charcoal mb-1">{goal.title}</h3>
            <p className="text-sm text-muted-sage-gray">
              Target: {target} {goal.unit || 'units'}
            </p>
          </div>

          {/* Progress Section */}
          <div className="bg-gradient-to-r from-teal-light to-blue-50 rounded-lg p-5 border border-silver-sage">
            <label className="block text-sm font-medium text-soft-charcoal mb-3 text-center">
              Update Progress
            </label>

            {/* Progress Controls */}
            <div className="flex items-center gap-2 mb-4">
              <button
                type="button"
                onClick={() => handleProgressChange(-1)}
                className="flex-shrink-0 p-2 bg-white border border-divider rounded-lg hover:bg-dew-sage-light transition-colors"
              >
                <Minus size={18} className="text-muted-sage-gray" />
              </button>

              <input
                type="number"
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value) || 0)}
                className="flex-1 min-w-0 px-3 py-2 border border-divider rounded-lg focus:ring-2 focus:ring-evergreen-teal focus:border-evergreen-teal outline-none text-center font-bold text-xl"
                min="0"
                max={target}
              />

              <button
                type="button"
                onClick={() => handleProgressChange(1)}
                className="flex-shrink-0 p-2 bg-white border border-divider rounded-lg hover:bg-dew-sage-light transition-colors"
              >
                <Plus size={18} className="text-muted-sage-gray" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-sage-gray">Progress</span>
                <span className="font-bold text-evergreen-teal text-lg">{progressPercent}%</span>
              </div>
              <div className="h-4 bg-silver-sage/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-evergreen-teal to-silver-sage transition-all duration-300"
                  style={{ width: `${Math.min(progressPercent, 100)}%` }}
                />
              </div>
            </div>

            <p className="text-sm text-muted-sage-gray text-center font-medium">
              {progress} / {target} {goal.unit || 'completed'}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-divider rounded-lg text-soft-charcoal font-medium hover:bg-dew-sage-light transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-evergreen-teal text-white rounded-lg font-medium hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
