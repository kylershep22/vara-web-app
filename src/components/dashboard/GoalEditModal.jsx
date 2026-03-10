// src/components/dashboard/GoalEditModal.jsx

import React, { useState } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

const GoalEditModal = ({ goal, onClose, onSave }) => {
  const currentProgress = goal.progress || 0;
  const target = goal.target || 100;

  const [formData, setFormData] = useState({
    title: goal.title || '',
    progress: currentProgress,
    target: target,
    unit: goal.unit || ''
  });
  const [saving, setSaving] = useState(false);

  const handleProgressChange = (amount) => {
    const newProgress = Math.max(0, Math.min(formData.target, formData.progress + amount));
    setFormData({ ...formData, progress: newProgress });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await updateDoc(doc(db, 'goals', goal.id), {
        title: formData.title,
        progress: formData.progress,
        target: formData.target,
        unit: formData.unit,
        updatedAt: serverTimestamp()
      });

      if (onSave) onSave();
      onClose();
    } catch (error) {
      console.error('Error updating goal:', error);
      alert('Failed to update goal. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const progressPercent = Math.round((formData.progress / formData.target) * 100);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-divider">
          <h2 className="text-xl font-bold text-soft-charcoal">Edit Goal</h2>
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
          <div>
            <label className="block text-sm font-medium text-soft-charcoal mb-2">
              Goal Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-divider rounded-lg focus:ring-2 focus:ring-evergreen-teal focus:border-evergreen-teal outline-none"
              required
            />
          </div>

          {/* Progress Section */}
          <div className="bg-gradient-to-r from-teal-light to-blue-50 rounded-lg p-4 border border-silver-sage">
            <label className="block text-sm font-medium text-soft-charcoal mb-3">
              Update Progress
            </label>

            {/* Progress Controls */}
            <div className="flex items-center gap-3 mb-3">
              <button
                type="button"
                onClick={() => handleProgressChange(-1)}
                className="p-2 bg-white border border-divider rounded-lg hover:bg-dew-sage-light transition-colors"
              >
                <Minus size={20} className="text-muted-sage-gray" />
              </button>

              <input
                type="number"
                value={formData.progress}
                onChange={(e) => setFormData({ ...formData, progress: Number(e.target.value) || 0 })}
                className="flex-1 px-4 py-2 border border-divider rounded-lg focus:ring-2 focus:ring-evergreen-teal focus:border-evergreen-teal outline-none text-center font-bold text-lg"
                min="0"
                max={formData.target}
              />

              <button
                type="button"
                onClick={() => handleProgressChange(1)}
                className="p-2 bg-white border border-divider rounded-lg hover:bg-dew-sage-light transition-colors"
              >
                <Plus size={20} className="text-muted-sage-gray" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="mb-2">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-sage-gray">Progress</span>
                <span className="font-bold text-evergreen-teal">{progressPercent}%</span>
              </div>
              <div className="h-3 bg-silver-sage/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-evergreen-teal to-silver-sage transition-all duration-300"
                  style={{ width: `${Math.min(progressPercent, 100)}%` }}
                />
              </div>
            </div>

            <p className="text-sm text-muted-sage-gray text-center">
              {formData.progress} / {formData.target} {formData.unit}
            </p>
          </div>

          {/* Target */}
          <div>
            <label className="block text-sm font-medium text-soft-charcoal mb-2">
              Target
            </label>
            <input
              type="number"
              value={formData.target}
              onChange={(e) => setFormData({ ...formData, target: Number(e.target.value) || 0 })}
              className="w-full px-4 py-2 border border-divider rounded-lg focus:ring-2 focus:ring-evergreen-teal focus:border-evergreen-teal outline-none"
              required
              min="1"
            />
          </div>

          {/* Unit */}
          <div>
            <label className="block text-sm font-medium text-soft-charcoal mb-2">
              Unit (optional)
            </label>
            <input
              type="text"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              placeholder="e.g., workouts, books, hours"
              className="w-full px-4 py-2 border border-divider rounded-lg focus:ring-2 focus:ring-evergreen-teal focus:border-evergreen-teal outline-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-divider rounded-lg text-soft-charcoal font-medium hover:bg-dew-sage-light transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !formData.title.trim()}
              className="flex-1 px-4 py-2 bg-evergreen-teal text-white rounded-lg font-medium hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GoalEditModal;
